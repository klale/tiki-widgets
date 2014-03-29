define([
    'jquery', 
    'underscore',
    'backbone',
    'globalize/globalize',
    './util',
    './controlmodels',
    './controls',
    './traits',
    './tools'
], function($, _, Backbone, Globalize, Util, ControlModels, Controls, Traits, Tools) {
    'use strict';



    // ========
    // = Form =
    // ========
    var ControlsCollection = Backbone.Collection.extend({
        model: function(attrs, options) {
            var Model;
            if(attrs.modeltype) {
                Model = ControlModels.register[attrs.modeltype];
            }
            else {
                if(!Controls.register[attrs.type])
                    throw new Error('"'+attrs.type+'" is not found in Controls.register.');
                Model = Controls.register[attrs.type].prototype.defaultmodel;
            }
            
            options = options || {};
            options.parse = true;
            return new Model(attrs, options);    
        }
    });
    
    

    var Form = Traits.Model.extend('Tiki.Form.Form', {
        /**
        var f = new Form({
            controls: [
                {type: 'text', name: 'foo'},
                {type: 'text', name: 'bar'}
            ],
            values: {
                foo: 'I am foo',
                bar: 'I am bar
            }
        })
        */            
        initialize: function(config) {
            _.bindAll(this, 'onControlChange', 'onControlInvalid', 'onValuesChange', 
                     'onValuesInvalid');
            
            var controls = config.controls || config.fields;

            this.controls = new ControlsCollection(controls);
            this.fields = this.controls; // legacy
            this.values = Util.modelify(config.values);
                        
            _.each(this.values.attributes, function(v,k) {
                var controlmodel = this.controls.get(k);
                if(controlmodel)
                    controlmodel.set('value', v);
            }, this);
            
            
            this.listenTo(this.controls, {
                'change:value': this.onControlChange,
                'invalid': this.onControlInvalid});

            this.listenTo(this.values, {
                'change': this.onValuesChange,
                'invalid': this.oValuesInvalid});
        },
        onControlChange: function(control, value) {
            // control changes propagate to the model using control.get('name') as key.
            this.values.off('change', this.onValuesChange);
            // this.values.set(control.id, control.get('value'));
            this.values.set(control.id, value);            
            this.values.on('change', this.onValuesChange);
        },        
        onValuesChange: function(model) {
            // A change to 'this.values' triggers control.set('value', newvalue), which in turn
            // refreshes the view
            this.controls.off('change:value', this.onControlChange); // temporary stop propagation
            this.values.off('change', this.onValuesChange);
            _.each(model.changedAttributes(), function(v, k) {
                var control = this.controls.get(k);
                if(control) {
                    control.set('value', v);
                    this.values.set(k, control.getValue()); // {silent:true}
                }
            }, this);
            this.values.on('change', this.onValuesChange);
            this.controls.on('change:value', this.onControlChange); // resume
        },
        onControlInvalid: function(model, error) {
            this.trigger('showerror', model, error);
        },
        onValuesInvalid: function(model, error, resp) {
            _.each(error.errors || [], function(error) {
                var model = this.controls.get(error.name);
                this.trigger('showerror', model, error);
            }, this);
        }
    });


    // ==========
    // = Mixins =
    // ==========
    var ErrorMessages = {
        initialize: function(config) {
            _.bindAll(this, 'onShowError', 'onHideError');
            this.listenTo(this.form, {
                'showerror': this.onShowError,
                'hideerror': this.onHideError
            });
        },
        onShowError: function(model, error) {
            var view = this.views[model.cid];
            var el = view.$el.parent().find('.error');
            if(el.length) 
                el.show().text(error.message);
            else {
                $('<div class="error"></div>').text(error.message).insertAfter(view.el);
                view.$el.parent().addClass('invalid');
            }
        },
        onHideError: function(model) {
            var view = this.views[model.cid];
            view.$el.parent().find('.error').fadeOutFast();
            view.$el.parent().removeClass('invalid');
        }    
    };




    var SimpleForm = Tools.View.extend('Tiki.Form.SimpleForm', {
        /* A simple <ul> based form layout.
        Example
        -------
        // pass an existing Form.Form
        var myform = new SimpleForm({form: myform})
        
        // or create one implicitly
        var myform = new SimpleForm({
            model: new Backbone.Model(null, {
                url: '/foo/bar'
            }),
            controls: [
                {type: 'text', name: 'title'}
                {type: 'textarea', name: 'description'}
            ],
            metadata: {
                'title': {label: 'Title'},
                'description': {label: 'Description'},  // todo: add support for `renderer`?
            }    
        });    
        body.append(myform.render().el);
        myform.model.save()
        */
        className: 'tiki-simpleform',
        template: _.template('<ul class="form"></ul>'),

        initialize: function(config) {
            this.form = config.form || new Form(config);
            this.views = {};
            this.metadata = config.metadata || {};
        },
        render: function() {
            this.$el.html(this.template());
            this.form.controls.each(function(control) {
                this.addOne(control);
            }, this);
            return this;
        },
        addOne: function(control) {
            var view = new SimpleFormRow({
                control: control,
                metadata: this.metadata[control.id] || {}
            });
            this.$('>ul').append(view.render().el);
            this.views[control.cid] = view;
            // this.model.set(model.get('name'), model.get('value'), {silent: true});            
        },
        removeOne: function(control) {
            this.views[control.cid].remove();
        }
    });

    var SimpleFormRow = Backbone.View.extend({
        tagName: 'li',
        template: Util.template(''+
                '<div class="label">${obj.label}[[ if(obj.required) print("*") ]]</div>'+
                '<div class="control"></div>'),

        initialize: function(config) {
            this.control = config.control;
            this.metadata = config.metadata;
        },
        render: function() {
            if(this._controlview) this._controlview.remove();
            this.$el.html(this.template(this.metadata));
            if(!this.metadata.label)
                this.$('>.label').remove();

            // ..and append the control subview    
            this._controlview = new Controls.register[this.control.get('type')]({model:this.control});
            this.$('>.control').append(this._controlview.render().el);
            return this;
        }
    });





    // ==============
    // = CustomForm =
    // ==============
    var CustomForm = Tools.View.extend('Tiki.Form.CustomForm', {
    
        initialize: function(config) {
            this.views = {};

            // Search `config.el` for elements that look like controls
            var controls = [];
            this.$('div[name]').each(function() {
                var div = $(this),
                    name = div.attr('name'),
                    Type, control;
                
                if(config.controls) {
                    // Create the control from a json object spec, eg: 
                    // {name: 'name', type: 'dropdown', options: myOptions},
                    // Or control could be a ready-to-use ControlModel. 
                    
                    control = config.controls[name];
                    if(!(control instanceof ControlModels.ControlModel)) {
                        Type = control.modeltype;
                        if(!Type)
                            Type = Controls.register[control.type].prototype.defaultmodel;
                        if(_.isString(Type))
                            Type = ControlModels.register[Type];

                        control = new Type(_.extend({}, control, {id: name}));
                    }
                }
                else {
                    // create the control config from a DOM element and its attributes
                    var type = div.attr('type'),
                        modeltype = div.attr('modeltype');
                    Type = modeltype ? modeltype : Controls.register[type].prototype.defaultmodel;
                    if(_.isString(Type))
                        Type = ControlModels.register[Type];
                
                    control = Type.createFromElement(this);                    
                }
                controls.push(control);
            });

            // If config.values are given, these trumf any value="myvalue" 
            // dom-element attributes etc.
            if(config.values)
                _(controls).each(function(controlmodel) {
                    var value = config.values[controlmodel.id];
                    if(value != null) // null or undefined
                        controlmodel.set('value', value);
                });

            config.controls = controls;
            this.form = config.form || new Form(config);
            
            this.form.controls.each(function(model) {
                var el = this.$('div[name="'+model.id+'"]'),
                    View = Controls.register[model.get('type')];

                var view = new View({model:model});
                this.views[model.cid] = view;
                
                view.attackElement(el);
                view.render();
                view.delegateEvents();
            }, this);        
        },    
        render: function() {
            return this;
        },
        removeOne: function(control) {
            this.views[control.cid].remove();
        }      
    });



    return {
        Form: Form,
        SimpleForm: SimpleForm,
        CustomForm: CustomForm
    };

});