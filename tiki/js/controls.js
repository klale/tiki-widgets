define([
    'jquery',
    'underscore',
    'backbone',
    './util',
    './controlmodels',
    './calendar',
    './menu',
    './tools',
    './traits'
], function($, _, Backbone, Util, ControlModels, Calendar, Menu, Tools, Traits) {
    'use strict';
    
    
    /*
    What is a control?
    - It's a form control (http://www.w3.org/TR/html401/interact/forms.html#form-controls)
    - It's a View with a Model.
    - The Model is store the control's value at model.get('value')
    - The Model can have other attributes. Such as 'disabled' and 'options'.
      But it only has one value, at model.get('value')
    - The value can be of any type. Anything from a simple scalar, to a Date object, Collection or model.
    - A control inside a form must also have a model.get('name') 
    
    
    Form example
    ------------
    A form has 
     - an array of control models (not views).
     - a model, storing a serialized copy of each control's value.
     
    var f = new form.Form({
        controls: [
            new form.DateModel({id: 'bar', viewtype='text'}),
            new form.IntModel({id: 'bar', viewtype='text'}),
            {id: 'foo', viewtype='text', modeltype='date', value='now'},
        ],
        // Optionally pass a Model or an object literal as the form's 
        // collective value. Object literals are wrapped in vanilla models.
        values: {
            'bar': '2014-01-30'
        }
    })
    
    Use with standard form controls
    -------------------------------
    [implement this, then document it]
    Use eg a <select name="foo" multiple>...</select> as the View for 
    a SelectionModel.
    */

    // =========
    // = utils =
    // =========
    var attackElement = function(el) {
        // Insert my element after the attacked element
        el = $(el);
        this.$el.insertAfter(el);
        // Detach the attacked element
        el.detach();
        
        this._detachedEl = el;
        this.$el.addClass(el[0].className);
    };
    var leaveElement = function() {
        // restore this.el to what it looked like before
        // attacking it.  
        this._detachedEl.html(this.model.get('value'));
        this._detachedEl.insertBefore(this.el);
        this.$el.detach();
    };
    var ControlView = {
        initialize: function(config) {
            this.listenTo(this.model, 'change:name', this.onNameChange, this);    
            this.listenTo(this.model, 'change:disabled', this.onDisabledChange, this);
            if(config.el) {
                // Prepend class, eg "tiki-text", if missing on supplied el
                if(!this.$el.hasClass(this.className)) 
                    this.$el.attr('class', [this.className, this.$el.attr('class')].join(' '));            
                // Set attributes for supplied el
                if(this.attributes)
                    this.$el.attr(this.attributes);
            }
        },
        onDisabledChange: function(model, disabled) {
            this.$el.toggleClass('tiki-disabled', disabled);
        },
        onNameChange: function(model, name) {
            this.$el.attr('name', this.model.get('name'));
        }        
    };
    


    // ============
    // = Controls =
    // ============
    var Text = Tools.View.extend({
        className: 'tiki-text',
        attributes: {
            tabindex: 0, 
            contentEditable: true
        },
        events: {
            'keypress': 'onKeyPress',
            'focus': 'onFocus',
            'mousefocus': 'onMouseFocus',
            'blur': 'onBlur'
        },
        hotkeys: {
            'keydown return': 'onReturnKeyDown',
            'keydown left': 'onLeftKeyDown',
            'keydown right': 'onRightKeyDown'
        },
        defaultmodel: ControlModels.String,
        mixins: [ControlView],
    
        initialize: function(config) {
            config = config || {};
            this.model = config.model || new (Util.pop(config, 'modeltype', '') || this.defaultmodel)(config);
            this.listenTo(this.model, 'change', this.render, this);
            ControlView.initialize.call(this, config);
        },
        render: function() {
            var renderer = this.model.get('renderer'),
                html = renderer ? renderer(this) : this.renderValue(),
                isInvalid = !!this.model.validationError;

            if(!isInvalid)
                this.$el.html(html);
            this.$el.toggleClass('invalid', isInvalid);
            this.$el.toggleClass('tiki-disabled', this.model.get('disabled'));
            this.$el.attr({
                'name': this.model.get('id'),
                'contenteditable': this.model.get('disabled') ? 'false':'true'
            });
            return this;
        },
        renderValue: function() {
            var format = this.model.get('format'),
                value = this.model.get('value');
            
            if(format)
                return Globalize.format(value, format);                
            return _.escape(value);
        },
        

        // ===================
        // = Control interface =
        // ===================
        focus: function() {
            if(this.$el.closest('.tiki-disabled')[0]) 
                return;
            this.$el.moveCursorToEnd();
            this.$el.selectAll();
        },
        attackElement: attackElement,
        leaveElement: leaveElement,

                
        onFocus: function(e) {
            var keydown = Util._keyDownEvent;
            if(keydown && keydown.which == Util.keys.TAB) {
                this.focus();
            }
        },     
        onBlur: function(e) {
            var text = this.$el.getPreText().trim();
            this.model.set({'value': text}, {validate: true});

            // It might require a render now even if the model is untouched
            this.render();
            this.trigger('controlblur');
            this.$el.trigger('controlblur');
        },
        onReturnKeyDown: function(e) {        
            // Don't allow newlines in a text control
            e.preventDefault();            
            // Set value immediately when pressing Return, as the event
            // may continue upwards to a form, triggering a submit.
            var v = this.$el.getPreText().trim();
            this.model.set('value', v);
            this.render();
        },
        onKeyPress: function(e) {
            // On eg future numeric text control, type is supposed to only 
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
        }
    });


    var TextArea = {};
    TextArea.Model = ControlModels.ControlModel.extend('TextArea.Model', {}, {
        createFromElement: function(el, obj) {
            /* Construct a model from attributes and possibly child <br/>
            elements of `el` */
            var attr = $(el).getAllAttributes(),
                value = $(el).html(),
                config = {
                    id: attr.name,
                    type: attr.type,
                    disabled: attr.disabled != null
                };

            if(value)
                config.value = value;

            return new this(config);
        }
    });
    

    TextArea.View = Text.extend({
        className: 'tiki-textarea',
        hotkeys: {
            'keydown return': 'onReturnKeyDown'
        },
        attributes: {   // <---- TODO: If not repeated here, className:'tiki-textarea' is set on form.Text as well
            tabindex: 0, 
            contentEditable: true
        },
        merge: ['hotkeys'],
        defaultmodel: TextArea.Model,

        render: function() {
            var renderer = this.model.get('renderer'),
                name = this.model.get('name'),
                html = renderer ? renderer(this) : this.renderValue(),
                isInvalid = !!this.model.validationError,
                disabled = this.model.get('disabled');
            if(!isInvalid)
                this.$el.html(Util.makePreText(html || ''));
                        
            this.$el.toggleClass('invalid', isInvalid);
            this.$el.toggleClass('tiki-disabled', disabled);
            this.$el.attr({
                'name': this.model.get('id'),
                'contenteditable': disabled ? 'false':'true'
            });
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
                        
            this.model.set({'value': text}, {validate: true});
            if(wasInvalid && !this.model.validationError)
                // there is a small change the new value above is the same as
                // before making it invalid, not triggering change -> render.
                this.render();
            this.trigger('controlblur');
            this.$el.trigger('controlblur');
        },        

        attackElement: attackElement,
        leaveElement: leaveElement,
                
        onReturnKeyDown: function(e) {
            e.stopPropagation();
        }
    });
    

    var Hidden = Tools.View.extend({
        className: 'tiki-hidden',
        defaultmodel: ControlModels.String,
    
        initialize: function(config) {
            config = config || {};
            this.model = config.model || new (Util.pop(config, 'modeltype', '') || this.defaultmodel)(config);
        },
        render: function() {
            this.$el.attr('name', this.model.get('name'));
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




    function parseBool(s) {
        if(s && s.toLowerCase() == 'true')
            return true;
        return false;
    }
    
    var Checkbox = {};
    Checkbox.Model = ControlModels.ControlModel.extend('Checkbox.Model', {      
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
    }, {
        createFromElement: function(el, obj) {
            var attr = $(el).getAllAttributes(),
                checked = attr.checked,
                value = false;
            
            if(checked != null) {
                $(el).removeAttr('checked');
                value = true;
            }
            else if(attr.value)
                value = parseBool(attr.value)
                
            return new this({
                id: attr.name,
                type: attr.type,
                text: attr.text || $(el).html(),
                value: value,
                disabled: attr.disabled != null,
                format: attr.format
            });
        }        
    });
    
    Checkbox.View = Tools.View.extend('Controls.Checkbox.View', {
        className: 'tiki-checkbox',
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
        defaultmodel: Checkbox.Model,
        mixins: [ControlView],
    
        initialize: function(config)  {
            if(!this.model)
                this.model = new (Util.pop(config, 'modeltype', '') || this.defaultmodel)(config);
            
            ControlView.initialize.call(this, config);    
            this.listenTo(this.model, 'change:text', this.onTextChange, this);    
            this.listenTo(this.model, 'change:selected', this.onSelectedChange, this);
        },
        render: function() {
            this.$el.toggleClass('checked', !!this.model.get('selected'));
            this.$el.toggleClass('tiki-disabled', !!this.model.get('disabled'));
            this.$el.html(this.model.get('text') || '');
            this.$el.attr('name', this.model.get('name'));
            return this;
        },
        attackElement: attackElement,
        leaveElement: leaveElement,
        onTextChange: function(model, text) {
            this.$el.html(text);
        },
        onSelectedChange: function(model, selected) {
            this.$el.toggleClass('checked', selected);
        },
        onClick: function(e) {             
            e.preventDefault();
            if(this.$el.closest('.tiki-disabled').length) {
                e.preventDefault(); // don't focus
                return;
            }
            this.model.set('selected', !this.model.get('selected'));
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
            if(!this.$el.closest('.tiki-disabled')[0]) {
                this.$el.addClass('active');
            }
        }
    });


    var Radio = {};
    Radio.View = Checkbox.View.extend({
        className: 'tiki-radio',
        // initialize: function(config)  {
        //     this.model = config.model || new (Util.pop(config, 'modeltype', '') || this.defaultmodel)(config);
        //     this.listenTo(this.model, 'change:value', this.onModelChange, this);
        //     this.$el.attr(this.attributes || {}).addClass(this.className);
        // },
        onClick: function(e) {             
            e.preventDefault();
            if(this.$el.closest('.tiki-disabled')[0])
                return;
            this.model.set('selected', true);
            this.$el.removeClass('active');
        }
    });



    var CheckboxGroup = {};
    CheckboxGroup.View = Tools.View.extend({
        tagName: 'ul',
        className: 'tiki-checkboxgroup',
        defaultmodel: ControlModels.MultiSelection,
        mixins: [ControlView],
    
        initialize: function(config)  {
            config = config || {};
            if(!this.model)
                this.model = new (Util.pop(config, 'modeltype', '') || this.defaultmodel)(config);

            ControlView.initialize.call(this, config);
            var options = this.model.get('options');
            this.listenTo(options, 'add', this.addOne, this);
            this.listenTo(options, 'remove', this.addRemove, this);
        },
        render: function() {
            this.empty().$el.empty();
            this.$el.attr('name', this.model.get('name'));
            this.model.get('options').each(function(model) {
                this.addOne(model);
            }, this);
            return this;
        },
        addOne: function(model) {
            if(!this.views[model.cid]) {
                this.views[model.cid] = new Checkbox.View({model: model});
            }
            var view = this.views[model.cid];
            var li = $('<li></li>').append(view.render().el);
            view.delegateEvents();
            this.$el.append(li);
        },
        removeOne: function(model) {
            var view = Util.pop(this.views, model.cid, null);
            if(view)
                view.remove();
        },
        attackElement: attackElement,
        leaveElement: leaveElement,
    });


    var RadioGroup = {};
    RadioGroup.View = CheckboxGroup.View.extend('Controls.RadioGroup.View', {
        className: 'tiki-radiogroup',
        defaultmodel: ControlModels.SingleSelectionM,        
        addOne: function(model) {
            if(!this.views[model.cid]) {
                this.views[model.cid] = new Radio.View({model: model});   // <--- diff
            }
            var view = this.views[model.cid];
            var li = $('<li></li>').append(view.render().el);
            view.delegateEvents();
            this.$el.append(li);
        }
    });    


    var Dropdown = {};
    Dropdown.Model = ControlModels.ControlModel.extend('Controls.Dropdown.Model', {
        traits: {
            options: new Traits.CollectionM()
        },
        defaults: {
            options: []
        },
        setorder: ['options', 'value'],
        initialize: function() {
            // If value is not specifield, look for a selected option.
            if(this.value == null) {
                var selected = this.options.findWhere({selected: true});
                this.set('value', selected, {silent: true});
            }
            // When options is set for the first time, listen to its options.
            if(this.options)
                this.listenTo(this.options, 'change:selected', this.onSelectedChange, this);
            else
                throw new Error('Dropdown.Model has no initial options');
        },
        set_value: function(v, attrs, options) {
            /*
            Value is null, undefined or referencing a model of `this.options`.
            
            model.value = null
            model.value = undefined
            model.value = 123        // id
            model.value = 'foo'      // id
            model.value = 'c123'     // cid
            model.value = {id: 'foo'}
            model.value = <MyModel id=foo>
            
            model.value = 'i-dont-exists; // ValueError
            model.value = NaN; // TypeError
            model.value = new Date(); // TypeError
            model.value = false // TypeError
            */
            if(v == null) {
                attrs[v] = v;
                return;
            }
            if(_.isObject(v) && (v.id || v.cid))
                v = v.id || v.cid;
            if(_.isString(v) || _.isNumber(v)) {
                var optionModel = (attrs.options || this.options).get(v);
                if(!optionModel) 
                    throw new Traits.ValueError('Option "'+v+'" does not exist');
                
                attrs.value = optionModel
            }
            else throw new TypeError('Invalid type: '+v);  
        },
        toString: function() {
            return Util.modelToStr(this, 'name', 'disabled', 'options');
        },
        valueToJSON: function() {
            if(this.value)
                return this.value.id;
            return null;
        },
        onValueChange: function(model, selectedOption) {
            // selectedOption can be null, undefined or a models of `this.options`.
            var prevOption = this.model.previousAttributes().value;
            if(prevOption)
                prevOption.set('selected', false, {mute: true});
            if(selectedOption)
                selectedOption.set('selected', true, {mute: true})
        },
        onSelectedChange: function(optionModel, selected, options) {
            if(!options.mute)
                this.set('value', selected ? optionModel : null);
        }
    });
        
    Dropdown.View = Tools.View.extend('Dropdown.View', {
        className: 'tiki-dropdown',
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
        // defaultmodel: ControlModels.SingleSelectionM,
        defaultmodel: Dropdown.Model,
        mixins: [ControlView],
    
        initialize: function(config) {       
            config = config || {};
            _.bindAll(this, 'onMenuSelect', 'onMenuHide', 'render');
            if(!this.model)
                this.model = new (Util.pop(config, 'modeltype', '') || this.defaultmodel)(config);

            ControlView.initialize.call(this, config);
            var options = this.model.get('options');
            this.listenTo(this.model, 'change', this.render);

            // Create the dropdown menu
            this.menu = new Menu.Menu({
                options: options
            });
            this.menu.on('select', this.onMenuSelect);
            this.menu.on('hide', this.onMenuHide);
            this.menu.render();
        },   
        render: function() {
            this.$el.attr('name', this.model.get('name'));
            
            var value = this.model.get('value');
            var text = value ? value.get('text') : '';            
            this.$el.html(this.template({text: text}));
            this.$el.toggleClass('tiki-disabled', this.model.get('disabled'));
        
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
            if(this.menu.$el.is(':visible')) {
                this.menu.hide();
            }
                
            if(this.$el.closest('.tiki-disabled').length) {
                e.preventDefault(); // don't focus
                return;
            }
            this.showMenu();
            this.menu.el.focus();
            e.stopPropagation();
            e.preventDefault();
        },
        onMenuSelect: function(optionModel) {
            this.model.value = optionModel;
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
                    this.trigger('controlblur', this);
                    this.$el.trigger('controlblur');
                }
            },this), 1); // short delay for webkit
        }    
    });


  
    var Date = Tools.View.extend({
        className: 'tiki-date',
        events: {
            'mousedown': 'onMouseDown',
            'keydown': 'onKeyDown',
            'click button.calendar': 'onButtonClick'
        },
        hotkeys: {
            'keydown esc': 'onEscKeyDown',
            'keydown down': 'onDownKeyDown'
        },
        defaultmodel: ControlModels.Date,
        mixins: [ControlView],
    
        initialize: function(config)  {
            config = config || {};
            this.model = config.model || new (Util.pop(config, 'modeltype', '') || this.defaultmodel)(config, {parse:true});
            ControlView.initialize.call(this, config);
            // Pass this.model into the text control
            this.textcontrol = new Text({model: this.model});
            this.listenTo(this.textcontrol, 'controlblur', this.onTextControlBlur, this);
            this.listenTo(this.model, 'change:value', this.onModelChangeValue, this);
        },
        render: function() {
            this.$el.empty().append('<button class="calendar" tabindex="-1"></button>');
            this.$el.append(this.textcontrol.render().el);
            this.textcontrol.delegateEvents();
            this.$el.toggleClass('tiki-disabled', this.model.get('disabled'));
            this.$el.toggleClass('invalid', !!this.model.validationError);
            this.delegateEvents();
            return this;
        },
        onModelChangeValue: function(model, value) {
            if(model.previous('value') == null && value == null)  // traits2
                return;
            this.hideDatePicker();
            this.render();
            this.$el.trigger('change', {value: value})
        },
        onTextControlBlur: function() {
            this.$el.toggleClass('invalid', !!this.model.validationError);
            // this.$el.trigger('controlblur')
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
                this.datepicker.$el.on('focusleave', _.bind(this.onDatePickerFocusLeave, this));
                this.datepicker.$el.addClass('flying');
            }
            return this.datepicker;
        },
        showDatePicker: function() {
            var datepicker = this.getDatePicker(),
                body = this.el.ownerDocument.body;
            
            datepicker.render().$el.appendTo(body).css('opacity', 1).show();
            datepicker.alignTo(this.el, {my: 'left top', at: 'left bottom'});
            datepicker.el.focus();
        },
        onDatePickerFocusLeave: function(e, data) {
            var newFocused = data.newFocused,
                calendar = this.datepicker.calendar,
                yeardd = calendar.yearDropdown || {},
                monthdd = calendar.monthDropdown || {};
            
            // don't hide if losing focus to a year or month dropdown
            if(newFocused != yeardd.el && newFocused != monthdd.el)
                this.hideDatePicker();
        },
        hideDatePicker: function() {
            if(this.datepicker) {
                this.datepicker.$el.fadeOutFast({detach:true});
                this.focus();
            }
        },        
        focus: function(e) {
            this.textcontrol.focus();
            this.textcontrol.el.focus();
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
            if(this.$el.closest('.tiki-disabled').length) {
                return;                
            }
            this.showDatePicker();            
        },
        onMouseDown: function(e) {
            if(this.$el.closest('.tiki-disabled').length)
                e.preventDefault(); // don't focus
        },
        onDatePickerKeyDown: function(e) {
            if(e.keyCode == Util.keys.ESC)
                this.hideDatePicker();
        }
    });
  


    var DatePicker = Tools.View.extend({
        className: 'tiki-datepicker',
        events: {
            'mouseenter tbody td.day': 'onMouseEnterDay',
            'keydown': 'onKeyDown',
            'click .day': 'onClickDay'
        },
        attributes: {
            tabindex: 0
        },
        defaultmodel: ControlModels.Date,
        mixins: [ControlView],
    
        initialize: function(config)  {
            config = config || {};
            this.model = config.model || new (Util.pop(config, 'modeltype', '') || this.defaultmodel)(config, {parse:true});
            ControlView.initialize.call(this, config);
            
            this.calendar = new Calendar.MonthCalendar({date: this.model.get('value') || new window.Date()});
            this.listenTo(this.calendar, 'dropdownhide', this.focus);
            this.$el.append(this.calendar.render().el);
            this.listenTo(this.model, 'change:value', this.onModelChange, this);
        },
        render: function() {
            var date = this.model.get('value');
            this.calendar.$('.day.selected').removeClass('selected');
            if(date) {
                var ymd = Util.dateToYMD(date);
                this.calendar.$('.day[data-ymd="'+ymd+'"]').addClass('selected');
            }
            return this;
        },
        attackElement: attackElement,
        leaveElement: leaveElement,
        alignTo: function(el, options) {
            options = Util.defs(options, {
                my: 'left top',
                at: 'right top',
                of: el,
                collision: 'flip fit',
                within: window
            });
            this.$el.position(options);
            return this.$el;
        },
        focus: function() {
            this.el.focus();
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
                keys = Util.keys,
                key = e.keyCode,
                arrows = [keys.LEFT, keys.RIGHT, keys.UP, keys.DOWN],
                left = key == keys.LEFT,
                right = key == keys.RIGHT,
                up = key == keys.UP,
                down = key == keys.DOWN;
        
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
            else {
                // Change month when navigating off the left or right edge.

                if(left || right) {
                    var rowNum = $(curr[0].parentElement).index(),
                        cal = this.calendar;
                    curr.removeClass('selected');                
                    cal[left ? 'showPrevMonth' : 'showNextMonth']();
                    cal.$('tr:nth-child('+(rowNum+1)+') td.day:'+ 
                        (left ? 'last' : 'first')).addClass('selected');
                }
            }
        },
        onClickDay: function(e) {
            var el = $(e.currentTarget);
            if(el[0]) {
                this.model.set('value', el.attr('data-ymd'));
            }
        }
    });


    

    // ==========
    // = Slider =
    // ==========
    var Drag = Tools.Events.extend('Drag', {
        initialize: function(conf) {
            // Pre-bind some handlers
            this._onbodymousemove = $.proxy(this.onBodyMouseMove, this);
            this._onbodymouseup = $.proxy(this.onBodyMouseUp, this);
            this._onbodymouseover = $.proxy(this.onBodyMouseOver, this);
            this._onbodymouseout = $.proxy(this.onBodyMouseOut, this);
            this._body = $(document);
            this.dragging = false;
        },
        start: function(conf) {
            /* Optional: conf.distance, drag at least `distance` pixels to initate a drag
            Todo: Finish docs
            */
            this._body.bind('mousemove', this._onbodymousemove);
            this._body.bind('mouseover', this._onbodymouseover);
            this._body.bind('mouseout', this._onbodymouseout);
            this._body.bind('mouseup', this._onbodymouseup);

            this.prefix = conf.prefix || '';

            // offset relative to first positioned parent (margins, borders, ..)
            var left = 0,
                top = 0,
                selector = $(conf.ev.target).parentsUntil('*:floating').andSelf();
            selector.each(function() {
                var pos = $(this).position();
                left += pos.left || 0;
                top += pos.top || 0;
            });

            // FF: ev.clientX === undefined, #8523
            var ev = conf.ev;
            var offsetX = (ev.offsetX || ev.clientX - $(ev.target).offset().left);
            var offsetY = (ev.offsetY || ev.clientY - $(ev.target).offset().top);

            // Update the drag metadata object
            conf = _.extend(conf, {
                clientX: conf.ev.clientX,
                clientY: conf.ev.clientY,
                offsetX: offsetX + left,
                offsetY: offsetY + top
            });
            this.conf = conf;

            this.dragging = true;

            // no text selection while dragging
            conf.ev.preventDefault();
        },
        onBodyMouseMove: function(e) {
            var conf = this.conf,
                el = $(this.conf.el);
            if(el[0]) {

                el[0].style.left = (e.pageX - this.conf.offsetX) + 'px';
                el[0].style.top = (e.pageY - this.conf.offsetY) + 'px';
            }
            else if(conf.ondrag) {
                conf.ondrag(e, conf);
            }
        },
        onBodyMouseOver: function(e) {
            if(this.dragging && this.prefix) {
                var data = {conf: this.conf, drag: this};
                $(e.target).trigger(this.prefix+'mouseover', [data]);
            }
        },
        onBodyMouseOut: function(e) {
            if(this.dragging && this.prefix) {
                var data = {conf: this.conf, drag: this};
                $(e.target).trigger(this.prefix+'mouseout', [data]);
            }
        },
        onBodyMouseUp: function(e) {
            // Detach drag-related listeners
            this._body.unbind('mousemove', this._onbodymousemove);
            this._body.unbind('mouseup', this._onbodymouseup);

            if(this.dragging) {
                e.drag = this;
                e.pageX = e.clientX + this.scrollLeft;
                e.pageY = e.clientY + this.scrollTop;
                e.conf = this.conf;
                if(this.conf.onend)
                    this.conf.onend(e, this.conf);
                this.dragging = false;
                // Fire `[prefix]drop` and `drop` events
                var data = {conf: this.conf, drag: this};
                $(e.target).trigger(this.prefix+'drop', [data]);
                $(e.target).trigger('drop', [data]);
                this.trigger('dragend', data);
            }
            this.conf = {};
            this.el = undefined;
        }
    });
    var drag = new Drag();
    
    
        
    
    var SliderModel = ControlModels.ControlModel.extend('SliderModel', {
        traits: {
            steps: Traits.Int(),
            precision: Traits.Int(),
            downScaleFactor: Traits.Float(),
        },
        defaults: {
            downScaleFactor: 1.0
        },
        // the name "parse_value" has no magic meaning, but the view needed this method.
        parse_value: function(v) {
            // interpret a value with respect to steps and precision
            // eg 0.41221 -> 0.4
            // "52.242%"  -> 0.5
            if(_.isString(v) && v.indexOf('%') !== -1)
                v = parseFloat(v) / 100;
            else
                v = parseFloat(v);

            if(v > 1)
                v = 1;
            else if(v < 0)
                v = 0;

            var precision = this.steps || this.precision || 100;
            v = Math.round(v*precision) / precision;
            return v;
        },
        set_value: function(v, attrs, options) {
            attrs.value = this.parse_value(v);
        },
    })


    var Slider = Tools.View.extend('Slider', {
        className: 'tiki-slider',
        attributes: {
            tabindex: 0
        },
        template: _.template(''+
            '<div class="range"></div>'+
            '<div class="range-min"></div>'+
            '<div class="range-max"></div>'+
            '<div class="container">'+
                '<div class="handle"><div></div></div>'+
            '</div>'
        ),
        events: {
            'keydown': 'onKeyDown',
            'mousedown': 'onMouseDown'
        },
        defaultmodel: SliderModel,
        mixins: [ControlView],
        initialize: function(config) {
            config = config || {};
            if(!this.model)
                this.model = new (Util.pop(config, 'modeltype', '') || this.defaultmodel)(config);
            ControlView.initialize.call(this, config);
            this.listenTo(this.model, 'change', this.render);
        },
        render: function() {
            this.$el.html(this.template());
            if($.browser.ltie9)
                this.$('*').attr('unselectable', 'on');

            var value = this.model.value;
            if(value)  { // !== undefined
                this.$('.handle').css('left', (value*100)+'%');
                this.$('.range-min').css('width', (value*100)+'%');
            }
            return this;
        },

        _rangeWidth: function() {
            return $(this.el).width() - this.$('.handle').outerWidth();
        },
        _calculateLeft: function(offsetleft) {
            /* Returns a float between 0 and 1 from an offset in pixels
            eg 122 -> 0.3241....
            */
            var width = this.$('.container').width(),
                step = 1 / this.model.steps,
                handleWidth = (this.$('.handle').outerWidth() / width);
            if(offsetleft > width)
                return 1;
            else if(offsetleft < 0)
                return 0;

            var value = offsetleft / width;
            // make it snap?
            if(this.model.steps) {
                var mod = value % step;
                value -= mod;
                if(mod > (step/2) + (handleWidth / 2))
                    value += step;
            }
            return value;
        },
        onMouseDown: function(e) {
            var parent = $(e.target.parentNode),
                tgt = $(e.target);

            // FF: e.offsetX === undefined
            var offsetX = (e.offsetX || e.clientX - $(e.target).offset().left);

            if(parent.hasClass('handle')) {
                // clicking directly on the handle
                var handleOffsetX = offsetX / this._rangeWidth();
            } else {
                // clicking elsewhere, jump to here, then start the drag
                var left = this._calculateLeft(offsetX);
                left = this.model.parse_value(left);
                this.$('.handle').css('left', (left*100) + '%');
                this.$('.range-min').css('width', (left*100)+'%');
                var handleOffsetX = this.$('.handle').width() / 2;
            }
            handleOffsetX = handleOffsetX / this._rangeWidth();

            // get slider position
            var offset = this.$el.offset();
            var conf = {
                ev: e,
                ondrag: $.proxy(this.onSliderDrag, this),
                onend: $.proxy(this.onSliderDragEnd, this),
                pos: {
                    left: offset.left,
                    offsetX: handleOffsetX
                }
            };
            drag.start(conf);
            e.preventDefault();
            e.stopPropagation();
            this.el.focus();
        },
        onSliderDrag: function(e, conf) {
            var pos = conf.pos;
            var offsetleft = (e.clientX - pos.left) - pos.offsetX;
            var left = this._calculateLeft(offsetleft);
            left = this.model.parse_value(left);
            this.$('.handle').css('left', (left*100)+'%');
            this.$('.range-min').css('width', (left*100)+'%');
            this.trigger('drag', {slider: this, value: left});
        },
        onSliderDragEnd: function(e, conf) {
            var left = this.$('.handle')[0].style.left; // eg "20%"
            this.model.value = left;
        },
        onKeyDown: function(e) {
            var key = e.keyCode,
                keys = Util.keys,
                step = 1/(this.model.steps || 100);

            if(key == keys.ENTER) {
                e.preventDefault();
                return;
            } else if(key == keys.ESC) {
                this.abort();
            } else if(key == keys.LEFT) {
                this.model.value -= step;
            } else if(key == keys.RIGHT) {
                this.model.value += step;
            }
            e.stopPropagation();
        }
    });

    
    
    var DropdownMulti = {};
    DropdownMulti.Model = ControlModels.ControlModel.extend('DropdownMulti.Model', {
        /*
        var model = new DropdownMulti.Model({options: [...]});
        model.value = ['foo', 'bar']
        model.value = 'foo'
        model.value = <Model id=foo>
        model.value = null
        model.value = []
        model.value = Collection(...)
        */
        traits: {
            options: new Traits.CollectionM(),
        },
        defaults: {
            options: []
        },
        setorder: ['options', 'value'],
        initialize: function() {
            this.listenTo(this.options, 'change:selected', this.onSelectedChange, this);
        },
        get_value: function() {
            return this.options.where({selected:true});
        },
        set_value: function(v, attrs, options, key, errors, obj) {
            delete attrs.value;
            // options and value can be assigned in a single model.set(..)
            var opts = attrs.options || obj.options; 
            obj._deselect = {}, obj._select = {};
            
            // Deselect all and leave early
            if(v == null || _.isEmpty(v)) { 
                opts.each(function(opt) { if(opt.get('selected')) obj._deselect[opt.id] = opt; });
                return;
            }
            
            if(v instanceof Backbone.Collection)
                v = v.models;
            
            // Iterate value, build a hash of models to select called _select.
            _.each(Util.arrayify(v), function(v) {
                if(v instanceof Backbone.Model)
                    obj._select[v.id] = v;
                else if(v) {
                    // assume v is a model id 
                    var m = opts.get(v); 
                    if(!m) {
                        throw new ValueError('"'+v+'" not in options');
                    }
                    obj._select[m.id] = m;
                }
            });

            // Iterate all options. Any already-selected options, not in _select, are added to _deselect.                            
            opts.each(function(opt) {
                if(opt.get('selected') && !obj._select[opt.id]) 
                    obj._deselect[opt.id] = opt;
            });
        },
        rollback: function(attrs, options) {
            Util.pop(obj, '_select', null);
            Util.pop(obj, '_deselect', null);
        },
        success: function(attrs, options) {
            _.each(Util.pop(this, '_deselect', null), function(opt) {
                opt.set('selected', false)
            });
            _.each(Util.pop(this, '_select', null), function(opt) {
                opt.set('selected', true);
            });
        },
        onSelectedChange: function(option, selected) {
            this.trigger('change:value', this, this.value);
        }
    });
    
    
    DropdownMulti.DropdownView = Tools.View.extend('DropdownMulti.DropdownView', {
        className: 'tiki-dropdownmulti-dropdown',
        attributes: {
            tabindex: -1
        },
        ui: {
            ul: 'ul'
        },
        events: {
            'click li': 'onLIClick'
        },
        mixins: [Tools.ModelToElement],
        initialize: function() {
            _.bindAll(this, 'addOne');
            this.$el.scrollMeOnly();
            this.$el.html('<ul></ul>');
            this.bindUI();
            this.collection = this.model.options;
        },
        render: function() {
            this.ui.ul.empty();
            this.model.options.each(this.addOne);
            return this;
        },
        addOne: function(model) {            
            var el = $('<li data-id="'+model.id+'" class="tiki-checkbox">'+model.get('text')+'</li>')
            el.toggleClass('checked', !!model.get('selected'));
            this.ui.ul.append(el);
        },
        onLIClick: function(e) {
            var model = this.getModel(e.currentTarget);
            model.set('selected', !model.get('selected'));
            this.render();
        }
    });
            
    DropdownMulti.View = Tools.View.extend('DropdownMulti', {
        className: 'tiki-dropdownmulti',
        attributes: {
            tabindex: 0
        },
        template: _.template(''+
            '<span><%= obj.text || "&nbsp;" %></span>'+
            '<button tabindex="-1"></button>'
        ),
        events: {
            'mousedown': 'onMouseDown',
            'mouseup': 'onMouseUp',
            'keydown': 'onKeyDown',
            'blur': 'onBlur',
            'focus': 'onFocus'
        },
        defaultmodel: DropdownMulti.Model,
        mixins: [ControlView],
    
        initialize: function(config) {       
            config = config || {};
            if(!this.model)
                this.model = new (Util.pop(config, 'modeltype', '') || this.defaultmodel)(config);        
            ControlView.initialize.call(this, config);

            // Create the dropdown
            this.dd = new Tools.Dropdown({
                target: this.el,
                makeDropdown: this.makeDropdown.bind(this),
            });            
            
            this.listenTo(this.model, 'change', this.render);
            this.listenTo(this.model.options, 'change:selected', this.render);
        },   
        render: function() {
            this.$el.attr('name', this.model.get('name'));
            
            var value = this.model.value;
            var text = _.map(value, function(m) { return m.get('text'); }).join(', ');
            this.$el.html(this.template({text: text}));
            this.$el.toggleClass('tiki-disabled', this.model.get('disabled'));
        
            if($.browser.ltie10) {
                this.$('*').add(this.el).attr('unselectable', 'on');
            }
            return this;
        },
        makeDropdown: function() {
            var dd = new DropdownMulti.DropdownView({model: this.model, collection: this.model.options});
            return dd;            
        },
        onMouseDown: function() {
            this.dd.dropdown.$el.css('min-width', this.$el.outerWidth())
            this.dd.showDropdown();

        },
        onMouseUp: function() {
            this.dd.focusDropdown();            
        }
    });



    return {
        register: {
            text: Text,
            textarea: TextArea.View,
            hidden: Hidden,
            checkbox: Checkbox.View,
            checkboxgroup: CheckboxGroup.View,
            radio: Radio.View,
            radiogroup: RadioGroup.View,
            dropdown: Dropdown.View,
            dropdownmulti: DropdownMulti.View,
            date: Date,
            datepicker: DatePicker
        },
        ControlView: ControlView,
        Text: Text,
        TextArea: TextArea.View,
        Hidden: Hidden,
        Checkbox: Checkbox.View,
        CheckboxGroup: CheckboxGroup.View,
        CheckboxModel: Checkbox.Model,
        Radio: Radio.View,
        RadioGroup: RadioGroup.View,
        RadioGroupModel: RadioGroup.Model,        
        Dropdown: Dropdown.View,
        DropdownModel: Dropdown.Model,
        DropdownMulti: DropdownMulti.View,
        DropdownMultiModel: DropdownMulti.Model,
        Date: Date,
        DatePicker: DatePicker,
        Slider: Slider,
        SliderModel: SliderModel
    };


});