define([
    'jquery',
    'underscore',
    'backbone',
    'gui/base',
    'gui/form'
], function($, _, Backbone, gui, form) {


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




    var SimpleForm = Backbone.View.extend({
        /* A simple <ul> based form layout.
        Example
        -------
        var myform = new SimpleForm({
            model: new Backbone.Model(null, {
                url: '/foo/bar'
            }),
            fields: [
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
        className: 'gui-simpleform',
        template: _.template('<ul class="form"></ul>'),
        mixins: [ErrorMessages],

        initialize: function(config) {
            this.form = config.form || new form.Form(config);
            this.views = {};
            this.metadata = config.metadata || {};
            ErrorMessages.initialize.call(this, config);
        },
        render: function() {
            this.$el.html(this.template());
            this.form.fields.each(function(field) {
                this.addOne(field);
            }, this);
            return this;
        },
        addOne: function(field) {
            var view = new SimpleFormRow({
                field: field,
                metadata: this.metadata[field.id] || {}
            });
            this.$('>ul').append(view.render().el);
            this.views[field.cid] = view;
            // this.model.set(model.get('name'), model.get('value'), {silent: true});            
        },
        removeOne: function(field) {
            this.views[field.cid].remove();
        }
    });

    var SimpleFormRow = Backbone.View.extend({
        tagName: 'li',
        template: _.template2(''+
                '<div class="label">${obj.label}[[ if(obj.required) print("*") ]]</div>'+
                '<div class="field"></div>'),

        initialize: function(config) {
            this.field = config.field;
            this.metadata = config.metadata;
        },
        render: function() {
            if(this._fieldview) this._fieldview.remove();
            this.$el.html(this.template(this.metadata));
            if(!this.metadata.label)
                this.$('>.label').remove();

            // ..and append the field subview    
            this._fieldview = new form.viewtypes[this.field.get('type')]({model:this.field});
            this.$('>.field').append(this._fieldview.render().el);
            return this;
        }
    });







    // ==============
    // = CustomForm =
    // ==============
    var CustomForm = Backbone.View.extend({
        mixins: [ErrorMessages],
    
        initialize: function(config) {
            this.views = {};

            // Search `config.el` for elements that look like fields
            var fields = [];
            this.$('div[name]').each(function() {
                var div = $(this),
                    name = div.attr('name'),
                    Type, field;
                
                if(config.fields) {
                    // Create the field from a json object spec, eg: 
                    // {name: 'name', type: 'combo', options: myOptions},
                    // Or field could be a ready-to-use FieldModel. 
                    
                    field = config.fields[name];
                    console.log('FIII', field, name)
                    if(!(field instanceof form.FieldModel)) {
                        Type = field.modeltype ? field.modeltype : form.viewtypes[field.type].prototype.defaultmodel;
                        if(_.isString(Type))
                            Type = form.modeltypes[Type];

                        field = new Type(_.extend({}, field, {id: name}));
                    }
                }
                else {
                    // create the field config from a DOM element and its attributes
                    var type = div.attr('type'),
                        modeltype = div.attr('modeltype');
                    Type = modeltype ? modeltype : form.viewtypes[type].prototype.defaultmodel;
                    if(_.isString(Type))
                        Type = form.modeltypes[Type];
                
                    field = Type.createFromElement(this);                    
                }

                console.log('FIELD: ', field.id)
                fields.push(field);
            });

            // If config.values are given, these trumf any value="myvalue" 
            // dom-element attributes etc.
            if(config.values)
                _(fields).each(function(fieldmodel) {
                    console.log('ID: ', fieldmodel.id, 'VAL: ', config.values[fieldmodel.id])
                    var value = config.values[fieldmodel.id];
                    if(value != null) // null or undefined
                        fieldmodel.set('value', value)
                });

            config.fields = fields;
            this.form = config.form || new form.Form(config);



            
            this.form.fields.each(function(model) {
                var el = this.$('div[name="'+model.id+'"]'),
                    View = form.viewtypes[model.get('type')];
                    
                console.log('I have an element: ', el[0])
                console.log('VAL: ', model.get('value'))
                view = new View({model:model});
                this.views[model.cid] = view;
                
                view.attackElement(el);
                view.render();
                view.delegateEvents();
                
                
            }, this);
            
            ErrorMessages.initialize.call(this, config);
        },    
        render: function() {
            console.log('im here: ', this.form.values)
            return this;
        },
        removeOne: function(field) {
            this.views[field.cid].remove();
        }      
    });




    return {
        SimpleForm: SimpleForm,
        CustomForm: CustomForm
    }
});