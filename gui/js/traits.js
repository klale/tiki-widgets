define([
    'jquery',
    'underscore',
    'backbone',
    'globalize/globalize',
    'gui/base',
    'gui/tools',    
], function($, _, Backbone, Globalize, base, tools) {

    var traits = {};


    var Model = Backbone.Model.extend({
        /*
        Mixin for Backbone.Model adding support for typed attributes.
        
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
                        
            _.each(_.arrayify(proto.merge), function(propname) {
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
        
        // Todo: Hmm.. this is only vaguely related to Traits, move this elsewhere?
        toRemoteJSON: function() {
            return _.object(_.map(this.traits, function(trait,k) {
                return [k, trait.toJSON(this.attributes[k])]
            }, this))
        }        
    });




    var Trait = function() {
        if(this.initialize)
            this.initialize.apply(this, arguments);
    };
    _.extend(Trait.prototype, Backbone.Events, {
        initialize: function() {}
    });
    Trait.extend = Backbone.Model.extend;

    var empty = function() {}
    
    

    
    traits.String = Trait.extend({
        constructor: function(config) {
            if (this instanceof Trait) this.initialize.apply(this, arguments); else return new traits.String();
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

    traits.Bool = Trait.extend({
        constructor: function(config) {
            if (this instanceof Trait) this.initialize.apply(this, arguments); else return new traits.Bool();
        },        
        parse: function(v) {
            return !!v;
        },
        toJSON: function(v) {
            return v;
        }
    });
    
    traits.Number = Trait.extend({
        constructor: function(config) {
            if (this instanceof Trait) this.initialize.apply(this, arguments); else return new traits.Number();
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
    
    traits.Date = Trait.extend({
        constructor: function(config) {
            if (this instanceof Trait) this.initialize.apply(this, arguments); else return new traits.Date();
        },
        parse: function(v) {
            var timestamp = tools.interpretdate(v);
            if(timestamp)
                return new Date(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate());
        },
        toJSON: function(v) {
            /* Return eg 2012-08-03 */
            var month = base.pad(v.getMonth()+1, 2, '0');
            var day = base.pad(v.getDate(), 2, '0');
            return v.getFullYear()+'-'+month+'-'+day;
        }
    });


    traits.DateTime = Trait.extend({
        /* Timezone-aware timestamp 
        self.toJSON(value) returns the value as UTC time.
        */
        constructor: function(config) {
            if (this instanceof Trait) this.initialize.apply(this, arguments); else return new traits.DateTime();
        },        
        parse: function(v) {
            return tools.interpretdate(v);
        },
        toJSON: function(v) {
            return v.toISOString();
        }
    });
    
    traits.Instance = Trait.extend({
        constructor: function(config) {
            if (this instanceof Trait) this.initialize.apply(this, arguments); else return new traits.Instance();
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
    })
    
    traits.Collection = Trait.extend({
        /*
        TODO: Add support for passing a Collection
        object, not just arrays.
        */
        constructor: function(config) {
            if (this instanceof Trait) this.initialize.apply(this, arguments); else return new traits.Collection(config);
        },
        initialize: function(config) {
            config = config || {};
            this.source = config.source
        },
        parse: function(v, obj, attrs, key) {            
            // Convert eg 'foo' => [{id: 'foo'}]
            if(v instanceof Backbone.Collection)
                return v;
            
            v = _.map(_.arrayify(v), function(o) {
                if(_.isString(o))
                    return {id: o}
                return o;
            });
                
            return new Backbone.Collection(v);
        }
    })
    
    traits.Subset = Trait.extend({
        constructor: function(config) {
            if (this instanceof Trait) this.initialize.apply(this, arguments); else return new traits.Subset(config);
        },        
        initialize: function(config) {
            this.source = config.source; // Source is the name of a collection trait
        },
        parse: function(v, obj, attrs, key) {
            if(v instanceof Backbone.Subset)
                return v;

            if(v)
                v = _.map(_.arrayify(v), function(o) {
                    if(_.isString(o))
                        return {id: o};
                    return o;
                }); 
            

            // var source = attrs[this.source] || obj.get(this.source);
            // return new Backbone.Subset(v, {source: this.source});
            var s = obj.get(this.source)
            if(!s) 
                s = attrs[this.source];
                
            return new Backbone.Subset(v || [], {source: s});            
        }
    })


    traits.SubsetMulti = Trait.extend({
        _class: 'traits.SubsetMulti',

        constructor: function(config) {
            if (this instanceof Trait) this.initialize.apply(this, arguments); else return new traits.SubsetMulti();
        },        
        initialize: function(config) {
            /*
            TODO: tokenchar and view should move higher up.
            
            var t = new SubsetMulti({
                sources: [{
                    id: 'columns',
                    collection: columns,
                    tokenchar: '#',
                    view: ColumnTokenSpan
                }]});
            */
            this.sources = config.sources;
            this.Model = config.Model || Backbone.Model;
        },
        parse: function(v, obj, attrs, key) {
            /*
            // Reset with 3 new tokens, all referencing the same
            // model in the "mycoll" collection, but with different metadata.
            mymodel.set('mytokens', [
                {id: 123, coll: 'mycoll', refId: 'abc', mymeta: 'foo'},
                {id: 456, coll: 'mycoll', refId: 'abc', mymeta: 'bar'},
                {id: 789, coll: 'mycoll', refId: 'abc', mymeta: 'lax'},                
            ])
            
            t.parse(['123', '456'])
            t.parse({id: '123', somemeta: 'foo'})
            t.parse([{id: '123', somemeta: 'foo'}])
            t.parse([{id: '123', somemeta: 'foo', coll: 'columns'}])
            */
            
            // v = _.map(_.arrayify(v), function(o) {
            //     if(_.isString(o))
            //         return {id: o}
            //     return o;
            // });
            
            
            // var sources = this.sources,
            //     Model = this.Model
            // 
            // v = _.map(_.arrayify(v), function(item) {
            //     var source = item.source;
            //     if(!sources[source])
            //         throw new Error('Unknown source: ' + source);
            //         
            //     var collection = sources[source].collection;
            //     var sourceModel = collection.get(item.sourceId);
            //     if(!refModel)
            //         throw new Error('Cannot refer to unknown model "'+item.refId+'" in collection "'+collId+'"');
            //         
            //     if(v instanceof Backbone.Model)
            //         return v
            //     return new Model(v);
            // });
            

            
            var sources = attrs['sources'] || this.sources;
            var Model = attrs['Model'] || this.Model;
            return new Backbone.SubsetMulti(v, {sources: sources, Model: Model});
        }        
    })


    traits.TokenString = Trait.extend({
        /*
        var s = "Bla bla bla ${1234} bla bla ${5678} bla bla."
        
        var s = 'Bla bla bla {"id": "1234"} bla bla {"id": "5678"} bla bla.'
        
        var s = 'Jobbat med stuff: {"id": "1234", type: "page", hours: 3.5} gick riktigt bra.
        
        var s = 'Möte med {"id": "john_appleseed", type="account"} ang {"id": "nextgen", type="project"}
        
        - Där @john_appleseed<spacebar> skapar en account-referens och #nextgen<spacebar> skapar en projekt-referens.
        - this.tokens skall kunna börja tom och fyllas på efterhand med ajaxqueries.
        - ett token i textarean skall alltid vara en referens till ngt i this.tokens.
        
        
        1. When i type "@", wait 1 sec, then add 10 most recent users to tokens_source
        2. When i type "@ca", load 10 more users "ca*".
        

        sources: [{
                id: 'accounts',
                triggerchar: '@',
                view: AccountToken,                 <-- complete with html template and events
                collection: AccountsCollection
            },{
                id: 'projects',
                triggerchar: '#',
                view: ProjectToken,                 
                collection: ProjectsCollection
            },{
                id: 'columns',
                triggerchar: '$',
                view: ColumnToken,
                collection: ColumnsCollection        <-- this one won't do any ajax.
            }
        }]
        
        tokens_source: [
            {id: 'nextgen', type="project"},
            {id: 'ekan13', type="project"},
            {id: 'carls', type="account"},
        ],
        // I can reference 1 token many times, with different metadata.
        // Hence, each reference is a new model. 
        tokens: [
            {id: '123', coll: 'projects', refid: 'nextgen', hours:1}      <-- nextgen
            {id: '548', coll: 'projects', refid: 'nextgen', hours:2}      <-- nextgen again
            {id: '299', coll: 'projects', refid: 'ekan13', hours: 0.5}    <-- ekan13
            {id: '948', coll: 'accounts', refid: 'carls'}                 <-- carls account reference
        ],
        value: "Bla bla ${123} bla bla ${948}, and ${548} with ${299}"
        
        
        Then i could store and query these individually.
        It is a small Document representing a reference to something with added metadata.
        
        
        Questions:
        - Should all of this really be tucked into a heffa-trait?
          Put it all in the TokenTextArea view for now.
          Use a simple traits.String as value.
        
        
        */
        constructor: function(config) {
            if (this instanceof Trait) this.initialize.apply(this, arguments); else return new traits.TokenString();
        },        
        initialize: function(config) {
            this.source = config.source;
        },
        parse: function(v, obj, attrs, key) {
            v = _.map(_.arrayify(v), function(o) {
                if(_.isString(o))
                    return {id: o}
                return o;
            }); 
            
            var source = attrs[this.source] || obj.get(this.source);
            return new Backbone.Subset(v, {source: source});
        }
    });
    

   
    traits.Model = Model
    
    return traits;
});