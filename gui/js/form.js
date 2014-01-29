define([
    'jquery', 
    'underscore',
    'backbone',
    'globalize/globalize',
    'moment',

    'gui/base',
    'gui/calendar',
    'gui/menu',
    'gui/tools',    
    'gui/traits',        
], function($, _, Backbone, Globalize, moment, base, calendar, menu, tools, traits) {






    /*
    Utility function for creating a Field instance from
    a DOM element.
    */
    // function createFromElement(klass, el) {
    //     var attr = $(el).getAllAttributes();
    //     $(el).attr(klass.prototype.attributes || {});
    //     $(el).addClass(klass.prototype.className);
    //     return new klass({
    //         el: el,
    //         name: attr.name,
    //         value: attr.value,
    //         required: attr.required
    //     },{parse: true});
    // }


    // =========
    // = utils =
    // =========
    var attackElement = function(el) {
        // Insert my element after the attacked element
        var el = $(el)
        this.$el.insertAfter(el);
        // Detach the attacked element
        el.detach();
        
        this._detachedEl = el;
        this.$el.addClass(el[0].className)
    };
    var leaveElement = function() {
        // restore this.el to what it looked like before
        // attacking it.  
        this._detachedEl.html(this.model.getValue());
        this._detachedEl.insertBefore(this.el);
        this.$el.detach();
    };



    // ==========
    // = Models =
    // ==========
    var FieldModel = traits.Model.extend({
        traits: {
            type: new traits.String(),
            enabled: new traits.Bool(),
        },
        defaults: {
            type: null,
            value: null,            
            enabled: true,
            format: ''
        },
        merge: ['defaults', 'traits'],        
        
        format: function(value) {
            return value;
        },
        getValue: function() {
            return this.get('value')
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
                id: attr.name,
                type: attr.type,
                value: attr.value || $(el).html(),
                enabled: attr.enabled == 'false' ? false : true,
                // Todo: move format up
                format: attr.format
            });
        }
    });
    
    var BoolModel = FieldModel.extend({      
        traits: {
            value: new traits.Bool()
        }
    });

    var StringModel = FieldModel.extend({      
        traits: {
            value: new traits.String()
        }
    });

    var NumberModel = FieldModel.extend({      
        traits: {
            value: new traits.Number(),
            format: new traits.String()
        },
        defaults: {
            format: 'n'
        },
        
        format: function(value) {
            return Globalize.format(value || '', this.get('format'));            
        }
    });

    
    var DateModel = FieldModel.extend({
        /* Does not know about time and time zones */
        traits: {
            value: new traits.Date(),
            format: new traits.String()            
        },
        defaults: {
            format: 'd'
        },
        
        format: function(value) {
            return Globalize.format(value || '', this.get('format'));            
        },
        getValue: function() {
            var val = this.get('value');
            if(val)
                return this.traits.value.toJSON(this.get('value'));
        }
    });

    var DateTimeModel = FieldModel.extend({
        traits: {
            value: new traits.DateTime(),
            format: new traits.String()            
        },
        defaults: {
            format: 'd'
        },
        
        format: function(value) {
            return Globalize.format(value || '', this.get('format'));            
        },
        getValue: function() {
            return this.traits.value.toJSON(this.get('value'));
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
        // traits: function() {
        //     var options = new traits.Collection();
        //     return {
        //         options: options, 
        //         value: new traits.Subset({source: 'options'})
        //     };
        // },
        traits: {
            options: new traits.Collection(),
            value: new traits.Subset({source: 'options'})
        },

        getValue: function() {
            var val = this.get('value');
            if(val)
                return val.pluck('id');
        },
    });



    var TokenStringModel = FieldModel.extend({
        traits: {
            tokens: new traits.Collection(),
            value: new traits.TokenString({source: 'tokens'})
        },
        getValue: function() {
            return this.get('value')
        }        

    })


    var SingleSelectionModel = FieldModel.extend({
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
        // traits: function() {
        //     var options = new traits.Collection();
        //     return {
        //         options: options,
        //         value: new traits.Subset({source: options})
        //     }
        // },
        traits: {
            options: new traits.Collection(),
            value: new traits.Subset({source: 'options'})
        },
        getValue: function() {
            var val = this.get('value');
            if(val && val.models.length)
                return val.models[0].id
        }
    },{
        createFromElement: function(el) {
            /* Construct a model from attributes and possibly child <br/>
            elements of `el` */

            var attr = $(el).getAllAttributes();
            // console.log('IM HERE: ', eval(attr.options))            
            var aa = new this({
                id: attr.name,
                options: attr.options ? eval(attr.options) : null,
                type: attr.type,
                // value: attr.value,
                enabled: attr.enabled == 'false' ? false : true,
                // Todo: move format up
                // options: new Backbone.Collection(eval(attr.options)),
                // format: attr.format
            });
            
            // aa.get('options').reset(eval(attr.options))
            // if(attr.value)
            //     aa.set('value', attr.value)
            // 
            // 
            // debugger
            return aa
        }
    });
    window.SingleSelectionModel = SingleSelectionModel

    var ModelModel = FieldModel.extend({
        /*
        Underlying model for a complex field.
        Has the ususal properties like .name, .type, .enabled, etc
        But its .value is not a scalar but is itself a model.

        var CoolFieldModel = Backbone.Model.extend({});

        var MyCoolField = Backbone.View.extend({
            defaultmodel: form.ModelModel(CoolFieldModel)
        });


        // Create a ModelModel
        var MyModelModel = ModelModel(CoolFieldModel)
        var foo = new MyModelModel()
        foo.set('value', {foo: 123, bar: 456});

        */        
        constructor: function() {
            if (this && this instanceof Backbone.Model) {
                Backbone.Model.prototype.constructor.apply(this, arguments);            
            }
            else {
                return ModelModel.extend({
                    valuemodel: arguments[0] || Backbone.Model
                });
            }
        },
        // UPDATE: defaults is run in initcls before an instance is created
        // (due to merge: ['defaults', ..] in FieldModel above)
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
            }, this))
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
            // console.log('this.attributes', json.value);
            var json = _.clone(this.attributes);

            // json.value = json.value.toJSON();
            return json;
        }
        
    });
    


    // ========
    // = Form =
    // ========
    var Fields = Backbone.Collection.extend({
        model: function(attrs, options) {
            var Model;
            if(attrs.modeltype) {
                Model = modeltypes[attrs.modeltype];
            }
            else {
                if(!viewtypes[attrs.type])
                    throw new Error('"'+attrs.type+'" is not found in form.viewtypes.')
                Model = viewtypes[attrs.type].prototype.defaultmodel;
            }
            
            options = options || {};
            options.parse = true;
            return new Model(attrs, options);    
        }
    });
    
    

    var Form = Backbone.Model.extend({
        /**
        var f = new Form({
            fields: [
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
            _.bindAll(this, 'onFieldChange', 'onFieldInvalid', 'onValuesChange', 
                     'onValuesInvalid');
            this.fields = new Fields(config.fields);
            this.values = base.modelify(config.values);
                        
            _.each(this.values.attributes, function(v,k) {
                var fieldmodel = this.fields.get(k);
                if(fieldmodel)
                    fieldmodel.set('value', v);
            }, this);
            
            
            this.listenTo(this.fields, {
                'change:value': this.onFieldChange,
                'invalid': this.onFieldInvalid});

            this.listenTo(this.values, {
                'change': this.onValuesChange,
                'invalid': this.oValuesInvalid});
        },
                
        onFieldChange: function(field) {
            // field changes propagate to the model using field.get('name') as key.
            this.values.off('change', this.onValuesChange);
            // this.values.set(field.id, field.get('value'));
            this.values.set(field.id, field.getValue());            
            this.values.on('change', this.onValuesChange);
        },
        onValuesChange: function(model) {
            // model change triggers field.set('value', newvalue), which in turn
            // refreshes the view
            this.fields.off('change:value', this.onFieldChange); // temporary stop propagation
            this.values.off('change', this.onValuesChange);
            _.each(model.changedAttributes(), function(v, k) {
                var field = this.fields.get(k);
                if(field) {
                    field.set('value', v);
                    this.values.set(k, field.getValue()) // {silent:true}
                }
            }, this);
            this.values.on('change', this.onValuesChange);
            this.fields.on('change:value', this.onFieldChange); // resume
        },
        onFieldInvalid: function(model, error) {
            this.trigger('showerror', model, error);
        },
        onValuesInvalid: function(model, error, resp) {
            _.each(error.errors || [], function(error) {
                var model = this.fields.get(error.name);
                this.trigger('showerror', model, error);
            }, this);
        },
    });

    

    
    // =========
    // = Views =
    // =========
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
                this.$el.on('mousedown', _.bind(this.onIEMouseDown, this));
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
            if(this.$el.closest('.gui-disabled')[0]) 
                return; // ie7/8
            this.$el.moveCursorToEnd();
            this.$el.selectAll();
        },
        attackElement: attackElement,
        leaveElement: leaveElement,

                
        onFocus: function(e) {
            var keydown = base._keyDownEvent;
            if(keydown && keydown.which == base.keys.TAB) {
                this.focus();
            }
        },     
        onBlur: function(e) {
            var text = this.$el.getPreText(),
                wasInvalid = !!this.model.validationError;

            console.log('BLUR: ', text)
            this.model.set({'value': text}, {validate: true});
            if(wasInvalid && !this.model.validationError)
                // there is a small change the new value above is the same as
                // before making it invalid, not triggering change -> render.
                this.render();

            this.trigger('fieldblur');
            this.$el.trigger('fieldblur');
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
            // UPDATE: See onLeftKeyDown
            // var curr = $.Range.current(),
            //     end = curr.end();
            // if(curr.range.collapsed && end.offset == end.container.length)
            //     e.preventDefault(); // prevent page from scrolling right
        },
        onLeftKeyDown: function(e) {
            // UPDATE: this prevents the cursor from moving to the last char of 
            // the previous row.
            // var curr = $.Range.current();
            // if(curr.range.collapsed && curr.start().offset == 0)
            //     e.preventDefault(); // prevent page from scrolling left
        },
        onIEMouseDown: function(e) {
            if(this.$el.closest('.gui-disabled').length) {
                e.preventDefault(); // don't focus
                var focusable = this.$el.parent().closest('*:focusable');
                window.setTimeout(function() { focusable.focus(); }, 1); 
            }
        }
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
        merge: ['hotkeys'],

        render: function() {
            var renderer = this.model.get('renderer'),
                name = this.model.get('name'),
                html = renderer ? renderer(this) : this.model.getFormattedValue();

            this.$el.attr('name', name).html(base.makePreText(html || ''));
            this.$el.toggleClass('invalid', !!this.model.validationError);
            this.$el.toggleClass('gui-disabled', !this.model.get('enabled'));
            return this;
        },
        onFocus: function(e) {
            if(this.$el.is('.empty'))
                this.$el.removeClass('empty').html('');
        },
        onBlur: function(e) {
            var el = $('<div></div>').append(this.$el.html());        
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
            
            var text = el.getPreText(),
                wasInvalid = !!this.model.validationError;
            // Remove exactly 1 leading newline
            text = text.replace(/\n/, '')
            console.log('TEXT: ', text)
            this.model.set({'value': text}, {validate: true});
            if(wasInvalid && !this.model.validationError)
                // there is a small change the new value above is the same as
                // before making it invalid, not triggering change -> render.
                this.render();
            this.trigger('fieldblur');
            this.$el.trigger('fieldblur');
        },        

        attackElement: attackElement,
        leaveElement: leaveElement,
                
        onReturnKeyDown: function(e) {
            e.stopPropagation();
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
        attackElement: function(el) {
            $(el).attr(this.attributes || {});
            $(el).addClass(this.className);
            this.setElement(el);
        },
        leaveElement: function() {
        }
    });



    var Checkbox = Backbone.View.extend({
        className: 'gui-checkbox',
        events: {
            'click': 'onClick',
            'selectstart': 'onSelectStart',
            'mousedown': 'onMouseDown'
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
            this.listenTo(this.model, 'change:value', this.onModelChange, this);
            if(config.el) {
                this.$el.attr(this.attributes || {});
                this.$el.addClass(this.className);                
            }
        },
        render: function() {
            this.$el.toggleClass('gui-checked', this.model.get('value'));
            this.$el.html(this.model.get('text') || '');
            this.$el.attr('name', this.model.get('name'));
            // this.el.hideFocus = true;
            
            console.log('render: ', this.el)
            return this;
        },
        attackElement: attackElement,
        leaveElement: leaveElement,
        onModelChange: function(model) {
            this.$el.toggleClass('gui-checked', model.get('value'));            
        },
        onClick: function(e) {             
            e.preventDefault();
            if(this.$el.closest('.gui-disabled').length) {
                e.preventDefault(); // don't focus
                return;
            }

            this.model.set('value', !this.model.get('value'));
            this.$el.removeClass('active');
        },
        onSpaceKeyDown: function(e) {
            this.$el.addClass('active');
            e.preventDefault();
        },
        onSelectStart: function(e) {
            e.preventDefault();
        },
        onMouseDown: function(e) {
            if(!this.$el.closest('.gui-disabled')[0]) {
                this.$el.addClass('active');
            }
        }
    });

    var Radio = Checkbox.extend({
        className: 'gui-radio',
        initialize: function(config)  {
            this.model = config.model || new (_.pop(config, 'modeltype') || this.defaultmodel)(config);
            this.listenTo(this.model, 'change:value', this.onModelChange, this);
            this.$el.attr(this.attributes || {}).addClass(this.className);
        },
        onClick: function(e) {             
            e.preventDefault();
            if(this.$el.closest('.gui-disabled')[0])
                return;
            this.model.set('value', true);
            this.$el.removeClass('active');
        }
    });


    var CheckboxGroup = Backbone.View.extend({
        tagName: 'ul',
        className: 'gui-checkboxgroup',
        defaultmodel: SelectionModel,
    
        initialize: function(config)  {
            _.bindAll(this, 'onCheckboxValueChange', 'render');
            config = config || {};
            this.model = config.model || new (_.pop(config, 'modeltype') || this.defaultmodel)(config, {parse:true});

            this.views = {};
            this.listenTo(this.model, 'change', this.render);
            this.listenTo(this.model.get('options'), 'all', this.render);
            this.listenTo(this.model.get('value'), 'all', this.render);
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
                this.views[model.cid] = new Checkbox({model: model});
                this.listenTo(model, 'change:value', this.onCheckboxValueChange);
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
        attackElement: attackElement,
        leaveElement: leaveElement,
        onCheckboxValueChange: function(model) {
            var checked = model.get('value');
            this.model.get('value')[checked ? 'add':'remove'](model);
        }
    });





    var RadioGroup = Backbone.View.extend({
        tagName: 'ul',
        className: 'gui-radiogroup',
        // Todo: Write a SingleSelectionModel
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
                this.views[model.cid] = new Radio({model: model});                
                this.listenTo(model, 'change:value', this.onRadioValueChange);
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
        attackElement: attackElement,
        leaveElement: leaveElement,
        onRadioValueChange: function(model) {
            var checked = model.get('value');
            if(checked) {
                // Unselect current radio, if any
                var curr = this.model.get('value').at(0)
                if(curr)
                    curr.set('value', false);
                // Update the selection. Todo: finish the singleselectionmodel
                this.model.get('value').set(model);
            }
        }
    });    




  

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
        defaultmodel: SingleSelectionModel,
    
        initialize: function(config) {       
            config = config || {};
            _.bindAll(this, 'onMenuChoose', 'onMenuHide');
            this.model = config.model || new (_.pop(config, 'modeltype') || this.defaultmodel)(config, {parse:true});
            this.listenTo(this.model, 'change', this.render, this);
            this.listenTo(this.model.get('value'), 'reset', this.render, this);
            

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
            this.$el.attr('name', this.model.get('name'));
            
            var first = this.model.get('value').at(0);
            var text = first ? first.get('text') : '';            
            this.$el.html(this.template({text: text}));
        
            if($.browser.ltie9) {
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
        attackElement: attackElement,
        leaveElement: leaveElement,
        
        onMouseDown: function(e) {
            if(this.$el.closest('.gui-disabled').length) {
                e.preventDefault(); // don't focus
                return;
            }
            this.showMenu();
            // this.menu.el.focus();
            e.stopPropagation();
            e.preventDefault();
        },
        onMenuChoose: function(e) {
            // var option = e.model;
            // var id = option.get('id');
            this.model.get('value').reset([e.model]);
            
            // this.model.set({'value': text}, {validate: true});
            this.model.trigger('change:value', this.model)
        },
        onMenuHide: function() {
            this.focus();
        },
        onDownKeyDown: function(e) {
            this.showMenu();
            this.menu.el.focus();
            e.preventDefault();
        },
        onBlur: function() {
            setTimeout($.proxy(function() { 
                var a = document.activeElement;
                if(a !== this.el && a !== this.menu.el) {
                    this.trigger('fieldblur', this);
                    this.$el.trigger('fieldblur');
                }
            },this), 1); // short delay for webkit
        }    
    });


  
    
    var Subform = Backbone.View.extend({
        /*
        This is a Field wrapping an entire Quickform.
        */
        className: 'gui-subform',
        
        // Todo: Create SuboformModel extending ModelModel adding a "fields" trait. 
        // Otherwise they are identical.
        defaultmodel: ModelModel(),
    
        initialize: function(config) {
            config = config || {};
            this.model = config.model || new (_.pop(config, 'modeltype') || this.defaultmodel)(config);
            
            this.listenTo(this.model, 'change:value', this.onChangeValue, this);

            var quickform = new Quickform({
                fields: this.model.get('fields'),
                values: this.model.get('value')
            });
                        
            this.quickform = quickform;     
        },
        render: function() {
            // console.log('RENDER SUBFORM: ', this.model.get('value').attributes)
            // this.
            // this.quickform.form.set('values', this.model.get('values'))
            // this.$el.attr('name', this.model.get('name'));
            
            // ..well, I want to create a Form where its <Form>.model is the exact same
            // object as this.model.get('value')
            // var subform = new Quickform(this.model.get('form'));
            // this.form = subform;
            this.$el.empty().append(this.quickform.render().el)
            return this;
        },
        getValue: function() {
            return this.model.get('value').attributes;
        },        
        onChangeValue: function() {
            // The value of this subform changed, meaning it got a whole new set of
            // values. (This is not an individual field change)
            console.log('SUBFORM CHANGE!')
            var values = this.model.get('value');
            this.form.form.model.set(values.attributes);
            this.form.render()
        },
        // ===================
        // = Field interface =
        // ===================
        focus: function() {
        },
        attackElement: attackElement,
        leaveElement: leaveElement,
    });    
  

    var Date = Backbone.View.extend({
        className: 'gui-date',
        events: {
            'mousedown': 'onMouseDown',
            'keydown': 'onKeyDown',
            'click button.calendar': 'onButtonClick'
        },
        hotkeys: {
            'keydown esc': 'onEscKeyDown',
            'keydown down': 'onDownKeyDown'
        },
        defaultmodel: DateModel,
    
        initialize: function(config)  {
            config = config || {};
            this.model = config.model || new (_.pop(config, 'modeltype') || this.defaultmodel)(config, {parse:true});
            // Pass this.model into the textfield
            this.textfield = new Text({model: this.model});
            this.listenTo(this.textfield, 'fieldblur', this.onTextFieldBlur, this),
            this.listenTo(this.model, 'change', this.onModelChange, this);
        },
        render: function() {
            this.$el.empty().append('<button class="calendar" tabindex="-1"></button>');
            this.$el.append(this.textfield.render().el);
            this.textfield.delegateEvents();
            this.$el.toggleClass('gui-disabled', !this.model.get('enabled'));
            this.$el.toggleClass('invalid', !!this.model.validationError);
            return this;
        },
        onModelChange: function() {
            this.hideDatePicker();
            this.render();
        },
        onTextFieldBlur: function() {
            this.$el.toggleClass('invalid', !!this.model.validationError);
            // this.$el.trigger('fieldblur')
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
                this.datepicker.$el.on('focusleave', _.bind(this.hideDatePicker, this));
                this.datepicker.$el.addClass('flying');
            }
            return this.datepicker;
        },
        showDatePicker: function() {
            var datepicker = this.getDatePicker(),
                body = this.el.ownerDocument.body;
            
            datepicker.render().$el.appendTo(body).css('opacity', 1).show();
            datepicker.alignTo(this.$('button.calendar'), {my: 'left top', at: 'left bottom'});
            datepicker.el.focus();
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
        attackElement: attackElement,
        leaveElement: leaveElement,        

        onEscKeyDown: function(e) {
            this.hideDatePicker();
        },
        onDownKeyDown: function(e) {
            this.showDatePicker();
            e.preventDefault();
            e.stopPropagation();            
        },
        onButtonClick: function(e) {
            if(this.$el.closest('.gui-disabled').length) {
                return;                
            }
            this.showDatePicker();            
        },
        onMouseDown: function(e) {
            if(this.$el.closest('.gui-disabled').length)
                e.preventDefault(); // don't focus
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
        defaultmodel: DateModel,
    
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
        attackElement: attackElement,
        leaveElement: leaveElement,
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






    

    var TokenModel = Backbone.Model.extend({
        /* NOTE: this is NOT a SINGLE token model 
                
        var tm = new TokenModel({
            sources: [{
                    id: 'accounts',
                    triggerchar: '@',
                    view: AccountToken,                 // <-- complete with html template and events
                    collection: all_accounts
                }]
            ],
            text: 'Helo i am a text ${id: '123', coll: 'projects', refid: '456', hours:1} with tokens '+
                  'foo {id: '123', coll: 'projects', refid: '789', hours:1} bar bar'
        });
        
        
        */
        _class: 'form.TokenModel',


        initialize: function(attrs) {
            // attrs is the complete config
            this.attributes.text = attrs.text
            
            this.tokens = new Backbone.SubsetMulti([], {sources: attrs.sources})
            
            if(attrs.text)
                this.set_text(attrs.text)
        },
        getModelsFromText: function(text) {
            // Parse `text` and return an array of models for all found
            // markers.
            // "Bla bla ${JSON_STR} bla bla"
            var out = []
            
            text.replace(/\$(\{[^\}]+\})/g, _.bind(function(matchFull, match, offset, subject) { 
                // matchFull = "${<JSON_STR>}", match = "{<JSON_STR>}", offset = 30, subject = text
                var json = JSON.parse(match)
                var source = this.tokens.sources[json.source];
                
                var ref = source.collection.get(json.sourceId);
                var token = new (source.Model || Backbone.Model)(json);
                token.ref = ref;
                out.push(token);
            }, this));
            
            return out;
        },
        
        // 
        // set_sources: function(v, attrs, options, key) {
        //     console.log('YEMAN: ', v)
        //     // if attrs.text, then use that, else use this.get('text')
        //     
        //     attrs[sources] = v;
        //     
        // },
        set_text: function(text, attrs, options, key) {
            // When setting a completely new text, empty
            // `this.tokens`, and populate it again by parsing the new text.
            if(!this.tokens) {
                // initital, don't do anything yet, its handled in this.initialize in a moment
                attrs['text'] = text;  // <-- it think this is redundant
            }
            else {
                
                // this.set('text', 'foo bar ...') is called later, long after initialization
                // We must parse text and reset this.tokens.
                var newTokenModels = this.getModelsFromText(text)
                this.tokens.reset(newTokenModels);

            }
        }
    })
    
    var TokenTextAreaModel = FieldModel.extend({
        initialize: function(attrs) {
            this.tokenModel = new TokenModel({
                sources: attrs.sources,
                text: attrs.value
            })
            this.listenTo(this.tokenModel, 'change:text', this.onTextChange, this);

            this.triggerchars = _.object(_.map(attrs.sources || [], function(source) {
                return [source.triggerchar, source]
            }))
        },
        toString: function() {
            return 'TokenTextAreaModel';
        },        
        set_value: function(v, attrs, options, key) {
            // The text string is changing
            if(this.tokenModel) {
                // this is after initialize
                this.tokenModel.set('text', v)
            }
            
        },
        onTextChange: function(e) {
            this.trigger('change:text', e)
        },
        getValue: function() {
            console.log('getValue', this.tokenModel.tokens.map(function(token) {
                return token.toJSON()
            }));
            return this.tokenModel.get('text')
        },
        getTokens: function() {
            return this.tokenModel.tokens;
        }


    })
    
    
    
    var TokenTextArea = Backbone.View.extend({
        className: 'gui-textarea gui-tokentextarea',
        attributes: {
            tabindex: 0, 
            contentEditable: true
        },
        events: {
            'keypress': 'onKeyPress',
            'focus': 'onFocus',
            'blur': 'onBlur',

            'keydown': 'onKeyDown'
        },
        hotkeys: {
            'keyup backspace': 'onBackspace'
        },
        // hotkeys: {
        //     'keydown return': 'onReturnKeyDown',
        //     'keydown left': 'onLeftKeyDown',
        //     'keydown right': 'onRightKeyDown'
        // },
        defaultmodel: TokenTextAreaModel,
        mixins: [tools.InterceptPaste],


        onBackspace: function(e) {
            var currstart = $.Range.current().start()
            // range.end(currstart)
            // range.start()

            if(this.started) {
                if(this.start == currstart.offset) {
                    this.started = false
                    console.log('OFF!')
                }
                else {
                    window.setTimeout(_.bind(function() {
                        console.log('text', this.$el.text().substring(this.start, currstart.offset-1))                    
                    }, this), 1)
                }
            }
                        
            // Backspace deletes an entire token element.
            var sel = window.getSelection();
            if(sel.anchorOffset == 0) {
                var tokenEl = $(sel.anchorNode).prev(),
                    tokens = this.model.get('value').get('tokens'), // the collection
                    tokenModel = tokens.get(tokenEl.attr('id'));
                
                tokens.remove(tokenModel);
            }
            console.log('BAAAAA:', sel.anchorNode.parentElement, 'foo: ', sel.anchorNode, sel.anchorOffset)
            if(sel.anchorNode.parentElement.tagName == 'STRONG') {
                console.log('FOO')
            }
            
        },

    
        _onPaste: function(e) {
            var data = e.data.replace(/kalle/g, 'hassan');
            var plaintext = $('<div></div>').html(e.data).text();
            WysiHat.Commands.insertHTML(data);            
        },
    
        initialize: function(config) {
            config = config || {};
            this.model = config.model || new (_.pop(config, 'modeltype') || this.defaultmodel)(config);
            this.listenTo(this.model, 'change:value', this.render, this);

            this.views = {}

            this.selectable = new tools.Selectable({
                el: this.el,              // common ancestor for the selectables
                selectables: '.knight',        // a selector expression
                keynav:false
            });

            
            if($.browser.ltie9)
                this.$el.on('mousedown', _.bind(this.onIEMouseDown, this));
        },
        render: function() {
            this.$el.attr('name', this.model.get('name'))
            this.$el.toggleClass('invalid', !!this.model.validationError);
            this.$el.toggleClass('gui-disabled', !this.model.get('enabled'));
            
            
            var text = this.model.get('value'),
                tokens = this.model.tokenModel.tokens,
                sources = tokens.sources,
                $el = this.$el;
            
            // var value = this.model.get('value'),
            //     tokens = value.get('tokens'),
            //     text = value.get('text'),
            //     sources = this.model.sources,
            //     $el = this.$el;
            

            var elements = [],
                views = this.views;

            // text = text.replace(/\$\{(\w+)\}/g, function(matchFull, match, offset, subject) { 
            text = text.replace(/\$(\{[^\}]+\})/g, _.bind(function(matchFull, match, offset, subject) { 

                // matchFull = "${123}", match = "123", offset = 30, subject = text
                var json = JSON.parse(match),
                    token = tokens.get(json.id),
                    View = sources[token.get('source')].view || Backbone.View,
                    view = new View({model: token});                    

                elements.push({id: json.id, view: view})
                views[json.id] = view;

                return '<span id="'+json.id+'"></span>';
                                

            }, this));
            this.$el.html(text);
            
            _.each(elements, function(tup) {
                var id = tup.id,
                    view = tup.view;
              

                this.$el.find('#'+id).replaceWith(view.render().el)
                
            }, this)




            return this;
        },

        // ===================
        // = Field interface =
        // ===================
        focus: function() {
            if(this.$el.closest('.gui-disabled')[0]) 
                return; // ie7/8
            this.$el.moveCursorToEnd();
            this.$el.selectAll();
        },
        attackElement: attackElement,
        leaveElement: leaveElement,
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
            var character = String.fromCharCode(e.which)
            
            if(this.model.triggerchars[character]) {
                // var m = new menu.Menu({
                //     options: [
                //         {id: 'foo', text: 'Foo'},
                //         {id: 'bar', text: 'Bar'},
                //         {id: 'lax', text: 'Lax'}
                //     ]
                // })
                // m.show({left: 10, top: 10, focus: false})

                console.log('I once had a dog, and his name was Bingo')
                
                this.started = true;
                // this.range = this.$el.range();
                // this.range.start()
                // console.log('selection', $.Range.current().range.commonAncestorContainer.parentElement)
                console.log('selection', $.Range.current().start())
                this.start = $.Range.current().start().offset + 1
                
            }
            else if(this.started) {

                // Track the text between start and cursor
                var range = $.Range.current()
                var currstart = $.Range.current().start()
                // range.end(currstart)
                // range.start()

                window.setTimeout(_.bind(function() {
                    console.log('text', this.$el.text().substring(this.start, currstart.offset+1))                    


                    // Add the text "foo" after start() pos and select it
                    var range = $.Range.current()

                    // Create and insert some text
                    var foo = document.createTextNode('foo')
                    range.range.insertNode(foo)

                    // Try to select it
                    range.range.selectNode(foo)
                    range.select()
                    // range.start(currstart.offset+1)
                    // range.end('+1')
                    // range.select();

                    // this.$el.range().select()

                }, this), 1)


            }


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
        },
        onIEMouseDown: function(e) {
            if(this.$el.closest('.gui-disabled').length) {
                e.preventDefault(); // don't focus
                var focusable = this.$el.parent().closest('*:focusable');
                window.setTimeout(function() { focusable.focus(); }, 1); 
            }
        }
    });



    
  
    
    var viewtypes = {
        text: Text,
        textarea: TextArea,
        hidden: Hidden,
        checkbox: Checkbox,
        checkboxgroup: CheckboxGroup,
        radio: Radio,
        radiogroup: RadioGroup,
        combo: Combo,
        date: Date,
        datepicker: DatePicker,
        tokentextarea: TokenTextArea,
        subform: Subform
    };
    var modeltypes = {
        bool: BoolModel,
        string: StringModel,
        number: NumberModel,
        datetime: DateTimeModel,
        selection: SelectionModel,
        model: ModelModel,
    };

    return {
        viewtypes: viewtypes,
        modeltypes: modeltypes,

        Form: Form,
        Text: Text,
        TextArea: TextArea,
        Hidden: Hidden,
        Checkbox: Checkbox,
        CheckboxGroup: CheckboxGroup,
        Radio: Radio,
        RadioGroup: RadioGroup,
        Combo: Combo,
        Date: Date,
        DatePicker: DatePicker,
        TokenTextArea: TokenTextArea,
        Subform: Subform,
        TokenTextArea: TokenTextArea,

        FieldModel: FieldModel,
        BoolModel: BoolModel,
        StringModel: StringModel,
        NumberModel: NumberModel,
        DateTimeModel: DateTimeModel,
        SelectionModel: SelectionModel,
        SingleSelectionModel: SingleSelectionModel,
        ModelModel: ModelModel,
        TokenModel: TokenModel        
    }


})