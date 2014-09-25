define([
    'jquery',
    'underscore',
    'backbone',
    'globalize/globalize',
    './util'
], function($, _, Backbone, Globalize, Util) {
    'use strict';

    
    var Traits = {};


    // =========
    // = Utils =
    // =========
    var parsedatetime = function(v) {
        if(v === null)
            return null;
        if(!_.isString(v) && !_.isDate(v))
            throw new TypeError();        
        var timestamp = Util.interpretdate(v);
        if(!timestamp)
            throw new Traits.ValueError('Invalid date format');
        return timestamp;
    };


    
    function ErrorBase(message) {
        this.message = message;
    }
    ErrorBase.prototype.toString = function(config) { 
        return this.name + ': ' + this.message;
    };
    ErrorBase.extend = Util.extend;
    
    Traits.ValueError = ErrorBase.extend('Traits.ValueError', {name: 'ValueError'});


    Traits.Model = Backbone.Model.extend({
        /*
        Extension of Backbone.Model adding support for typed attributes and 
        serialization.
        
        >>> var Thing = Traits.Model.extend({
        >>>     traits: {
        >>>         'start_at': new traits.DateTime()
        >>>     }
        >>> })
        >>> thing = new Thing();
        >>> thing.set('start_at', '2001-01-01')
        >>> thing.get('start_at')
        Thu Feb 01 2001 00:00:00 GMT+0100 (CET)
        
        "traits" can also be a function returning a dict of traits.

        >>> var Thing = Traits.Model.extend({
        >>>     traits: function() {
        >>>         return {'start_at': new traits.DateTime()};
        >>>     }
        >>> })
        
        It also adds support for declaring setter functions using a special 
        syntax: "set_mypropertyname".

        >>> var Thing = Traits.Model.extend({
        >>>     set_score: function(value, attrs, options, key) {
        >>>         attrs[key] = score * 2;
        >>>     }
        >>> })
        >>> thing = new Thing({score: 5});
        >>> thing.get('score')
        10        
        */
        initcls: function() {
            var proto = this.prototype, 
                constr = this;
            if(_.isFunction(proto.traits))
                proto.traits = proto.traits.call(proto);


            // Make all get_*/set_* properties
            var properties = {};
            _.each(proto, function(v, k)  {
                var prefix = k.slice(0,4), 
                    name = k.slice(4),
                    isSetOrGet = prefix == 'get_' || prefix == 'set_';
                    
                if(isSetOrGet && !properties[name])
                    properties[name] = {
                        configurable: true,
                        enumerable: true,
                        get: function() { return this.get(name); },
                        set: function(value) {
                            var data = {};
                            data[name] = value;
                            this.set(data);
                        }                        
                    };
                if(prefix == 'get_') 
                    properties[name].get = v;
            });
            
            // Make all traits properties
            _.each(proto.traits, function(trait, name) {
                trait.name = name;
                properties[name] = {
                    get: function() { return this.get(name); },
                    set: function(value) {
                        var data = {};
                        data[name] = value;
                        this.set(data);
                    },
                    configurable: true,
                    enumerable: true
                };
            });
            
            _.each(properties, function(v, name) {
                Object.defineProperty(proto, name, properties[name]);
            });
            

            
            _.each(Util.arrayify(proto.merge), function(propname) {
                var parentval = constr.__super__[propname] || {};
                proto[propname] = _.extend({}, parentval, _.result(proto, propname));
            });
        },
        get: function(name) {
            if(this['get_'+name])
                return this['get_'+name]();
            if(this.traits && this.traits[name] && this.traits[name].get)
                return this.traits[name].get(this, name)
            return this.attributes[name];
        },        
        set: function(key, value, options) {
            var attrs, attr, val, errors={}, rollbacks=[], success=[];
                
            if(_.isObject(key) || key === null) {
                attrs = key;
                options = value;
            } else {
                attrs = {};
                attrs[key] = value;
            }
            options = _.extend(options || {}, {validate: true})
            
            var attrslist = _(attrs).map(function(v,k) {return [k,v]});
            if(this.setorder) {
                var setorder = this.setorder;
                attrslist = _.sortBy(attrslist, function(tup) {
                    var index = setorder.indexOf(tup[0]);
                    return index === -1 ? attrs.length : index;
                });
            }
                        
            _.each(attrslist, function(tup) {
                var key = tup[0], value = tup[1], t,
                    args = [value, attrs, options, key, errors, this];
                try {                    
                    if(typeof this['set_' + key] === 'function') {
                        this['set_' + key].apply(this, args);
                    }
                    else if(this.traits && this.traits[key]) {
                        // Run the value though the trait's parse
                        t = this.traits[key];
                        args.splice(0, 1, t.parse(value, this, attrs, key))
                        if(t.rollback)
                            rollbacks.push(t.rollback.bind.apply(t.rollback, [t].concat(args)));                                
                        if(t.success)
                            success.push(t.success.bind.apply(t.success, [t].concat(args)));

                        if(t.set)
                            t.set.apply(t, args);
                        else
                            attrs[key] = args[0];
                    }
                }
                catch(e) {
                    if(this.catchErrors && (e.name == 'TypeError' || e.name == 'ValueError')) {
                        errors[key] = e;
                    }
                    else throw e;
                }                    
            }, this);
            
            if(_.isEmpty(errors)) {
                this.validationError = null;
                Backbone.Model.prototype.set.call(this, attrs, options);
                if(!_.isEmpty(success))
                    _.each(success, function(f) { f(); });                
                if(this.success)
                    this.success(attrs, options);
                return this;
            }
            else if(!_.isEmpty(rollbacks)) {
                _.each(rollbacks, function(f) { f(); });

                if(this.rollback)
                    this.rollback(attrs, options);                
            }
            
            this.validationError = errors;
            options.validationError = errors;
            this.trigger('invalid', this, errors, options);
        },
        toJSON: function() {
            var traits = this.traits, attrs = this.attributes;
            if(_.isEmpty(traits)) 
                return _.clone(attrs)
            return _.object(_.map(this.attributes, function(v, k) {
                return [k, traits[k] ? traits[k].toJSON(attrs[k]) : attrs[k]]
            }));            
        },
    });
    Traits.Model.extend = Util.extend;



    /*    
    Power constructors
    ------------------
    Source: http://stackoverflow.com/questions/1889014
    
    
    var object = (function() {
         function F() {}
         return function(o) {
             F.prototype = o;
             return new F();
         };
    })();

    function a(proto) {
      var p = object(proto || a.prototype);
      return p;
    }

    function b(proto) {
      var g = object(a(proto || b.prototype));
      return g;
    }
    b.prototype = object(a.prototype);
    b.__proto__ = a.prototype;

    var c = b();
    c instanceof b // -> true
    c instanceof a // -> true
    b instanceof a // -> true
    a() instanceof a // -> true
    
    */

    var Trait = function(config) {
        if(!(this instanceof Trait)) 
            return new Traits.Trait(config);        
        this.initialize.call(this, config); 
    };
    _.extend(Trait.prototype, Backbone.Events, {
        constructor: function(config) {
            if (this instanceof Trait) this.initialize.apply(this, arguments); else return new Traits.Trait(config);
        },        
        initialize: function() {},
        toString: function() {
            return 'Traits.'+this.constructor.name+'(name='+Util.repr(this.name)+')';
        },
        parse: function(v) {
            return v;
        },
        toJSON: function(v) {
            return v;
        }
    });
    Trait.extend = Util.extend;
    Traits.Trait = Trait;

    
    Traits.String = Trait.extend('Traits.String', {
        constructor: function(config) {
            if (this instanceof Trait) this.initialize.apply(this, arguments); else return new Traits.String(config);
        },
        parse: function(v) {
            if(v != null)
                return String(v);
            return null;
        },
        toJSON: function(v) {
            return v;
        }
    });


    Traits.Bool = Trait.extend('Traits.Bool', {
        constructor: function(config) {
            if (this instanceof Trait) this.initialize.apply(this, arguments); else return new Traits.Bool(config);
        },        
        parse: function(v) {
            return !!v;
        },
        toJSON: function(v) {
            return v;
        }
    });
    
    
    Traits.Float = Trait.extend('Traits.Float', {
        constructor: function(config) {
            if (this instanceof Trait) this.initialize.apply(this, arguments); else return new Traits.Float(config);
        },        
        parse: function(v) {
            if(v == null || v === '') 
                return null;
            if(_.isString(v))
                v = Globalize.parseFloat(v); // returns NaN on fail.
            else
                v = parseFloat(v)  
            if(_.isNaN(v)) 
                throw new TypeError();
            return v;
        },
        toJSON: function(v) {
            return v;
        }
    });    
    Traits.Number = Traits.Float; // Legacy


    Traits.Int = Trait.extend('Traits.Int', {
        constructor: function(config) {
            if (this instanceof Trait) this.initialize.apply(this, arguments); else return new Traits.Int(config);
        },        
        parse: function(v) {
            if(v == null || v === '') 
                return null;
            if(_.isString(v))
                v = Globalize.parseInt(v); // returns NaN on fail.
            else
                v = parseInt(v);
            if(_.isNaN(v)) 
                throw new TypeError();
            return v;
        },
        toJSON: function(v) {
            return v;
        }
    });    
    

    
    Traits.Date = Trait.extend('Traits.Date', {
        constructor: function(config) {
            if (this instanceof Trait) this.initialize.apply(this, arguments); else return new Traits.Date(config);
        },
        parse: function(v) {
            if(v === null)
                return null;
            var v = parsedatetime(v);
            // strip time
            return new Date(v.getFullYear(), v.getMonth(), v.getDate());
        },
        toJSON: function(v) {
            /* Return eg 2012-03-22 */
            return Util.dateToYMD(v);
        }
    });


    Traits.DateTime = Trait.extend('Traits.DateTime', {
        /* Timezone-aware timestamp.
        self.toJSON(value) returns the value as UTC time, 
        eg "2014-02-11T15:10:42.021Z"
        */
        constructor: function(config) {
            if (this instanceof Trait) this.initialize.apply(this, arguments); else return new Traits.DateTime(config);
        },        
        parse: function(v) {
            if(v === null)
                return null;
            return parsedatetime(v);
        },
        toJSON: function(v) {
            // UTC datetime string, eg "2014-02-11T15:10:42.021Z"
            return v.toISOString();
        }
    });
    
    Traits.Instance = Trait.extend('Traits.Instance', {
        constructor: function(config) {
            if (this instanceof Trait) this.initialize.apply(this, arguments); else return new Traits.Instance(config);
        },
        initialize: function(type) {
            this.type = type;
        },
        parse: function(v) {
            var type = this.type;
            if(_.isFunction(type) && !type.extend) { // ducktyping Model
                type = type();
            }
            if(v instanceof type)
                return v;
            return new type(v, {parse: true});
        },
        toJSON: function(v) {
            if(v)
                return v.toJSON();
        }
    });
    
    
    
    /*
    var Thing = Model.extend({
        traits: {
            title: t.String(),
            columns: t.Collection(MySpecialCollection)
        }
    });
    
    var th = new Thing({
        title: 'Foo',
        columns: [{id: '1', name: 'sune'}]
    })
    
    vat trait = new t.Collection();    
    >>> trait.parse([{id: '1', name: 'sune'}])
    <MySpecialCollection length=1>
    
    >>> trait.parse([{id: '1', name: 'sune'}])
    <MySpecialCollection length=1>

    >>> trait.parse(new Backbone.Collection([{id: '1', name: 'sune'}])
    // throws ValueError - must be a MySpecialCollection.
    
    >>> var coll = new MySpecialCollection([{id: '1', name: 'sune'}];
    >>> trait.parse(coll) === coll
    true
    */    
    Traits.Collection = Trait.extend('Traits.Collection', {

        constructor: function(config, options) {
            if (this instanceof Trait) this.initialize.apply(this, arguments); else return new Traits.Collection(config, options);
        },
        initialize: function(config, options) {
            config = config || {};
            this.Collection = Backbone.Collection;
            this.options = options;

            if(_.isFunction(config))
                this.Collection = config;                
        },
        parse: function(v, obj, attrs, key) {            
            // Convert eg 'foo' => [{id: 'foo'}]
            var Collection = this.Collection;
            if(_.isFunction(this.Collection) && !this.Collection.extend) {
                // it's a callable, assumed to return a collection class
                Collection = this.Collection();
            }
            if(!v || (_.isFunction(v) && v instanceof Collection)) {
                return v;
            }
                
            if(v instanceof Backbone.Collection) {
                v = v.models;
                if(Collection)
                    v = _.map(v, function(o) { return o.attributes; })
            }
            else if(v)
                v = _.map(Util.arrayify(v), function(o) {
                    if(_.isString(o))
                        return {id: o};
                    return o;
                }, this);
                
            if(v) {
                return new Collection(v, this.options);
            }
        },
        toJSON: function(v, obj) {
            // 'v' is a Collection
            if(v && v.each)
                return v.map(function(item) {
                    return item.toJSON();
                });
        }
    });
    
    
    Traits.CollectionM = Traits.Collection.extend('Traits.CollectionM', {
        constructor: function(config, options) {
            if (this instanceof Trait) this.initialize.apply(this, arguments); else return new Traits.CollectionM(config, options);
        },
        initialize: function(config, options) {
            config = config || {};
            this.Collection = Backbone.Collection;
            this.options = options;

            if(Util.isModelSubclass(config))
                this.Collection = Util.Collection.extend('ImplicitCollection', {model: config})
            else if(_.isFunction(config))
                this.Collection = config;                
        },        
        parse: function(v, obj, attrs, key) {            
            // Convert eg 'foo' => [{id: 'foo'}]
            var Collection = this.Collection;
            if(_.isFunction(this.Collection) && !this.Collection.extend) {
                // it's a callable, assumed to return a collection class
                Collection = this.Collection();
            }
            if(!v || (_.isFunction(v) && v instanceof Collection)) {
                return v;
            }
                
            if(v instanceof Backbone.Collection) {
                return v;
            }
            else if(v)
                v = _.map(Util.arrayify(v), function(o) {
                    if(_.isString(o))
                        return {id: o};
                    return o;
                }, this);

            return v;
        },        
        set: function(value, attrs, options, key, errors, obj) {
            if(obj.attributes[key]) {
                // backup the original set of models
                obj['_tmp_'+key] = obj.attributes[key].models;
                // 
                var value = this.parse(value || []), // CollectionM.parse can return a Collection or an array of models.
                    models = value.models || value;  // duck-type a collection
                    
                obj.attributes[key].reset(models, {silent:true});
                delete attrs[key];
            }
            else {
                if(_.isArray(value)) {
                    // Todo: code duplication
                    var Collection = this.Collection;
                    if(_.isFunction(this.Collection) && !this.Collection.extend) {
                        // it's a callable, assumed to return a collection class
                        Collection = this.Collection();
                    }                    
                    value = new Collection(value)
                }
                attrs[key] = value;
            }
        },
        rollback: function(value, attrs, options, key, errors, obj) {
            if(obj.attributes[key])
                obj.attributes[key].models = Util.pop(obj, '_tmp_'+key);
        },
        success: function(value, attrs, options, key, errors, obj) {
            if(obj.attributes[key]) {
                delete obj['_tmp_'+key];
                obj.attributes[key].trigger('reset');                
            }
        }
    });    
    
    
    Traits.Subset = Trait.extend('Traits.Subset', {
        constructor: function(config) {
            if (this instanceof Trait) this.initialize.apply(this, arguments); else return new Traits.Subset(config);
        },        
        initialize: function(config) {
            // 'source' is the name of a collection trait within this model
            //  or any Collection object.
            this.source = _.isString(config) ? config : config.source;
        },
        parse: function(v, obj, attrs, key) {
            if(v instanceof Util.Subset)
                return v;

            if(v)
                v = _.map(Util.arrayify(v), function(o) {
                    if(_.isString(o))
                        return {id: o};
                    return o;
                }); 
            
            
            var s = this.source;
            if(_.isString(s)) {         
                s = obj.get(s);
                if(!s) 
                    s = attrs[this.source];
            }                
            return new Util.Subset(v || [], {source: s});            
        },
        toJSON: function(v, obj) {
            // 'v' is a Collection
            return _.map(v.each(function(item) {
                return item.toJSON();
            }));
        }
    });


    Traits.CollectionModel = Trait.extend('Traits.CollectionModel', {
        constructor: function(config) {
            if (this instanceof Trait) this.initialize.apply(this, arguments); else return new Traits.CollectionModel(config);
        },
        initialize: function(config) {
            // 'source' is the name of a collection trait within this model
            //  or any Collection object.
            this.source = _.isString(config) ? config : config.source;
        },
        parse: function(v, obj, attrs, key) {
            /*
            Example:
            --------
            var Thing = Traits.Model.extend({
                traits: {
                    allColors: new t.Collection(),
                    favoriteColor: new t.CollectionModel({source: 'allColors'})
                }
            });
                    
            >>> var i = Traits.CollectionModel({source: 'colors'})
            >>> i.parse('red')
            <ColorModel color=red>
            >>> i.parse(colorRed) 
            <ColorModel color=red>       
            >>> i.parse('banana')        ValueError
            >>> i.parse(['banana'])      TypeError
            >>> i.parse(null)        
            null
            >>> i.parse(undefined)
            null            
            >>> i.parse('')              Todo: throw ValueError?
            null                         
            >>> i.parse({foo:'bar'})     ValueError
            >>> i.parse({id:'banana'})   ValueError('banana invalid value')!
            >>> i.parse({id:'red', foo: 'bar'})
            >>> i.parse({id:null, foo: 'bar'}) 
            <ColorModel color=red>
            */
            if(v == null || v === '') 
                return null;            
            if(v.id != null)
                v = v.id
            if(_.isNumber(v))
                v = String(v);
            if(!_.isString(v))
                throw new TypeError('Expected string or number, got '+v);
            if(!v && v !== 0) 
                throw new Traits.ValueError('No id')
            
            var s = this.source;
            if(_.isString(s)) {         
                s = obj.get(s);
                if(!s) 
                    s = attrs[this.source];
            }
            var model = s.get(v);
            if(!model)
                throw new Traits.ValueError(v + ' not in ' + this.source);
            return model;
        },
        toJSON: function(v, obj) {
            // 'v' is a model
            if(v)
                return v.toJSON();
        }        
    })

    
    return Traits;
});