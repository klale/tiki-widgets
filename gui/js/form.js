define([
    'jquery', 
    'underscore',
    'backbone',
    'globalize/sv_se',
    'moment',
    './base',
    './calendar',
    './menu',
    './tools',    
    'iframetransport'
], function($, _, Backbone, Globalize, moment, base, calendar, menu, tools) {


    /*
    HTML4
    <input type="text">    
    <input type="checkbox">	
    <input type="radio">
    <input type="password">
    <input type="file">	
    <input type="submit">	
    <select>	
    
    HTML5
    <input type="email">
    <input type="url">
    <input type="search">
    <input type="color">
    <input type="range" min="0" max="10" step="2" value="6">
    
    <input type="date">
    <input type="datetime">
    <input type="datetime-local">
    <input type="month">
    <input type="week">
    <input type="time">    
    */




    /*
    Utility function for creating a Field instance from
    a DOM element.
    */
    function createFromElement(klass, el) {
        var attr = $(el).getAllAttributes();
        $(el).attr(klass.prototype.attributes || {});
        $(el).addClass(klass.prototype.className);
        return new klass({
            el: el,
            name: attr.name,
            value: attr.value,
            required: attr.required
        },{parse: true});
    }




    // ==========
    // = Models =
    // ==========
    var FieldModel = Backbone.Model.extend({
        defaults: {
            type: null,
            name: null,
            value: null,            
            enabled: true,
            format: ''
        },
        format: function(value) {
            return value;
        },
        getFormattedValue: function() {
            return this.format(this.get('value'));
        }
    },{
        createFromElement: function(el) {
            /* Construct a model from attributes and possibly child <br/>
            elements of `el` */
            var attr = $(el).getAllAttributes();
            return new this({
                type: attr.type,
                name: attr.name,
                value: attr.value,
                enabled: attr.enabled == 'false' ? false : true,
                format: attr.format
            });
        }
    });
    
    var BoolModel = FieldModel.extend({
        set_value: function(value, attrs) {
            attrs['value'] = !!value;
        }
    });
    
    var StringModel = FieldModel.extend({
    });


    var NumberModel = FieldModel.extend({
        validate: function(attrs, options) {
            if(attrs.value === null)
                return;
            else if(_.isNaN(attrs.value))
                return "Not a number";
        },
        format: function(value) {
            return Globalize.format(value || '', this.get('format'));
        },
        set_value: function(value, attrs) {
            if(!value && value !== 0) 
                attrs['value'] = null;
            else if(_.isString(value) && value)
                attrs['value'] = Globalize.parseFloat(value); // returns NaN on fail.
            else
                attrs['value'] = _.isNumber(value) ? value : NaN;
        }
    });    

    var DateTimeModel = FieldModel.extend({
        defaults: function() {
            // Apply a default date format
            return _.extend({}, _.result(FieldModel.prototype, 'defaults'), {
                format: 'd'
            });
        },
        validate: function(attrs, options) {
            if('value' in attrs) {
                var date = attrs.value;
                if(date === null)
                    return; // ok
                else if(date === false) 
                    return 'Not a date';                
                else if(date instanceof window.Date)
                    return date.valueOf() ? undefined : 'Not a date';
                else
                    return 'Not a date';    
            }
        },        
        format: function(value) {
            return Globalize.format(value, this.get('format'));
        },        
        set_value: function(v, attrs) {     
            if(!v)
                attrs['value'] = null;
            else {            
                // try to parse it
                var m = tools.interpretdate(v, this.get('value'));
                attrs['value'] = m; // a window.Date or `false` 
            }
        },
        parse: function(json) {
            if(json.value) {
                var m = tools.interpretdate(json.value);
                if(m) json.value = m;
            }
            return json;
        },
        // Override to change the serialization format
        toJSON: function() {
            var json = _.clone(this.attributes);
            if(json.value)
                json.value = json.value.toISOString();
            return json;
        }
    });


    var ModelModel = FieldModel.extend({
        mixins: [base.ChildModel],
        constructor: function() {
            if (this instanceof Backbone.Model)
                Backbone.Model.prototype.constructor.apply(this, arguments);            
            else
                return ModelModel.extend({
                    valuemodel: arguments[0]
                });
        },
        defaults: function() {
            return {
                value: new this.valuemodel(null, {parse:true})
            };
        },
        validate: function(attrs, options) {  
            if(!(attrs.value instanceof this.valuemodel))
                return "Value is not instance of "+this.valuemodel;
        },              
        set_value: function(v, attrs) {
            if(v instanceof this.valuemodel)
                attrs['value'] = v;
            else if(_.isObject(v))
                attrs['value'] = new this.valuemodel(v);
            else
                attrs['value'] = null;
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
            var json = _.clone(this.attributes);
            json.value = json.value.toJSON();
            return json;
        }
        
    });



    var SelectionModel = FieldModel.extend({
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

        // Supports multiple formats for "value":
        sm.set('value', [{id:'123'}, {id:'456'}])
        sm.set('value', ['123', '456'])
        sm.set('value', '123')
        sm.set('value', [])
        sm.set('value', new Collection(..))

        // Set options later
        sm.set('options', [{id:'foo', text: 'Foo'}, ...])

        */
        constructor: function(attributes, options) {
            options = _.defs(options, {parse: true});
            Backbone.Model.call(this, attributes, options);
        },
        defaults: function() {
            var value = new Backbone.Collection();
            value.on('all', this.onValueAll, this);
            return {
                options: new Backbone.Collection(),
                value: value, // `value` is a subset of `options`
                strict: false
            };
        },
        validate: function(attrs, options) {
            options = this.get('options');
            if(!options.length)
                return;

            attrs.get('value').each(function(model) {
                if(options.get(attrs.value) === undefined)
                    return 'Invalid';                
            });
        },
        set_value: function(v, attrs, options) {
            if(v instanceof Backbone.Collection)
                // replace the entire collection
                attrs['value'] = v;
            else {
                // update the existing collection
                this.get('value').set(this.parseValue(v));
                _.pop(attrs, 'value');
            }
        },
        set_options: function(val, attrs) {
            if(val instanceof Backbone.Collection) {
                // replace the entire collection
                var options = val;
                attrs['options'] = options;
            }
            else {
                // update the existing collection
                var options = this.get('options');
                options.reset(_.arrayify(val));
                val = _.arrayify(val);
                _.pop(attrs, 'options');
            }
            // Silently update the value-collection to be
            // a subset of the exact same model objects
            var value = this.get('value');
            if(value)
            value.each(function(v) {
                var model = options.get(v.id);
                if(model && model.cid != v.cid) {
                    value.remove(v, {silent: true});
                    value.add(model, {silent: true});
                }
            });
        },
        parseValue: function(v, options) {
            // Todo: this method needs another iteration
            if(!v) return;
            options = options || this.get('options');
            var strict = this.get('strict');
            if(strict && !options)
                // Todo: trigger invalid here
                console.log('Invalid enum (no options are set): ' + v + ' ');
            return _.compact(_.map(_.arrayify(v), function(v) {
                var id = (_.isObject(v) && v.id) ? v.id : v, 
                    model = options ? options.get(id) : null;
                    
                if(model)
                    return model;
                if(strict) {
                    // Todo: trigger invalid here
                    console.log('Invalid enum: ' + v);
                }
                else {
                    // any value is allowed, turn v into a model
                    if(v instanceof Backbone.Model)
                        return v;
                    else if(_.isObject(v))
                        return new Backbone.Model(v);
                    else // assume scalar
                        return new Backbone.Model({id: v, text: v});
                }
            }));
        },
        getopt: function(id) {
            return this.get('options').get(id.id || id);
        },
        parse: function(json) {
            // Upgrade options
            if(json.options != null && !json.options.models) {
                json.options = new Backbone.Collection(json.options);
            }
            // Upgrade value
            if(json.value != null && !json.value.models) {
                json.value = new Backbone.Collection(this.parseValue(json.value, json.options));
                json.value.on('all', this.onValueAll, this);
            }
            return json;
        },
        toJSON: function() {
            var json = _.clone(this.attributes);
            json.options = this.get('options').map(function(o) { return o.toJSON(); });
            json.value = this.get('value').map(function(o) { return o.toJSON(); });
            return json;            
        },
        onValueAll: function(eventName) {
            this.trigger('change:value', this);
            this.trigger('change', this);
        }
    }, {
        createFromElement: function(el) {
            var attr = $(el).getAllAttributes();
            var options = $(el).find('>*[value]').map(function(i, el) {
                return {id: $(el).attr('value'), text: $(el).html()};
            });
            return new klass({
                type: attr.type,
                name: attr.name,
                value: attr.value,
                enabled: attr.enabled == 'false' ? false : true
            });
        }
    });
    
    
    

    // ===============
    // = Collections =
    // ===============
    var Fields = Backbone.Collection.extend({
        model: function(attrs, options) {
            var Model;
            if(attrs.modeltype) 
                Model = modeltypes[attrs.modeltype];
            else
                Model = viewtypes[attrs.type].prototype.defaultmodel;
            
            options = options || {};
            options.parse = true;
            return new Model(attrs, options);    
        }
    });
    

    // ==========
    // = Mixins =
    // ==========
    var ErrorMessages = {
        showError: function(model, error) {
            var view = this.views[model.cid];
            var el = view.$el.parent().find('.error');
            if(el.length) 
                el.show().text(error.message);
            else {
                $('<div class="error"></div>').text(error.message).insertAfter(view.el);
                view.$el.parent().addClass('invalid');
            }
        },
        hideError: function(model) {
            var view = this.views[model.cid];
            view.$el.parent().find('.error').fadeOutFast();
            view.$el.parent().removeClass('invalid');
        }    
    };

    
    // =========
    // = Forms =
    // =========
    var Form = Backbone.View.extend({
        className: '',

        initialize: function(config) {
            _.bindAll(this, 'addOne', 'removeOne', 'propagateToModel', 'propagateToFields', 
                'onModelChange', 'onModelInvalid', 'onModelSync', 'onModelError');
            this.model = config.model || new Backbone.Model();
            this.views = {};
            this.fields = new Fields(config.fields);
            this.remoteValidate = config.remoteValidate;
            
            if(config.model) {
                _.each(config.model.attributes, function(v,k) {
                    var fieldmodel = this.fields.findWhere({name: k});
                    if(fieldmodel) {
                        fieldmodel.set('value', v);
                    }
                }, this);
            }
            
            this.listenTo(this.fields, {
                'add': this.addOne,
                'remove': this.removeOne,
                'change:value': this.propagateToModel,
                'invalid': this.onFieldInvalid});

            this.listenTo(this.model, {
                'change': this.propagateToFields,
                'invalid': this.onModelInvalid,
                'sync': this.onModelSync,
                'error': this.onModelError});
            
            if(this.remoteValidate)
                this.listenTo(this.model, 'change', this.onModelChange);
        },

        onFieldInvalid: function(model) {
            this.views[model.cid].$el.addClass('invalid');
        },

        onModelChange: function() {
            _.each(this.model.changedAttributes(), function(v,k) {
                var model = this.fields.findWhere({name: k});
                if(model)
                    this.remoteValidateOne(model);
            }, this);
        },
        onModelInvalid: function(model, error, resp) {
            _.each(error.errors || [], function(error) {
                var model = this.fields.findWhere({name: error.name});
                this.showError(model, error);
            }, this);
        },
        onModelSync: function(model, respdata, c) {
            // Hide all error messages if any
            if(c.headers && c.headers['X-Validate'] == 'single') {
                model = this.fields.findWhere({name: _.keys(c.attrs)[0]});
                this.hideError(model);
            }
            else {            
                _.each(model.changedAttributes(), function(val, name) {
                    var model = this.fields.findWhere({name: name});
                    if(model)
                        this.hideError(model);
                }, this);
            }
            
            // inspect result for certain magic keywords
            respdata = respdata || {};
            if(respdata.redirect)
                window.location.href = respdata.redirect;

        },
        onModelError: function(model, resp, options) {
            if(resp.status == 422) {
                resp = JSON.parse(resp.responseText);
                model.trigger('invalid', model, resp, resp);        
            }
        },

        remoteValidateOne: function(model) {
            (attr = {})[model.get('name')] = model.toJSON().value;
            this.model.save(null, {
                attrs: attr, 
                headers: {'X-Validate': 'single'}
            });
        },   
        render: function() {
            this.fields.each(function(field) {
                this.addOne(field);
            }, this);
            return this;
        },
        addOne: function(model) {
            // Implement in subclass
            // Example:
            // var view = new viewtypes[model.get('type')]({model: model});
            // this.views[model.cid] = view;
            // this.model.set(model.get('name'), model.get('value'));
            // this.$el.append(view.render().el)
        },
        removeOne: function(model) {
            // Implement in subclass
            // Example:
            // this.views[model.cid].remove();
        },
        showError: function(field, error) {
            // Implement in subclass
        },        
        hideError: function(field) {
            // Implement in subclass    
        },
                
        // Use this to change the model of an existing form.
        // Useful for a "row editing" form - a single form, and many models.
        changeModel: function(model) {
            // unbind any exising model before switching
            if(this.model) {
                this.model.off('change', this.propagateToFields);
                this.model.off('invalid', this.onInvalid);
                this.model.off('sync', this.onSync);
                this.model.off('error', this.onError);      
            }

            // Update all fields with new values
            this.fields.off('change', this.propagateToModel); // pause propagation to model
            this.fields.each(function(field) {
                var new_value = model.get(field.name);
                field.model.set('value', new_value);
            });
            this.fields.on('change:value', this.propagateToModel); // resume propagation to model

            
            // Set the new model
            this.model = model;
            model.on('change', this.propagateToFields);
            model.on('invalid', this.onInvalid);
            model.on('sync', this.onSync);
            model.on('error', this.onError);


        },        
        propagateToModel: function(field) {
            // field changes propagate to the model using field.get('name') as key.
            this.model.off('change', this.propagateToFields);
            this.model.set(field.get('name'), field.get('value'));
            this.model.on('change', this.propagateToFields);
        },
        propagateToFields: function(model) {
            // model change triggers field.set('value', newvalue), which in turn
            // refreshes the view
            this.fields.off('change:value', this.propagateToModel); // temporary stop propagation
            _.each(model.changedAttributes(), function(v, k) {
                var field = this.fields.findWhere({name: k});
                if(field) 
                    field.set('value', v);
            }, this);
            this.fields.on('change:value', this.propagateToModel); // resume
        },
        onSync: function() {
        },
        onInvalid: function() {
        },
        onError: function() {
        }
    });





    var SimpleForm = Form.extend({
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
            SimpleForm.__super__.initialize.call(this, config);
            this.metadata = config.metadata || {};
        },
        render: function() {
            this.$el.html(this.template());
            return SimpleForm.__super__.render.call(this);
        },
        addOne: function(model) {
            var view = new SimpleFormRow({
                model: model,
                metadata: this.metadata[model.get('name')] || {}
            });
            this.$('>ul').append(view.render().el);
            this.views[model.cid] = view;
            this.model.set(model.get('name'), model.get('value'), {silent: true});            
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
            this.model = config.model;
            this.metadata = config.metadata;
        },
        render: function() {
            if(this._fieldview) this._fieldview.remove();
            this.$el.html(this.template(this.metadata));
            if(!this.metadata.label)
                this.$('>.label').remove();

            // ..and append the field subview    
            this._fieldview = new viewtypes[this.model.get('type')]({model:this.model});
            this.$('>.field').append(this._fieldview.render().el);
            return this;
        }
    });




    /*
    Example
    -------
    // 1. Define a model
    var User = Backbone.Model.extend({
        defaults: {
            name: 'John Appleseed',
            address: ''
        },
        // Add some client-side validation
        validate: function(args, options) {
            var errors = [];
            if(!args.address) 
                errors.push({name: 'address', message: 'Enter your address'});
            return errors.length ? errors : null;
        },
        urlRoot: '/user'
    })

    // 2. Create the CustomForm
    var user = new User();
    var myform = new form.CustomForm({
        el: $('div.form'), 
        model: user,
    });
    myform.render();

    // 3. Add a click handler to the button
    $('button.submit').click(function() {
        user.save();
    })

    // 2. Create a CustomForm with existing fieldmodels
    // Render a bunch of existing fieldmodels into
    // the html layout of a CustomForm. You're creating the
    // fieldmodels elsewhere, and simply referencing them
    // in the template.
    
    var myform = new form.CustomForm({
        el: $('div.form'), 
        model: user,
        fields: [
            {id: 'foo', type:'combo', options: [....]},
            {id: 'bar', type: 'text'}
        ]
    });
    */
    var CustomForm = Form.extend({
        mixins: [ErrorMessages],
    
        initialize: function(config) {
            // Collect all fields
            if(!config.fields) {
                config.fields = [];
                this.$('*[name]').each(function() {
                    var div = $(this),
                        type = div.attr('type'),
                        modeltype = div.attr('modeltype');
                        Type = modeltype ? modeltype : viewtypes[type].prototype.defaultmodel;
                        if(_.isString(Type))
                            Type = modeltypes[Type];

                    var field = Type.createFromElement(this);
                    config.fields.push(field);
                });            
            }
            CustomForm.__super__.initialize.call(this, config);
        
            this.fields.each(function(model) {
                var el = this.$('div[name="'+model.get('name')+'"]'),
                    View = viewtypes[model.get('type')];
                view = new View({el:el, model:model});
                this.views[model.cid] = view;
                view.$el.attr(view.attributes || {});
                view.$el.addClass(view.className);
                view.render().delegateEvents();
            }, this);
        },    
        render: function() {
            return this;
        },
        removeOne: function(field) {
            this.views[field.cid].remove();
        }      
    });






    // ==========
    // = Fields =
    // ==========
    var Text = Backbone.View.extend({
        className: 'gui-text',
        attributes: {
            tabindex: 0, 
            contentEditable: true
        },
        events: {
            'keypress': 'onKeyPress',
            'focus': 'onFocus',
            'blur': 'onBlur'
        },
        hotkeys: {
            'keydown return': 'onReturnKeyDown',
            'keydown left': 'onLeftKeyDown',
            'keydown right': 'onRightKeyDown'
        },
        defaultmodel: StringModel,
    
        initialize: function(config) {
            config = config || {};
            this.model = config.model || new (_.pop(config, 'modeltype') || this.defaultmodel)(config);
            this.listenTo(this.model, 'change', this.render, this);
            if($.browser.ltie9)
                this.$el.iefocus();
        },
        render: function() {
            var renderer = this.model.get('renderer'),
                name = this.model.get('name'),
                html = renderer ? renderer(this) : this.model.getFormattedValue();

            this.$el.attr('name', name).html(html);
            this.$el.toggleClass('invalid', !!this.model.validationError);
            this.$el.toggleClass('gui-disabled', !this.model.get('enabled'));
            return this;
        },

        // ===================
        // = Field interface =
        // ===================
        focus: function() {
            this.$el.moveCursorToEnd();
            this.$el.selectAll();
        },
        wrapElement: function(el) {
            // Attach this View on the given el
            this._orig_el = this.el;
            this._orig_attr = $(el).getAllAttributes();
            this.setElement(el);
            this.delegateEvents();
            $(el).attr(this.attributes);
            this.$el.removeClass('gui-text');
        },
        unwrapElement: function() {
            // Detach this View from its currently wrapped element
            this.$el.removeAttr('tabindex');
            this.$el.removeAttr('contenteditable');
        },
        
        
        onFocus: function(e) {
            var keydown = base._keyDownEvent;
            if(keydown && keydown.which == base.keys.TAB) {
                this.focus();
            }
        },     
        onBlur: function(e) {
            var text = this.$el.getPreText(),
                wasInvalid = !!this.model.validationError;

            this.model.set({'value': text}, {validate: true});


            if(wasInvalid && !this.model.validationError)
                // there is a small change the new value above is the same as
                // before making it invalid, not triggering change -> render.
                this.render();

            this.trigger('fieldblur');
        },
        onReturnKeyDown: function(e) {        
            // Set value immediately when pressing Return, as the event
            // may continue upwards to a form, triggering a submit.
            var v = this.$el.getPreText();
            this.model.set('value', v);
            // Don't allow newlines in a text field
            e.preventDefault();
        },
        onKeyPress: function(e) {
            // On eg future numeric textfield, type is supposed to only 
            // trigger when hitting an allowed key.
            this.trigger('type', {e: e, character: String.fromCharCode(e.which)});
        },
        onRightKeyDown: function(e) {
            var curr = $.Range.current(),
                end = curr.end();
            if(curr.range.collapsed && end.offset == end.container.length)
                e.preventDefault(); // prevent page from scrolling right
        },
        onLeftKeyDown: function(e) {
            var curr = $.Range.current();
            if(curr.range.collapsed && curr.start().offset == 0)
                e.preventDefault(); // prevent page from scrolling left
        }        
        
    });


    var Hidden = Backbone.View.extend({
        className: 'gui-hidden',
        defaultmodel: StringModel,
    
        initialize: function(config) {
            config = config || {};
            this.model = config.model || new (_.pop(config, 'modeltype') || this.defaultmodel)(config);
        },
        render: function() {
            this.$el.attr('name', name);
            return this;
        },

        // ===================
        // = Field interface =
        // ===================
        focus: function() {
        },
        wrapElement: function(el) {
        },
        unwrapElement: function() {
        }
    });


    var Password = Text.extend({
        className: 'gui-password'
    });

    var TextArea = Text.extend({
        className: 'gui-textarea',
        hotkeys: {
            'keydown return': 'onReturnKeyDown'
        },
        attributes: {   // <---- TODO: If not repeated here, className:'gui-textarea' is set on form.Text as well
            tabindex: 0, 
            contentEditable: true
        },
        mixins: [base.ChildView],
    
        interpret: function(htmlvalue) {
            // Downgrade. Convert the html to plain text with newlines        
            var el = $('<div></div>').append(htmlvalue);        
            // Webkit produces:
            //     foo
            //     <div>bar</div>
            //     <div>fep</div>
            // Wrap the first textnode in a div as well.
            if($.browser.chrome || $.browser.webkit) {
                var contents = el.contents();
                if(contents.length && contents[0].nodeType == 3) {
                    $(contents[0]).replaceWith('<div>'+contents[0].nodeValue+'</div>');
                }
            }
            var text = el.getPreText(); 
            return text;
        },
        wrapElement: function(el) {
            this._orig_el = this.el;
            this._orig_attr = $(el).getAllAttributes();
            this.setElement(el);
            this.delegateEvents();
            $(el).attr(this.attributes);
            this.$el.removeClass('textarea');
        },
        unwrapElement: function() {
            this.$el.removeAttr('tabindex');
            this.$el.removeAttr('contenteditable');
        },         
        onFocus: function(e) {
            if(this.$el.is('.empty'))
                this.$el.removeClass('empty').html('');
        },
        onReturnKeyDown: function(e) {
            e.stopPropagation();
        }
    });




    // =========
    // = Combo =
    // =========
    /*
    <div class="gui-combo">
        <span>Some text</span>
        <button></button>
    </div>
    
    */
    var Combo = Backbone.View.extend({
        className: 'gui-combo',
        attributes: {
            tabindex: 0
        },
        template: _.template(''+
            '<span><%= text || "&nbsp;" %></span>'+
            '<button tabindex="-1"></button>'
        ),
        events: {
            'mousedown': 'onMouseDown',
            'keydown': 'onKeyDown',
            'blur': 'onBlur',
            'focus': 'onFocus'
        },
        hotkeys: {
            'keydown down': 'onDownKeyDown'
        },
        defaultmodel: SelectionModel,
    
        initialize: function(config) {       
            config = config || {};
            _.bindAll(this, 'onMenuChoose', 'onMenuHide');
            this.model = config.model || new (_.pop(config, 'modeltype') || this.defaultmodel)(config, {parse:true});
            this.listenTo(this.model, 'change', this.render, this);

            // Create the dropdown menu
            // TODO: could we avoid serializing the Collection here? Or is that wrong?
            this.menu = new menu.Menu({
                options: this.model.get('options').map(function(o) {
                    // return {id: o.id, text: o.get('text')};
                    if(_.isObject(o))
                        return _.clone(o.attributes);
                    return o;
                })
            });
            this.menu.selectable.on('choose', this.onMenuChoose);
            this.menu.on('hide', this.onMenuHide);            
            this.menu.render();
        },        
        render: function() {
            var first = this.model.get('value').at(0);
            var text = first ? this.model.getopt(first.id).get('text') : '';
            this.$el.attr('name', this.model.get('name'));
            this.$el.html(this.template({text: text}));
        
            if($.browser.ltie9) {
                this.$el.iefocus();
                this.$('*').add(this.el).attr('unselectable', 'on');
            }
            return this;
        },
        focus: function() {
            this.$el.focus();
        },
        showMenu: function() {
            if(this.menu.$el.is(':visible'))
                return;
            var body = $(this.el.ownerDocument.body),
                w = $(this.el).outerWidth();
            this.menu.$el.appendTo(body).css('min-width', w);
            this.menu.show().alignTo(this.el);
        },
        onMouseDown: function(e) {
            this.showMenu();
            e.stopPropagation();
            e.preventDefault();
        },
        onMenuChoose: function(e) {
            var option = e.model;
            var id = option.get('id');

            this.model.get('value').set([this.model.getopt(id)]);
        },
        onMenuHide: function() {
            this.focus();
        },
        onDownKeyDown: function(e) {
            this.showMenu();
            e.preventDefault();
        },
        onBlur: function() {
            setTimeout($.proxy(function() { 
                var a = document.activeElement;
                if(a !== this.el && a !== this.menu.el) {
                    this.trigger('fieldblur', this);
                }
            },this), 1); // short delay for webkit
        }    
    });


    var Checkbox = Backbone.View.extend({
        className: 'gui-checkbox',
        events: {
            'click': 'onClick'
        },
        hotkeys: {
            'keydown space': 'onSpaceKeyDown',
            'keyup space': 'onClick'
        },
        attributes: {
            tabindex: 0
        },
        defaultmodel: BoolModel,
    
        initialize: function(config)  {
            this.model = config.model || new (_.pop(config, 'modeltype') || this.defaultmodel)(config);
            this.listenTo(this.model, 'change', this.render, this);

            this.$el.html('<i>&#xe0fe;</i>');
            this.$el.attr(this.attributes || {}).addClass(this.className);
        },
        render: function() {
            this.$el.toggleClass('gui-checked', this.model.get('value'));
            this.$el.html(this.model.get('text') || '');
            this.$el.attr('name', this.model.get('name'));
            
            return this;
        },
        onClick: function(e) {             
            e.preventDefault();
            // Todo: try to do this instead:
            // events: {'click :not(:inside(.gui-disabled))': 'onClick'}
            if(this.$el.is(':inside(.gui-disabled)'))
                return;

            this.model.set('value', !this.model.get('value'));
            this.$el.removeClass('active');
        },
        onSpaceKeyDown: function(e) {
            this.$el.addClass('active');
            e.preventDefault();
        }
    });





    var CheckboxGroup = Backbone.View.extend({
        tagName: 'ul',
        className: 'gui-checkboxgroup',
        defaultmodel: SelectionModel,
    
        initialize: function(config)  {
            _.bindAll(this, 'onCheckboxValueChange');
            config = config || {};
            this.model = config.model || new (_.pop(config, 'modeltype') || this.defaultmodel)(config, {parse:true});

            this.views = {};
            this.listenTo(this.model, 'change', this.render, this);
        },
        render: function() {
            this.$el.empty().attr('name', this.model.get('name'));
            this.model.get('options').each(function(model) {
                this.addOne(model);
            }, this);
            return this;
        },
        addOne: function(model) {
            if(!this.views[model.cid]) {
                this.views[model.cid] = new Checkbox({id: model.id, text: model.get('text')});
                this.listenTo(this.views[model.cid].model, 'change:value', this.onCheckboxValueChange);
            }
            var view = this.views[model.cid],    
                isAdded = !!this.model.get('value').get(model.id);
            view.model.set('value', isAdded, {silent: true});
            
            var li = $('<li></li>').append(view.render().el);
            view.delegateEvents();
            this.$el.append(li);
        },
        removeOne: function(model) {
            _.pop(this.views, model.cid).remove();
        },
        onCheckboxValueChange: function(model) {
            var checked = model.get('value');
            this.model.get('value')[checked ? 'add':'remove'](model);
        }
    });


    var Radio = Checkbox.extend({
        className: 'gui-radio',
        initialize: function(config)  {
            this.model = config.model || new (_.pop(config, 'modeltype') || this.defaultmodel)(config);
            this.listenTo(this.model, 'change', this.render, this);

            this.$el.html('<i>&middot;</i>');
            this.$el.attr(this.attributes || {}).addClass(this.className);
        },
        onClick: function(e) {             
            e.preventDefault();
            // if(this.$el.is(':inside(.gui-disabled)'))
            if(this.$el.closest('.gui-disabled')[0])
                return;
            this.model.set('value', true);
            this.$el.removeClass('active');
        }
    });




    var RadioGroup = Backbone.View.extend({
        tagName: 'ul',
        className: 'gui-radiogroup',
        defaultmodel: SelectionModel,
    
        initialize: function(config)  {
            _.bindAll(this, 'onRadioValueChange');
            config = config || {};
            this.model = config.model || new (_.pop(config, 'modeltype') || this.defaultmodel)(config, {parse:true});

            this.views = {};
            this.listenTo(this.model, 'change', this.render, this);
        },
        render: function() {
            this.$el.empty().attr('name', this.model.get('name'));
            this.model.get('options').each(function(model) {
                this.addOne(model);
            }, this);
            return this;
        },
        addOne: function(model) {
            if(!this.views[model.cid]) {
                this.views[model.cid] = new Radio({id: model.id, text: model.get('text')});
                this.listenTo(this.views[model.cid].model, 'change:value', this.onRadioValueChange);
            }
            var view = this.views[model.cid],    
                isAdded = !!this.model.get('value').get(model.id);
            view.model.set('value', isAdded, {silent: true});
            
            var li = $('<li></li>').append(view.render().el);
            view.delegateEvents();
            this.$el.append(li);
        },
        removeOne: function(model) {
            _.pop(this.views, model.cid).remove();
        },
        onModelChange: function(model) {
            // I WAS HERE
            // var selected = this.model.get('value').at(0)
        },
        onRadioValueChange: function(model) {
            var checked = model.get('value');
            if(checked) {
                this.model.get('value').set(model);
            }
        }
    });


    var Date = Backbone.View.extend({
        className: 'gui-date',
        events: {
            'keydown': 'onKeyDown',
            'click button.calendar': 'showDatePicker'
        },
        hotkeys: {
            'keydown esc': 'onEscKeyDown',
            'keydown down': 'onDownKeyDown'
        },
        defaultmodel: DateTimeModel,
    
        initialize: function(config)  {
            config = config || {};
            this.model = config.model || new (_.pop(config, 'modeltype') || this.defaultmodel)(config, {parse:true});
            // Pass this.model into the textfield
            this.textfield = new Text({model: this.model, modeltype: DateTimeModel});

            this.$el.append('<button class="calendar" tabindex="-1"></button>');
            this.$el.append(this.textfield.el);            
            this.listenTo(this.model, 'change:value', this.onModelChange, this);
        },
        render: function() {
            this.textfield.render();
            this.$el.toggleClass('gui-disabled', !this.model.get('enabled'));            
            return this;
        },
        onModelChange: function() {
            this.hideDatePicker();
        },
        getDatePicker: function() {
            // Lazy-create a DatePicker 
            if(!this.datepicker) {
                this.datepicker = new DatePicker({ 
                    model: this.model
                });
                var body = this.el.ownerDocument.body;
                
                this.datepicker.alignTo(this.$('button.calendar'), {my: 'left top', at: 'left bottom'});   

                this.datepicker.$el.on('keydown', _.bind(this.onDatePickerKeyDown, this));
                this.datepicker.$el.on('blur', _.bind(this.hideDatePicker, this));
                // $(body).append(this.datepicker.el);
            }
            return this.datepicker;
        },
        showDatePicker: function() {
            var datepicker = this.getDatePicker(),
                body = this.el.ownerDocument.body;
            
            datepicker.render().$el.appendTo(body).css('opacity', 1).show().focus();
            datepicker.alignTo(this.$('button.calendar'), {my: 'left top', at: 'left bottom'});   
        },
        hideDatePicker: function() {
            if(this.datepicker) {
                this.datepicker.$el.fadeOutFast({detach:true});
                this.focus();
            }
        },        
        focus: function(e) {
            this.textfield.focus();
            this.textfield.el.focus();
        },
        wrapElement: function(el) {
            // Store the orignal dumb el
            this._orig_el = $(el).clone();
            this.setElement(el);
            this.render();
            this.delegateEvents();
            this.$el.attr(this.attributes);
        },
        unwrapElement: function() {
            this.$el.replaceWith(this._orig_el);
        },     
        onEscKeyDown: function(e) {
            this.hideDatePicker();
        },
        onDownKeyDown: function(e) {
            this.showDatePicker();
            e.preventDefault();
            e.stopPropagation();            
        },
        onDatePickerKeyDown: function(e) {
            if(e.keyCode == base.keys.ESC)
                this.hideDatePicker();
        }
    });



    var DatePicker = Backbone.View.extend({
        className: 'gui-datepicker',
        events: {
            'mouseenter tbody td.day': 'onMouseEnterDay',
            'keydown': 'onKeyDown',
            'click .day': 'onClickDay'
        },
        attributes: {
            tabindex: 0
        },
        defaultmodel: DateTimeModel,
    
        initialize: function(config)  {
            config = config || {};
            this.model = config.model || new (_.pop(config, 'modeltype') || this.defaultmodel)(config, {parse:true});
            
            this.calendar = new calendar.MonthCalendar({date: this.model.get('value')});
            this.$el.append(this.calendar.render().el);
            this.listenTo(this.model, 'change:value', this.onModelChange, this);
        },
        render: function() {
            var date = moment(this.model.get('value'));
            if(date) {
                this.calendar.$('.day[data-ymd="'+date.format('YYYY-MM-DD')+'"]').addClass('selected');
            }
            
            return this;
        },
        alignTo: function(el, options) {
            options = _.defs(options, {
                my: 'left top',
                at: 'right top',
                of: el,
                collision: 'flip fit',
                within: window
            });
            this.$el.position(options);
            return this.$el;
        },
        onModelChange: function(model) {
            this.calendar.model.set('date', model.get('value'));
            this.render();
        },        
        onMouseEnterDay: function(e) {
            this.$('.selected').removeClass('selected');
            $(e.target).closest('td').addClass('selected');
        },
        onKeyDown: function(e) {
            // Support keyboard navigation for selecting a day
            var curr = this.$('.selected');
            if(!curr[0]) curr = this.$('.today');
            if(!curr[0]) curr = this.$('.day:first');        
        
            var tr = curr.parents('tr:first'),
                select,
                keys = base.keys,
                key = e.keyCode,
                arrows = [keys.LEFT, keys.RIGHT, keys.UP, keys.DOWN];
        
            if(key == keys.RIGHT) {
                select = curr.nextAll('td:first');
            } else if(key == keys.LEFT) {
                select = curr.prevAll('td:first');
            } else if(key == keys.UP && tr.prev()[0]) {
                select = tr.prev().find('td:nth-child('+(curr.index()+1)+')');
            } else if(key == keys.DOWN && tr.next()[0]) {
                select = tr.next().find('td:nth-child('+(curr.index()+1)+')');
            } else if(key == keys.ENTER) {
                this.model.set('value', curr.attr('data-ymd'));
                e.preventDefault();
            }
            if(_.indexOf(arrows, key) !== -1) 
                e.preventDefault();
        
            if(select && select.hasClass('day')) {
                curr.removeClass('selected');
                select.addClass('selected');
            }
        },
        onClickDay: function(e) {
            var el = $(e.currentTarget);
            if(el[0]) {
                this.model.set('value', el.attr('data-ymd'));
            }
        }
    });


    var viewtypes = {
        text: Text,
        password: Password,
        hidden: Hidden,
        textarea: TextArea,
        combo: Combo,
        date: Date,        
        datepicker: DatePicker,
        checkbox: Checkbox,
        checkboxgroup: CheckboxGroup,
        radiogroup: RadioGroup
    };
    var modeltypes = {
        bool: BoolModel,
        string: StringModel,
        number: NumberModel,
        datetime: DateTimeModel,
        selection: SelectionModel,
        model: ModelModel
    };





    var exp = {
        // Form views
        Form: Form,
        SimpleForm: SimpleForm,
        CustomForm: CustomForm,
        
        // Field views
        Text: Text,
        Password: Password,
        Hidden: Hidden,
        TextArea: TextArea,
        Combo: Combo,
        Date: Date,
        DatePicker: DatePicker,
        Checkbox: Checkbox,
        Radio: Radio,        
        CheckboxGroup: CheckboxGroup,
        RadioGroup: RadioGroup,


        // Models
        BoolModel: BoolModel,
        StringModel: StringModel,
        NumberModel: NumberModel,
        DateTimeModel: DateTimeModel,
        SelectionModel: SelectionModel,
        ModelModel: ModelModel,
        
        // maps
        viewtypes: viewtypes,
        modeltypes: modeltypes
    };

    return exp;



});