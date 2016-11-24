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
    var Text = Tools.View.extend('Controls.Text', {
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
            this.valueField = config.valueField || 'value';
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
            this.$el.toggleClass('tiki-disabled', !!this.model.get('disabled'));
            this.$el.attr({
                'name': this.model.get('id'),
                'contenteditable': this.model.get('disabled') ? 'false':'true'
            });
            return this;
        },
        renderValue: function() {
            var format = this.model.get('format'),
                value = Util.getattr(this.model, this.valueField);

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
            Util.setattr(this.model, this.valueField, text, {validate: true})


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
            Util.setattr(this.model, this.valueField, v, {validate: true});
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
                this.$el.html(Util.makePreText(html || ''));

            this.$el.toggleClass('invalid', isInvalid);
            this.$el.toggleClass('tiki-disabled', !!disabled);
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
            $(el).attr(this.attributes || {});
            $(el).addClass(this.className);
            this.setElement(el);
        },
        leaveElement: function() {
        }
    });




    function parseBool(s) {
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
            this.$el.text(this.model.get('text') || '');
            this.$el.attr('name', this.model.get('name'));
            return this;
        },
        attackElement: attackElement,
        leaveElement: leaveElement,
        onTextChange: function(model, text) {
            this.$el.text(text);
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
            options: new Traits.CollectionM(),
            emptyText: new Traits.String()
        },
        defaults: {
            options: [],
            emptyText: ""
        },
        setorder: ['options', 'value'],
        constructor: function(attrs, options) {
            options = options || {};
            if (options.missingValue !== undefined) {
              this.missingValue = options.missingValue;
            }
            Backbone.Model.call(this, attrs, options);
        },
        initialize: function(attrs) {
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
            if(_.isString(v) || _.isNumber(v)) {
                var optionModel = (attrs.options || this.options).get(v);
                if(!optionModel && this.missingValue !== undefined) {
                    optionModel = new Backbone.Model({id: this.missingValue, text: ''});
                }
                if (!optionModel) {
                    throw new Traits.ValueError('Option "'+v+'" does not exist');
                }
                attrs.value = optionModel;
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
                selectedOption.set('selected', true, {mute: true});
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
            '<span><%- text || emptyText %></span>'+
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
        MenuClass: Menu,
        optionTemplate: null,

        initialize: function(config) {
            config = config || {};
            _.bindAll(this, 'onMenuSelect', 'onMenuHide', 'render');
            if(!this.model)
                this.model = config.model || new (Util.pop(config, 'modeltype', '') || this.defaultmodel)(config);

            ControlView.initialize.call(this, config);
            this.textField = config.textField || "text";

            var options = this.model.get('options');
            options.textField = this.textField;
            options.valueField = this.valueField;

            if(this.optionTemplate) {
                options.optionTemplate = this.optionTemplate;
            }

            this.listenTo(this.model, 'change', this.render);

            // Create the dropdown menu
            this.menu = new this.MenuClass.Menu({
                options: options
            });
            this.menu.on('select', this.onMenuSelect);
            this.menu.on('hide', this.onMenuHide);
            this.menu.render();
        },
        render: function() {
            this.$el.attr('name', this.model.get('name'));

            var value = this.model.get('value');
            var text = this.renderText();
            this.$el.html(this.template({text: text, emptyText: this.model.emptyText}));
            this.$el.toggleClass('tiki-disabled', !!this.model.get('disabled'));
            if($.browser.ltie9) {
                this.$('*').add(this.el).attr('unselectable', 'on');
            }
            return this;
        },
        renderText: function() {
            var value = this.model.get('value');
            return value ? Util.getattr(value, this.textField) : '';
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
            this.focus();
        },
        onMenuHide: function(menu, options) {
            if (options.fromEsc){
            this.focus();
            }
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
            this.weeks = config.weeks || false;
            this.model = config.model || new (Util.pop(config, 'modeltype', '') || this.defaultmodel)(config, {parse:true});
            this.valueField = config.valueField || 'value';
            ControlView.initialize.call(this, config);

            // Add the button
            this.$el.append('<button class="calendar" tabindex="-1"></button>');

            // and the text control
            this.textcontrol = new Text({model: this.model, valueField: this.valueField});
            this.$el.append(this.textcontrol.render().el);
            this.listenTo(this.textcontrol, 'controlblur', this.onTextControlBlur, this);
            this.listenTo(this.model, 'change:' + this.valueField, this.onModelChangeValue, this);
        },
        render: function() {
            this.$el.toggleClass('tiki-disabled', !!this.model.get('disabled'));
            this.$el.toggleClass('invalid', !!this.model.validationError);
            return this;
        },
        onModelChangeValue: function(model, value) {
            if(model.previous(this.valueField) == null && value == null)  // traits2
                return;
            this.hideDatePicker();
            this.render();
            var valueToSend = {};
            valueToSend[this.valueField] = value;
            this.$el.trigger('change', valueToSend);
        },
        onTextControlBlur: function() {
            this.$el.toggleClass('invalid', !!this.model.validationError);
            // this.$el.trigger('controlblur')
        },
        getDatePicker: function() {
            // Lazy-create a DatePicker
            if(!this.datepicker) {
                this.datepicker = this.createDatePicker();
                var body = this.el.ownerDocument.body;

                this.datepicker.alignTo(this.$('button.calendar'), {my: 'left top', at: 'left bottom'});
                this.datepicker.$el.on('keydown', _.bind(this.onDatePickerKeyDown, this));
                this.datepicker.$el.on('focusleave', _.bind(this.onDatePickerFocusLeave, this));
                this.datepicker.$el.addClass('flying');
            }
            return this.datepicker;
        },
        createDatePicker: function() {
            return new DatePicker({
                model: this.model,
                valueField: this.valueField,
                weeks: this.weeks
            });
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
                monthdd = calendar.monthDropdown || {};

            // don't hide if losing focus to a year or month dropdown
            if(newFocused != yeardd.el && newFocused != monthdd.el)
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
            var weeks = config.weeks || false;
            this.model = config.model || new (Util.pop(config, 'modeltype', '') || this.defaultmodel)(config, {parse:true});
            this.valueField = config.valueField || "value";
            ControlView.initialize.call(this, config);

            var date = Util.getattr(this.model, this.valueField);
            this.calendar = this.createCalendar(date, weeks);
            this.listenTo(this.calendar, 'dropdownhide', this.focus);
            this.listenTo(this.calendar, 'calendarModelChanged', this.onCalendarModelChanged);
            this.$el.append(this.calendar.render().el);
            this.listenTo(this.model, 'change' + this.valueField, this.onModelChange, this);
        },
        render: function() {
            this.calendar.$('.day.hovered').removeClass('hovered');
            var date = Util.getattr(this.model, this.valueField);
            this.calendar.$('.day.selected').removeClass('selected');
            if(date) {
                var ymd = Util.dateToYMD(date);
                this.calendar.$('.day[data-ymd="'+ymd+'"]').addClass('selected');
            }
            return this;
        },
        createCalendar: function(date, weeks) {
            return new Calendar.MonthCalendar({date: date || new window.Date(), weeks: weeks });
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
            var date = Util.getattr(this.model, this.valueField);
            this.calendar.model.set('date', date);
            this.render();
        },
        onCalendarModelChanged: function(){
            this.calendar.$('.day.selected').removeClass('selected');
            var selectedDate = Util.getattr(this.model, this.valueField);
            if(selectedDate){
                var viewDate = this.calendar.model.date;
                if(selectedDate.getYear() === viewDate.getYear()
                    && selectedDate.getMonth() === viewDate.getMonth()){
                    var ymd = Util.dateToYMD(selectedDate);
                    this.calendar.$('.day[data-ymd="'+ymd+'"]').addClass('selected');
                }
            }
        },
        onMouseEnterDay: function(e) {
            this.$('.hovered').removeClass('hovered');
            $(e.target).closest('td').addClass('hovered');
        },
        onKeyDown: function(e) {
            // Support keyboard navigation for selecting a day
            var curr = this.$('.hovered');
            var didFindInitialHoverTarget = !!curr[0];
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
                if(didFindInitialHoverTarget){
                    this.model.set(this.valueField, curr.attr('data-ymd'));
                }
                e.preventDefault();
            }
            if(_.indexOf(arrows, key) !== -1)
                e.preventDefault();

            if(select && select.hasClass('day')) {
                curr.removeClass('hovered');
                select.addClass('hovered');
            }
            else {
                // Change month when navigating off the left or right edge.

                if(left || right) {
                    var newHoverTarget;
                    // First try to check if the previous/next week is in
                    // the currently dusplayed month
                    if(left){
                        var previousWeek = $(curr[0].parentElement.previousSibling);
                        if(previousWeek[0]){
                            newHoverTarget = previousWeek.find('.day:last');
                        }
                    }else if(right){
                        var nextWeek = $(curr[0].parentElement.nextSibling);
                        if(nextWeek[0]){
                            newHoverTarget = nextWeek.find('.day:first');
                        }
                    }
                    // If the previous/next week is in the next/previous month
                    if(!newHoverTarget){
                        var cal = this.calendar;
                        cal[left ? 'showPrevMonth' : 'showNextMonth']();
                        if(left){
                            newHoverTarget = cal.$('tr:last-child td.day:last');
                        }else{
                            newHoverTarget = cal.$('tr:first-child td.day:first');
                        }
                    }
                    curr.removeClass('hovered');
                    newHoverTarget.addClass('hovered');
                }
            }
        },
        onClickDay: function(e) {
            var el = $(e.currentTarget);
            if(el[0]) {
                this.model.set(this.valueField, el.attr('data-ymd'));
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

            this._body.bind('touchmove', this._onbodymousemove);
            this._body.bind('touchstart', this._onbodymousedown);
            this._body.bind('touchend', this._onbodymouseup);

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
            'mousedown': 'onMouseDown',
            'touchstart': 'onMouseDown'
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
            var clientX = e.clientX;
            if (clientX === undefined && e.originalEvent.touches) {
              clientX = e.originalEvent.touches[0].clientX;
            }
            var offsetX = (e.offsetX || clientX - $(e.target).offset().left);

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
            var clientX = e.clientX;
            if (clientX === undefined && e.originalEvent.touches) {
              clientX = e.originalEvent.touches[0].clientX;
            }
            var offsetleft = (clientX - pos.left) - pos.offsetX;

            // If we are in an element that is positioned, we need to count in how far we are scrolled.
            var isPositioned = this.$el.offsetParent().length>0;
            if (isPositioned) {
                offsetleft += $(window).scrollLeft();
            }

            var left = this._calculateLeft(offsetleft);
            left = this.model.parse_value(left);
            this.$('.handle').css('left', (left*100)+'%');
            this.$('.range-min').css('width', (left*100)+'%');
            this.trigger('drag', {slider: this, value: left});
        },
        onSliderDragEnd: function(e, conf) {
            var left = this.$('.handle')[0].style.left; // eg "20%"
            if (!left) {
                left = 0;
            }
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
        Date: Date,
        DatePicker: DatePicker,
        Slider: Slider,
        SliderModel: SliderModel
    };


});