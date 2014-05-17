define([
    'jquery',
    'underscore',
    'backbone',
    'globalize/globalize',
    './traits',
    './util'
], function($, _, Backbone, Globalize, traits, Util) {
    'use strict';


    var exp = {};




    // ==========
    // = Models =
    // ==========
    // Abstract
    var ControlModel = traits.Model.extend({
        traits: {
            type: new traits.String(),
            name: new traits.String(),
            disabled: new traits.Bool(),
            value: new traits.Trait()
        },
        defaults: {
            disabled: false
        },
        merge: ['defaults', 'traits'],
        catchErrors: true,
        

        valueToJSON: function() {
            return this.get('value');
        },
        // legacy
        getValue: function() {
            return this.valueToJSON();
        },     
        toString: function() {
            return Util.modelToStr(this, 'name', 'disabled', 'value')
        }
    });
    ControlModel.createFromElement = function(el, obj) {
        /* Construct a model from attributes and possibly child <br/>
        elements of `el` */

        var attr = $(el).getAllAttributes(),
            value = attr.value,
            config = {
                id: attr.name,
                type: attr.type,
                disabled: !!attr.disabled
            };
        
        if(value)
            config.value = value;
        if(attr.format)
            config.format = attr.format;
        if(attr.options)
            config.options = obj[attr.options];
        
        
        return new this(config);
    };

    exp.Bool = ControlModel.extend('ControlModels.Bool', {      
        traits: {
            value: new traits.Bool()
        },
    });

    exp.String = ControlModel.extend('ControlModels.String', {
        traits: {
            value: new traits.String()
        }
    });

    exp.Number = ControlModel.extend('ControlModels.Number', {      
        traits: {
            value: new traits.Number(),
            format: new traits.String()
        },
        defaults: {
            format: 'n'
        },
        toString: function() {
            return Util.modelToStr(this, 'name', 'disabled', 'format', 'value');
        }
    });
    



    /*
    Examples
    --------
    var intmodel = new IntModel({
        format: 'n0',            // Add 1000 separator
        value: 12345
    })
    */
    exp.Int = ControlModel.extend('ControlModels.Int', {
        traits: {
            value: new traits.Int(),
            format: new traits.String()
        },
        toString: function() {
            return Util.modelToStr(this, 'name', 'disabled', 'format', 'value');
        }
    });


    exp.Float = ControlModel.extend('ControlModels.Float', {
        traits: {
            value: new traits.Float(),
            format: new traits.String()
        },
        toString: function() {
            return Util.modelToStr(this, 'name', 'disabled', 'format', 'value');
        }
    });
    
    
    exp.Date = ControlModel.extend('ControlModels.Date', {
        /* Does not know about time and time zones */
        traits: {
            value: new traits.Date(),
            format: new traits.String()            
        },
        defaults: {
            format: 'd'
        },
        set_value: function(v, attrs, options) {
            if(v === '') v = null;
            attrs.value = traits.Date.prototype.parse(v)
        },
        get_value: function() {
            return this.attributes.value;
        },
        toString: function() {
            return Util.modelToStr(this, 'name', 'disabled', 'format', 'value');
        },
        valueToJSON: function() {
            var val = this.value;
            if(val) 
                return traits.Date.prototype.toJSON.call(this, val)
        }
    });

    exp.DateTime = ControlModel.extend('ControlModels.DateTime', {
        traits: {
            value: new traits.DateTime(),
            format: new traits.String()            
        },
        defaults: {
            format: 'd'
        },
        toString: function() {
            return Util.modelToStr(this, 'name', 'disabled', 'format', 'value');
        },
        valueToJSON: function() {
            return this.traits.value.toJSON(this.get('value'));
        }
    });
    
    exp.DateTime.extend = Util.extend;    


    exp.Selected = ControlModel.extend('ControlModels.Selected', {      
        initialize: function() {
            this.on('change:selected', this.onSelectedChange, this)
        },
        get_value: function() {
            return this.get('selected');
        },
        set_value: function(v, attrs, options) {
            delete attrs.value;
            this.set('selected', v);
        },
        onSelectedChange: function() {
            this.trigger('change:value', this, this.get('value'));
        }
    });


    exp.Selection = ControlModel.extend('ControlModels.Selection', {
        /*
        var sm = new SelectionModel({
            name: 'favcolor',
            options: [
                {id: 'red', text: 'Red'},
                {id: 'green', text: 'Green'}
                {id: 'blue', text: 'Blue'}
            ],
            value: [{id: 'blue', text: 'Blue'}]
        })

        // Supports multiple formats for "options" and "value":
        sm.set('value', [{id:'123'}, {id:'456'}])
        sm.set('value', ['123', '456'])
        sm.set('value', '123')
        sm.set('value', [])
        sm.set('value', new Collection(..))

        // Play with options and value as you like
        sm.set('options', [{id:'foo', text: 'Foo'}, ...])
        sm.get('options').add({id: 'bar', text: 'Bar'})
        sm.get('value').add('bar')
        */
        traits: {
            options: new traits.Collection(),
            value: new traits.Subset({source: 'options'})
        },
        defaults: {
            value: null,
            options: []
        },
        valueToJSON: function() {
            var val = this.get('value');
            if(val)
                return val.pluck('id');
        },
        toString: function() {
            return Util.modelToStr(this, 'name', 'disabled', 'options', 'value');
        }
    });

    exp.MultiSelection = ControlModel.extend('ControlsModels.MultiSelection', {
        /*
        var mod = new ControlModels.MultiSelection({
            options: {
                id: 'foo', text: 'Foo', selected: true},
                id: 'bar', text: 'Bar'},
                id: 'baz', text: 'Baz'},
        })

        // value support different formats
        mod.set('value', [
            {id: 'foo', text: 'Foo', selected: true}
        ]);
        mod.set('value', 'foo');
        mod.set('value', [
            {id: 'foo', selected: true},
            {id: 'baz', selected: true},
        ]);
        mod.set('value', someCollection);

        // Or fiddle with the options themselves
        mod.get('options').get('foo').set('selected', true);

        */
        traits: {
            options: new traits.Collection(),
        },
        defaults: {
            options: []
        },
        setorder: ['options', 'value'],
        initialize: function() {
            this.listenTo(this.get('options'), 'change:selected', this.onSelectedChange, this);
        },
        get_value: function() {
            return _.compact(this.get('options').map(function(m) {
                if(m.get('selected')) return m
            }));
        },
        set_value: function(v, attrs, options) {
            delete attrs.value;
            options = options || {};
            if(v == null)
                v = [];
            else if(v.models)
                v = v.models;
            else
                v = Util.arrayify(v);
                        
            v = _.object(_(v).map(function(item) {
                var k = item, v = true
                if(item.attributes)
                    item = item.attributes
                if(item.id) {
                    k = item.id;
                    v = item.selected !== false;
                }
                return [k,v];
            }));

            var opts = attrs['options'] || this.get('options');
            opts.each(function(m) {
                m.set('selected', !!v[m.id], {mute: true});
            }, this);

            // No "change:value" when setting both 'options' and 'value' in one go.
            if(!attrs.options && !options.silent)
                this.trigger('change:value', this, this.get('value'), options);
        },
        onSelectedChange: function(model, value, options)  {
            if(!options.mute)
                this.trigger('change:value', this, this.get('value'), options);
        },
        valueToJSON: function() {
            return _.pluck(this.value, 'id');
        },
        toString: function() {
            return Util.modelToStr(this, 'name', 'disabled', 'options');
        }
    });   
    


    exp.SingleSelection = ControlModel.extend('ControlModels.SingleSelection', {
        /*    
        var sm = new SingleSelection({
            id: 'favcolor',
            options: [
                {id: 'red', text: 'Red'},
                {id: 'green', text: 'Green'},
                {id: 'blue', text: 'Blue'}
            ],
            value: 'blue'
        })
        */
        defaults: {            
            value: null,
        },
        traits: {
            options: new traits.Collection(),
            value: new traits.CollectionModel({source: 'options'})
        },
        toString: function() {
            return Util.modelToStr(this, 'name', 'disabled', 'options', 'value');
        },
        valueToJSON: function() {
            var val = this.get('value');
            if(val)
                return val.id;
        }
        
    },{
        createFromElement: function(el) {
            var attr = $(el).getAllAttributes();
            return new this({
                id: attr.name,
                type: attr.type,
                value: attr.value,
                disabled: !!attr.disabled,
                options: attr.options ? window[attr.options] : null
            });
        }
    });
    
    
    exp.SingleSelectionM = ControlModel.extend('ControlModels.SingleSelectionM', {
        traits: {
            options: new traits.CollectionM(),
        },
        // defaults: {
        //     options: []
        // },
        setorder: ['options', 'value'],
        initialize: function() {
            if(!this.get('options')) {
                this.attributes.options = new Backbone.Collection();
            }
            this.listenTo(this.get('options'), 'change:selected', this.onSelectedChange, this);
        },
        get_value: function() {
            return this.get('options').findWhere({selected: true});
        },
        set_value: function(v, attrs, options) {
            // remove this?
            delete attrs.value;
            if(v && v.id)
                v = v.id
            options = options || {};
            var opt,
                opts = attrs['options'] || this.get('options');
            if(v) {
                opt = opts.get(v);            
                if(opt.get('selected'))
                    return;
            }
            // unselect current, if any
            var curr = opts.findWhere({selected: true});
            if(curr) 
                curr.set('selected', false);
            
            // select new
            if(opt)
                opt.set('selected', true, {mute:true})

            attrs.value = opts.get(v);
            // No "change:value" when setting both 'options' and 'value' in one go.
            if(!attrs.options && !options.silent)
                this.trigger('change:value', this, this.value, options);
        },
        onSelectedChange: function(model, selected, options)  {
            // ignore unselect events
            if(!selected || options.mute) return;
            
            // unselect current, if any
            this.get('options').each(function(m) {
                if(m.get('selected') && m.id != model.id) 
                    m.set('selected', false);
            });
            this.trigger('change:value', this, this.get('value'), options);
        },
        valueToJSON: function() {
            var v = this.get('value');
            return v ? v.id : v;
        },
        toString: function() {
            return Util.modelToStr(this, 'name', 'disabled', 'options');
        }        
    });
    

    exp.Instance = ControlModel.extend('ControlModels.Instance', {
        /*
        Underlying model for a complex control.
        Has the ususal properties like .name, .type, .disabled, etc
        But its .value is not a scalar but is itself a model.

        > var Product = Backbone.Model.extend({
        >     toString: function() {
        >         return 'Product(name='+this.get('name')+', price='+this.get('price')+')';
        >     }        
        > });
        >
        > var MyCoolControl = Backbone.View.extend({
        >     defaultmodel: Instance(Product),
        > });
        >
        > var Foo = new Instance(Product)
        > var foo = new Foo()
        > foo.set('value', {name: 'CaptainCrunch', price: 2.99})
        > foo.get('value')
        Product(name=CaptainCrunch, price=2.99)
        
        */
        constructor: function() {
            if (this && this instanceof Backbone.Model) {
                Backbone.Model.prototype.constructor.apply(this, arguments);            
            }
            else {
                return exp.Instance.extend({
                    valuemodel: arguments[0] || Backbone.Model
                });
            }
        },
        validate: function(attrs, options) {  
            if(!(attrs.value instanceof this.valuemodel))
                return "Value is not instance of "+this.valuemodel;
        },
        valueToJSON: function() {
            /* Serialize to plain json */
            return _.object(_.map(this.get('value').attributes, function(val, key) {
                if(val.valueToJSON) 
                    val = val.valueToJSON();
                return [key, val];
            }, this));
        },
        set_value: function(v, attrs) {
            if(v instanceof this.valuemodel)
                attrs.value = v;
            else if(_.isObject(v))
                attrs.value = new this.valuemodel(v);
            else
                attrs.value = null;
        },
        parse: function(json) {
            if(json.value != null && !json.value.attributes)
                json.value = new this.valuemodel(json.value, {parse:true});
            
            // TODO: why is the defaults not kicking in here? even though json
            // does not contain a "value" key at all.
            if(!json.value) {
                json.value = new this.valuemodel(null, {parse:true});
            }
            return json;
        }
    });

    return _.extend(exp, {
        register: {
            bool: exp.Bool,
            string: exp.String,
            number: exp.Number,
            int: exp.Int,
            float: exp.Float,
            date: exp.Date, 
            datetime: exp.DateTime,
            singleselection: exp.SingleSelectionM,
            selection: exp.Selection,
            multiselection: exp.MultiSelection,
            instance: exp.Instance
        },
        ControlModel: ControlModel,
        
        // Deprecated names
        BoolModel: exp.Bool,
        StringModel: exp.String,
        NumberModel: exp.Number,
        IntModel: exp.Int,      
        FloatModel: exp.Float,  
        DateTimeModel: exp.DateTime,
        DateModel: exp.Date,         
        SelectionModel: exp.Selection,
        SingleSelectionModel: exp.SingleSelection,
        InstanceModel: exp.Instance
    });

});