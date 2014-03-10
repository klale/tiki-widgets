define([
    'jquery',
    'underscore',
    'backbone',
    'globalize/globalize',
    './traits'
], function($, _, Backbone, Globalize, traits) {
    'use strict';

    var createFromElement = function(el) {
        var attr = $(el).getAllAttributes();
        return new this({
            id: attr.name,
            type: attr.type,
            value: attr.value || $(el).html(),
            enabled: attr.enabled == 'false' ? false : true,
            format: attr.format
        });
    };



    // ==========
    // = Models =
    // ==========
    var ControlModel = traits.Model.extend({
        traits: {
            type: new traits.String(),
            enabled: new traits.Bool()
        },
        defaults: {
            value: null,
            enabled: true
        },
        merge: ['defaults', 'traits'],        
        
        getValue: function() {
            return this.get('value');
        }
    },{
        createFromElement: function(el) {
            /* Construct a model from attributes and possibly child <br/>
            elements of `el` */
            var attr = $(el).getAllAttributes();
            return new this({
                id: attr.name,
                type: attr.type,
                value: attr.value || $(el).html(),
                enabled: attr.enabled == 'false' ? false : true
            });
        }
    });
    
    var BoolModel = ControlModel.extend({      
        traits: {
            value: new traits.Bool()
        }
    });

    var StringModel = ControlModel.extend({      
        traits: {
            value: new traits.String()
        }
    });

    var NumberModel = ControlModel.extend({      
        traits: {
            value: new traits.Number(),
            format: new traits.String()
        },
        defaults: {
            format: 'n'
        }
    },{
        createFromElement: createFromElement
    });
    



    /*
    Examples
    --------
    var intmodel = new IntModel({
        format: 'n0',            // Add 1000 separator
        value: 12345
    })
    */
    var IntModel = ControlModel.extend({
        traits: {
            value: new traits.Int(),
            format: new traits.String()
        }
    },{
        createFromElement: createFromElement
    });


    var FloatModel = ControlModel.extend({
        traits: {
            value: new traits.Float(),
            format: new traits.String()
        }
    },{
        createFromElement: createFromElement
    });
    
    
    var DateModel = ControlModel.extend({
        /* Does not know about time and time zones */
        traits: {
            value: new traits.Date(),
            format: new traits.String()            
        },
        defaults: {
            format: 'd'
        },
        getValue: function() {
            var val = this.get('value');
            if(val)
                return this.traits.value.toJSON(this.get('value'));
        }
    },{
        createFromElement: createFromElement
    });

    var DateTimeModel = ControlModel.extend({
        traits: {
            value: new traits.DateTime(),
            format: new traits.String()            
        },
        defaults: {
            format: 'd'
        },
        getValue: function() {
            return this.traits.value.toJSON(this.get('value'));
        }
    },{
        createFromElement: createFromElement
    });


    var SelectionModel = ControlModel.extend({
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
        getValue: function() {
            var val = this.get('value');
            if(val)
                return val.pluck('id');
        }
    });



    var SingleSelectionModel = ControlModel.extend({
        /*    
        var sm = new SingleSelectionModel({
            id: 'favcolor',
            options: [
                {id: 'red', text: 'Red'},
                {id: 'green', text: 'Green'},
                {id: 'blue', text: 'Blue'}
            ],
            value: 'blue'
        })
        */
        traits: {
            options: new traits.Collection(),
            value: new traits.Subset({source: 'options'})
        },
        getValue: function() {
            var val = this.get('value');
            if(val && val.models.length)
                return val.models[0].id;
        }
    },{
        createFromElement: function(el) {
            /* Construct a model from attributes and possibly child <br/>
            elements of `el` 
            
            <input type="combo" id="favcolors" value="red" options="allColors">
            */
            var attr = $(el).getAllAttributes();
            return new this({
                id: attr.name,
                type: attr.type,
                value: attr.value,
                enabled: attr.enabled == 'false' ? false : true,
                options: attr.options ? window[attr.options] : null
            });
        }
    });


    var InstanceModel = ControlModel.extend({
        /*
        Underlying model for a complex control.
        Has the ususal properties like .name, .type, .enabled, etc
        But its .value is not a scalar but is itself a model.

        > var Product = Backbone.Model.extend({
        >     toString: function() {
        >         return 'Product(name='+this.get('name')+', price='+this.get('price')+')';
        >     }        
        > });
        >
        > var MyCoolControl = Backbone.View.extend({
        >     defaultmodel: InstanceModel(Product),
        > });
        >
        > var Foo = new InstanceModel(Product)
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
                return InstanceModel.extend({
                    valuemodel: arguments[0] || Backbone.Model
                });
            }
        },
        // UPDATE: defaults is run in initcls before an instance is created
        // (due to merge: ['defaults', ..] in ControlModel above)
        // defaults: function() {
        //     return {
        //         value: new this.valuemodel(null, {parse:true})
        //     };
        // },
        validate: function(attrs, options) {  
            if(!(attrs.value instanceof this.valuemodel))
                return "Value is not instance of "+this.valuemodel;
        },
        getValue: function() {
            /* Serialize to plain json */
            return _.object(_.map(this.get('value').attributes, function(val, key) {
                if(val.getValue) 
                    val = val.getValue();
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
        },
        toJSON: function() {
            // console.log('this.attributes', json.value);
            var json = _.clone(this.attributes);

            // json.value = json.value.toJSON();
            return json;
        }
        
    });

    return {
        register: {
            bool: BoolModel,
            string: StringModel,
            number: NumberModel,
            int: IntModel,
            float: FloatModel,
            date: DateModel, 
            datetime: DateTimeModel,
            selection: SelectionModel,
            instance: InstanceModel
        },        
        ControlModel: ControlModel,
        BoolModel: BoolModel,
        StringModel: StringModel,
        NumberModel: NumberModel,
        IntModel: IntModel,      
        FloatModel: FloatModel,  
        DateTimeModel: DateTimeModel,
        DateModel: DateModel,         
        SelectionModel: SelectionModel,
        SingleSelectionModel: SingleSelectionModel,
        InstanceModel: InstanceModel
    };

});