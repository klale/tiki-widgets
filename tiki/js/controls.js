define([
    'jquery',
    'underscore',
    'backbone',
    './util',
    './controlmodels',
    './calendar',
    './menu',
    './tools'
], function($, _, Backbone, Util, controlmodels, Calendar, Menu, Tools) {
    'use strict';
    
    /*
    What is a control?
    - It's a form control (http://www.w3.org/TR/html401/interact/forms.html#form-controls)
    - It's a View with a Model.
    - The Model is store the control's value at model.get('value')
    - The Model can have other attributes. Such as 'enabled' and 'options'.
      But it only has one value, at model.get('value')
    - The value can be of any type. Anything from a simple scalar, to a Date object, Collection or model.
    - getValue is expected to serialize this value into something JSON compatible that
      you want to send back to a server or put in a localstorage. 
      If value is a Collection of bloated models,
      you might want to serialize it to a simple array of IDs.
    - A control inside a form must also have a model.get('name') 
    
    Minimal control example
    ---------------------
    var FooModel = Backbone.Model.extend({
        initialize: function(config) {
        },
        getValue: function() {
            return this.get('value');
        }
    });
    
    var Foo = Backbone.View.extend({
        initialize: function(config) {
            this.model = new Backbone.Model({
                name: 'foo'
            });
        }
    });


    Create a control from a dom element
    ---------------------------------
    [docs here]
    
    
    Form example
    ------------
    A form has 
     - an array of control models (not views).
     - a model, storing a serialized copy of each control's value.
     
    var f = new form.Form({
        controls: [
            new form.DateModel({id: 'bar', viewtype='text'}),
            new form.({id: 'bar', viewtype='text'}),
            {id: 'foo', viewtype='text', modeltype='date', value='now'},

        ],
        values: {               // <-- pass a Model or an object literal (which becomes a vanilla Model)
            'bar': '2014-01-30'
        }
    })
    
    Use with standard form controls
    -------------------------------
    [implement this, then document it]
    Use eg a <select name="foo" multiple>...</select> as the View for 
    a SelectionModel.
    */





    /*
    Utility function for creating a Control instance from
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
        this._detachedEl.html(this.model.getValue());
        this._detachedEl.insertBefore(this.el);
        this.$el.detach();
    };

    
    // =========
    // = Views =
    // =========
    var Text = Tools.View.extend({
        className: 'tiki-text',
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
        defaultmodel: controlmodels.StringModel,
    
        initialize: function(config) {
            config = config || {};
            this.model = config.model || new (Util.pop(config, 'modeltype', '') || this.defaultmodel)(config);
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
            this.$el.toggleClass('tiki-disabled', !this.model.get('enabled'));
            return this;
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
            var text = this.$el.getPreText(),
                wasInvalid = !!this.model.validationError;

            this.model.set({'value': text}, {validate: true});
            if(wasInvalid && !this.model.validationError)
                // there is a small change the new value above is the same as
                // before making it invalid, not triggering change -> render.
                this.render();

            this.trigger('controlblur');
            this.$el.trigger('controlblur');
        },
        onReturnKeyDown: function(e) {        
            // Set value immediately when pressing Return, as the event
            // may continue upwards to a form, triggering a submit.
            var v = this.$el.getPreText();
            this.model.set('value', v);
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
                html = renderer ? renderer(this) : this.model.getFormattedValue();

            this.$el.attr('name', name).html(Util.makePreText(html || ''));
            this.$el.toggleClass('invalid', !!this.model.validationError);
            this.$el.toggleClass('tiki-disabled', !this.model.get('enabled'));
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
        defaultmodel: controlmodels.StringModel,
    
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



    var Checkbox = Tools.View.extend({
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
        defaultmodel: controlmodels.BoolModel,
    
        initialize: function(config)  {
            this.model = config.model || new (Util.pop(config, 'modeltype', '') || this.defaultmodel)(config);
            this.listenTo(this.model, 'change:value', this.onModelChange, this);
            if(config.el) {
                this.$el.attr(this.attributes || {});
                this.$el.addClass(this.className);                
            }
        },
        render: function() {
            this.$el.toggleClass('tiki-checked', this.model.get('value'));
            this.$el.html(this.model.get('text') || '');
            this.$el.attr('name', this.model.get('name'));
            // this.el.hideFocus = true;
            return this;
        },
        attackElement: attackElement,
        leaveElement: leaveElement,
        onModelChange: function(model) {
            this.$el.toggleClass('tiki-checked', model.get('value'));            
        },
        onClick: function(e) {             
            e.preventDefault();
            if(this.$el.closest('.tiki-disabled').length) {
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
            if(!this.$el.closest('.tiki-disabled')[0]) {
                this.$el.addClass('active');
            }
        }
    });

    var Radio = Checkbox.extend({
        className: 'tiki-radio',
        initialize: function(config)  {
            this.model = config.model || new (Util.pop(config, 'modeltype', '') || this.defaultmodel)(config);
            this.listenTo(this.model, 'change:value', this.onModelChange, this);
            this.$el.attr(this.attributes || {}).addClass(this.className);
        },
        onClick: function(e) {             
            e.preventDefault();
            if(this.$el.closest('.tiki-disabled')[0])
                return;
            this.model.set('value', true);
            this.$el.removeClass('active');
        }
    });


    var CheckboxGroup = Tools.View.extend({
        tagName: 'ul',
        className: 'tiki-checkboxgroup',
        defaultmodel: controlmodels.SelectionModel,
    
        initialize: function(config)  {
            _.bindAll(this, 'onCheckboxValueChange', 'render');
            config = config || {};
            this.model = config.model || new (Util.pop(config, 'modeltype', '') || this.defaultmodel)(config, {parse:true});

            this.views = {};
            this.listenTo(this.model, 'change', this.render);
            this.listenTo(this.model.get('options'), 'all', this.render);
            this.listenTo(this.model.get('value'), 'all', this.render);
        },
        render: function() {
            // console.log('RE-RENDER all checkboxes')
            
            this.model.get('options').each(function(model) {
                this.removeOne(model);
            }, this);
            
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
            var view = Util.pop(this.views, model.cid, null);
            if(view)
                view.remove();
        },
        attackElement: attackElement,
        leaveElement: leaveElement,
        onCheckboxValueChange: function(model) {
            var checked = model.get('value');
            this.model.get('value')[checked ? 'add':'remove'](model);
        }
    });





    var RadioGroup = Tools.View.extend({
        tagName: 'ul',
        className: 'tiki-radiogroup',
        // Todo: Write a SingleSelectionModel
        defaultmodel: controlmodels.SelectionModel,
    
        initialize: function(config)  {
            _.bindAll(this, 'onRadioValueChange');
            config = config || {};
            this.model = config.model || new (Util.pop(config, 'modeltype', '') || this.defaultmodel)(config, {parse:true});

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
            Util.pop(this.views, model.cid).remove();
        },
        attackElement: attackElement,
        leaveElement: leaveElement,
        onRadioValueChange: function(model) {
            var checked = model.get('value');
            if(checked) {
                // Unselect current radio, if any
                var curr = this.model.get('value').at(0);
                if(curr)
                    curr.set('value', false);
                // Update the selection. Todo: finish the singleselectionmodel
                this.model.get('value').set(model);
            }
        }
    });    




  

    var Combo = Tools.View.extend({
        className: 'tiki-combo',
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
        defaultmodel: controlmodels.SingleSelectionModel,
    
        initialize: function(config) {       
            config = config || {};
            _.bindAll(this, 'onMenuChoose', 'onMenuHide');
            this.model = config.model || new (Util.pop(config, 'modeltype', '') || this.defaultmodel)(config, {parse:true});
            this.listenTo(this.model, 'change', this.render, this);
            this.listenTo(this.model.get('value'), 'reset', this.render, this);
            
            // Create the dropdown menu
            this.menu = new Menu.Menu({
                options: config.options
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
            if(this.$el.closest('.tiki-disabled').length) {
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
            this.model.trigger('change:value', this.model, e.model.id);
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
        defaultmodel: controlmodels.DateModel,
    
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
            this.$el.toggleClass('tiki-disabled', !this.model.get('enabled'));
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
        defaultmodel: controlmodels.DateModel,
    
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
            checkbox: Checkbox,
            checkboxgroup: CheckboxGroup,
            radio: Radio,
            radiogroup: RadioGroup,
            combo: Combo,
            date: Date,
            datepicker: DatePicker
        },
        Text: Text,
        TextArea: TextArea,
        Hidden: Hidden,
        Checkbox: Checkbox,
        CheckboxGroup: CheckboxGroup,
        Radio: Radio,
        RadioGroup: RadioGroup,
        Combo: Combo,
        Date: Date,
        DatePicker: DatePicker
    };


});