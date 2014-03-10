define([
    'jquery',
    'underscore',
    'backbone',
    'globalize/globalize',
    './tools',
    './util'
], function($, _, Backbone, Globalize, Tools, Util) {
    'use strict';
    
    var Traits = {};

    Traits.Model = Backbone.Model.extend({
        /*
        Extension of Backbone.Model adding support for typed attributes and 
        serialization.
        
        >>> Thing = Backbone.Model.extend({
        >>>     mixins: [Traits],
        >>>     traits: {
        >>>         'start_at': new traits.DateTime()
        >>>     }
        >>> })
        >>> thing = new Thing();
        >>> thing.set('start_at', '2001-01-01')
        >>> thing.get('start_at')
        Thu Feb 01 2001 00:00:00 GMT+0100 (CET)
        
        "traits" can also be a function returning a dict of traits.

        >>> Thing = Backbone.Model.extend({
        >>>     mixins: [HasTraits],
        >>>     traits: function() {
        >>>         return {'start_at': new traits.DateTime()};
        >>>     }
        >>> })
        
        It also adds support for declaring setter functions using a special 
        syntax: "set_mypropertyname".

        >>> Thing = Backbone.Model.extend({
        >>>     set_score: function(value, attrs, options, key) {
        >>>         attrs[key] = score * 2;
        >>>     }
        >>> })
        >>> thing = new Thing({score: 5});
        >>> thing.get('score')
        10
        
        */
        // constructor: function(attributes, options) {
        //     console.log('IM HERE: ', this+'')
        //     var defaults;
        //     var attrs = attributes || {};
        //     options || (options = {});
        //     this.cid = _.uniqueId('c');
        //     this.attributes = {};
        //     _.extend(this, _.pick(options, modelOptions));
        //     if (options.parse) attrs = this.parse(attrs, options) || {};
        //     if (defaults = _.result(this, 'defaults')) {
        //         attrs = _.defaults({}, attrs, defaults);
        //     }
        //     console.log('NOW CALL set(...): ', this+'')    
        //     this.set(attrs, options);
        //     this.changed = {};
        //     this.initialize.apply(this, arguments);
        // },
        initcls: function() {
            var proto = this.prototype, 
                constr = this;
            if(_.isFunction(proto.traits))
                proto.traits = proto.traits.call(proto);
            _.each(proto.traits, function(trait, k) {
                trait.name = k;
            });
                        
            _.each(Util.arrayify(proto.merge), function(propname) {
                var parentval = constr.__super__[propname] || {};
                proto[propname] = _.extend({}, parentval, _.result(proto, propname));
            });
        },
        set: function(key, value, options) {
            var attrs, attr, val;
            if(_.isObject(key) || key === null) {
                attrs = key;
                options = value;
            } else {
                attrs = {};
                attrs[key] = value;
            }
            
            _.each(_.clone(attrs), function(value, key) {
                 var setter = 'set_' + key;                 
                 if(typeof this[setter] === 'function') {
                     this[setter](value, attrs, options, key);
                 }
                 else if(this.traits && this.traits[key]) {
                     attrs[key] = this.traits[key].parse(value, this, attrs, key);
                 }
            }, this);
            return Backbone.Model.prototype.set.call(this, attrs, options);
        },
        toJSON: function() {
            return _.object(_.map(this.traits, function(trait, key) {
                return [key, trait.toJSON(this.attributes[key], this)];
            }, this));
        }
    },{
        extend: Util.extend
    });




    var Trait = function() {
        if(this.initialize)
            this.initialize.apply(this, arguments);
    };
    _.extend(Trait.prototype, Backbone.Events, {
        initialize: function() {},
        toString: function() {
            return 'Traits.'+this.constructor.name+'(name='+Util.repr(this.name)+')';
        }
    });
    Trait.extend = Util.extend;
        

    
    Traits.String = Trait.extend('String', {
        constructor: function(config) {
            if (this instanceof Trait) this.initialize.apply(this, arguments); else return new Traits.String();
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


    Traits.Bool = Trait.extend('Bool', {
        constructor: function(config) {
            if (this instanceof Trait) this.initialize.apply(this, arguments); else return new Traits.Bool();
        },        
        parse: function(v) {
            return !!v;
        },
        toJSON: function(v) {
            return v;
        }
    });
    
    
    Traits.Float = Trait.extend('Float', {
        constructor: function(config) {
            if (this instanceof Trait) this.initialize.apply(this, arguments); else return new Traits.Number();
        },        
        parse: function(v) {
            if(!v && v !== 0) 
                return null;
            else if(_.isString(v))
                return Globalize.parseFloat(v) || null; // returns NaN on fail.
            else
                return _.isNumber(v) ? v : null;            
        },
        toJSON: function(v) {
            return v;
        }
    });
    Traits.Number = Traits.Float; // Legacy
    
    Traits.Date = Trait.extend('Date', {
        constructor: function(config) {
            if (this instanceof Trait) this.initialize.apply(this, arguments); else return new Traits.Date();
        },
        parse: function(v) {
            var timestamp = Tools.interpretdate(v);
            if(timestamp) {
                return new Date(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate());
            }
        },
        toJSON: function(v) {
            /* Return eg 2012-03-22 */
            return util.dateToYMD(v);
        }
    });


    Traits.DateTime = Trait.extend('DateTime', {
        /* Timezone-aware timestamp.
        self.toJSON(value) returns the value as UTC time, 
        eg "2014-02-11T15:10:42.021Z"
        */
        constructor: function(config) {
            if (this instanceof Trait) this.initialize.apply(this, arguments); else return new Traits.DateTime();
        },        
        parse: function(v) {
            return Tools.interpretdate(v);
        },
        toJSON: function(v) {
            // UTC datetime string, eg "2014-02-11T15:10:42.021Z"
            return v.toISOString();
        }
    });
    
    Traits.Instance = Trait.extend('Instance', {
        constructor: function(config) {
            if (this instanceof Trait) this.initialize.apply(this, arguments); else return new Traits.Instance();
        },
        initialize: function(type) {
            this.type = type;
        },
        parse: function(v) {
            if(v instanceof this.type)
                return v;
            return new this.type(v, {parse: true});
        },
        toJSON: function(v) {
            if(v)
                return v.toJSON();
        }
    });
    
    Traits.Collection = Trait.extend('Collection', {
        /*
        TODO: Add support for passing a Collection
        object, not just arrays.
        */
        constructor: function(config) {
            if (this instanceof Trait) this.initialize.apply(this, arguments); else return new Traits.Collection(config);
        },
        initialize: function(config) {
            config = config || {};
            this.Collection = Backbone.Collection;

            // if(Util.issubclass(config, Backbone.Collection)) {
            if(config && config.prototype && config.prototype.add) {

                this.Collection = config;
            }
        },
        parse: function(v, obj, attrs, key) {            
            // Convert eg 'foo' => [{id: 'foo'}]
            if(!v || v instanceof this.Collection)
                return v;
                
            if(v instanceof Backbone.Collection) {
                v = v.models;
                if(this.Collection)
                    v = _.map(v, function(o) { return o.attributes; })
            }
            else if(v)
                v = _.map(Util.arrayify(v), function(o) {
                    if(_.isString(o))
                        return {id: o};
                    else if(o.attributes)
                        return o.attributes
                    return o;
                }, this);
            

                
            if(v) {
                return new this.Collection(v);
            }
        },
        toJSON: function(v, obj) {
            // 'v' is a Collection
            return _.map(v.each(function(item) {
                return item.toJSON();
            }));
        }
    });
    
    Traits.Subset = Trait.extend('Subset', {
        constructor: function(config) {
            if (this instanceof Trait) this.initialize.apply(this, arguments); else return new Traits.Subset(config);
        },        
        initialize: function(config) {
            // 'source' is the name of a collection trait within this model
            //  or any Collection object.
            this.source = config.source;
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


    
    return Traits;
});