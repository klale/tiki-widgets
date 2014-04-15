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
            if($.browser.ltie9)
                this.$el.on('mousedown', _.bind(this.onIEMouseDown, this));
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
                return Globalize.format(value || '', format);                
            return value;
        },
        

        // ===================
        // = Control interface =
        // ===================
        focus: function() {
            if(this.$el.closest('.tiki-disabled')[0]) 
                return; // ie7/8
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
            var text = this.$el.getPreText();
            this.model.set({'value': text}, {validate: true});

            // It might require a render now even if the model is untouched
            this.render();
            this.trigger('controlblur');
            this.$el.trigger('controlblur');
        },
        onReturnKeyDown: function(e) {        
            // Set value immediately when pressing Return, as the event
            // may continue upwards to a form, triggering a submit.
            var v = this.$el.getPreText();
            this.model.set('value', v);
            this.render();
            // Don't allow newlines in a text control
            e.preventDefault();
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
        },
        onIEMouseDown: function(e) {
            if(this.$el.closest('.tiki-disabled').length) {
                e.preventDefault(); // don't focus
                var focusable = this.$el.parent().closest('*:focusable');
                window.setTimeout(function() { focusable.focus(); }, 1); 
            }
        }
    });



    var TextArea = Text.extend({
        className: 'tiki-textarea',
        hotkeys: {
            'keydown return': 'onReturnKeyDown'
        },
        attributes: {   // <---- TODO: If not repeated here, className:'tiki-textarea' is set on form.Text as well
            tabindex: 0, 
            contentEditable: true
        },
        merge: ['hotkeys'],

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
            // Remove exactly 1 leading newline
            text = text.replace(/\n/, '');
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





    var Checkbox = {};
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
        defaultmodel: ControlModels.Selected,
    
        initialize: function(config)  {
            if(!this.model)
                this.model = new (Util.pop(config, 'modeltype', '') || this.defaultmodel)(config);
                
            this.listenTo(this.model, 'change:name', this.onNameChange, this);    
            this.listenTo(this.model, 'change:text', this.onTextChange, this);    
            this.listenTo(this.model, 'change:selected', this.onSelectedChange, this);
            this.listenTo(this.model, 'change:disabled', this.onDisabledChange, this);
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
        onDisabledChange: function(model, disabled) {
            this.$el.toggleClass('tiki-disabled', disabled);
        },
        onNameChange: function(model, name) {
            this.$el.attr('name', this.model.get('name'));
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
    
        initialize: function(config)  {
            config = config || {};
            if(!this.model)
                this.model = new (Util.pop(config, 'modeltype', '') || this.defaultmodel)(config);

            this.views = {};
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
    Dropdown.View = Tools.View.extend({
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
        defaultmodel: ControlModels.SingleSelectionM,
        mixins: [ControlView],
    
        initialize: function(config) {       
            config = config || {};
            _.bindAll(this, 'onMenuSelect', 'onMenuHide');
            if(!this.model)
                this.model = new (Util.pop(config, 'modeltype', '') || this.defaultmodel)(config);

            ControlView.initialize.call(this, config);
            var options = this.model.get('options');
            this.listenTo(options, 'change:selected', this.onSelectedChange, this);

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
            this.model.set('value', optionModel);
        },
        onSelectedChange: function(model, selected) {
            if(selected)
                this.$el.html(this.template({text: model.get('text')}));            
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
    
        initialize: function(config)  {
            config = config || {};
            this.model = config.model || new (Util.pop(config, 'modeltype', '') || this.defaultmodel)(config, {parse:true});
            // Pass this.model into the text control
            this.textcontrol = new Text({model: this.model});
            this.listenTo(this.textcontrol, 'controlblur', this.onTextControlBlur, this);
            this.listenTo(this.model, 'change', this.onModelChange, this);
        },
        render: function() {
            this.$el.empty().append('<button class="calendar" tabindex="-1"></button>');
            this.$el.append(this.textcontrol.render().el);
            this.textcontrol.delegateEvents();
            this.$el.toggleClass('tiki-disabled', this.model.get('disabled'));
            this.$el.toggleClass('invalid', !!this.model.validationError);
            return this;
        },
        onModelChange: function() {
            this.hideDatePicker();
            this.render();
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
                this.datepicker.$el.on('focusleave', _.bind(this.hideDatePicker, this));
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
    
        initialize: function(config)  {
            config = config || {};
            this.model = config.model || new (Util.pop(config, 'modeltype', '') || this.defaultmodel)(config, {parse:true});
            
            this.calendar = new Calendar.MonthCalendar({date: this.model.get('value')});
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


    return {
        register: {
            text: Text,
            textarea: TextArea,
            hidden: Hidden,
            checkbox: Checkbox.View,
            checkboxgroup: CheckboxGroup.View,
            radio: Radio.View,
            radiogroup: RadioGroup.View,
            dropdown: Dropdown.View,
            date: Date,
            datepicker: DatePicker
        },
        Text: Text,
        TextArea: TextArea,
        Hidden: Hidden,
        Checkbox: Checkbox.View,
        CheckboxGroup: CheckboxGroup.View,
        Radio: Radio.View,
        RadioGroup: RadioGroup.View,
        RadioGroupModel: RadioGroup.Model,        
        Dropdown: Dropdown.View,
        Date: Date,
        DatePicker: DatePicker
    };


});