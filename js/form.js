define([
    'jquery', 
    'underscore',
    'backbone',
    './base',
    './calendar',
    './dropdown',
    'iframetransport',
    'jquery-ui'
], function($, _, Backbone, gui, calendar, dropdown) {

var form = {};

/**
    A collection of gui.Field objects
*/
form.Form = function(conf) {
    conf = conf || {};
    this.fields = {};
    
    if(conf.fields) {
        if(!_.isArray(conf.fields))
            throw new TypeError('Expected fields to be a list of gui.Field objects');
    
        // Build a name -> <field object> map    
        for(var i=0,f; f=conf.fields[i]; i++) {
            if(!f.name) 
                throw new Error('Field must have a name');
            this.fields[f.name] = f;
        }
    }
};
_.extend(form.Form.prototype, Backbone.Events, {    
    getValues: function() {
        var values = {};
        _.each(this.fields, function(f) {
            values[f.name] = f.getValue() || '';
        });
        return values;        
    },
    setValues: function(values) {
        _.each(this.fields, function(f, key) {
            f.setValue(f.interpret(values[key]));
            f.render();
        });        
    }
});
form.Form.extend = Backbone.View.extend;


form.TabChain = {
    render: function() {
        var focusable = this.$('*:focusable');
        var first = focusable.first(),
            last = focusable.last();
        focusable.first().on('keydown', function(e) {
            if(e.which == gui.keys.TAB && e.shiftKey) { 
                last.focus();
                e.preventDefault();
            }               
        });            
        focusable.last().on('keydown', function(e) {
            if(e.which == gui.keys.TAB && !e.shiftKey) {
                first.focus();
                e.preventDefault();
            }
        });            
    }
}



function pasteHtmlAtCaret(html) {
    var sel, range;
    if (window.getSelection) {
        // IE9 and non-IE
        sel = window.getSelection();
        if (sel.getRangeAt && sel.rangeCount) {
            range = sel.getRangeAt(0);
            range.deleteContents();

            // Range.createContextualFragment() would be useful here but is
            // non-standard and not supported in all browsers (IE9, for one)
            var el = document.createElement("div");
            el.innerHTML = html;
            var frag = document.createDocumentFragment(), node, lastNode;
            while ( (node = el.firstChild) ) {
                lastNode = frag.appendChild(node);
            }
            range.insertNode(frag);

            // Preserve the selection
            if (lastNode) {
                range = range.cloneRange();
                range.setStartAfter(lastNode);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
            }
        }
    } else if (document.selection && document.selection.type != "Control") {
        // IE < 9
        document.selection.createRange().pasteHTML(html);
    }
}


form.Field = {
    /**
    A field is an input point for the user. Its value is stored in $(this.el).data('value').
    The stored value is always in a json-transportable format. eg "test", 123, {a:1, b:2}, 
    but not a <object Date>.
        
    Example "form":
    -------------------------
    var SignupView = Backbone.View.extend({
        render: function() {
            // Create a form
            this.form = new gui.Form({fields:
                new gui.TextField({name: 'title', value: 'I am a value'}),
                new gui.TextArea({name: 'description'})
            });
            
            // Change the value of the title
            var fields = this.form.fields;
            fields.title.setValue('The new value');
            
            // ..or set many values from a dict
            this.form.setValues({
                title: 'Test title',
                description: 'Bla bla bla'
            });
          
            // Log all current values
            console.log(this.form.getValues());
        },
    });
    
    
    Different versions describing the same value:
    - A pretty version. 
    - The value deserialized into javascript land
    - The value serialized into something that can be 
      transported (as json in most cases)
    
    Rendering the value
    - format and shove string into a <div..></div>
    - The value could deserialize into a Collection of Models, which
      is fed to a view, which in turn renders a list of stuff.
    
    setValue/getValue:
    - Implement as you like, as log as the stored value is json serializable.
    - setValue and getValue only deal with the json transportable 
      format. (eg a js Date object is never returned from a .getValue())
    - setValue does not trigger an implicit re-render.
    
    interpret(v):
    - Accepts a string (or other types?) and returns an interpreted value 
      in its trasportable format.


    nodeField.getValue()
    >>> ['1234', '38272']
    dateField.setFormat('epoch');
    dateField.getValue()
    >>> 1338887000000
    dateField.setFormat('YYYY-MM-DD');
    dateField.getValue()
    >>> '2012-06-05'
    */    
    // initialize: function(config) {
    //     config = config || {};
    //     this.name = config.name || '';
    //     if(config.value !== undefined) {
    //         this.setValue(config.value);
    //     }
    //     if(config.el) {
    //         this.el = config.el;
    //         this.$el = $(config.el);
    //     }
    // },
    initialize: function(config) {
        this.name = config.name;
        this.required = config.required;        
        this.label = config.label;
        this.config = config;

        // Set config.value or config.default
        if(config.value !== undefined)
            this.setValue(config.value);
        else if(config['default'] !== undefined)  // cannot use foo.default in IE
            this.setValue(config['default']);
    },
    interpret: function(value) {
        if(value === '') 
            return undefined;
        return value;
    },    
    setValue: function(value, options) {
        options = options || {};
        // var old = $(this.el).data('value');
        var old = this.value;
        if(old !== value) {                
            // if(value === undefined) {
            //     $(this.el).removeData('value', value);
            // }                
            // else {
            //     $(this.el).data('value', value);
            // }
            this.value = value;
            if(!options.silent) {
                this.trigger('change', {field: this, value: value});
                this.$el.trigger('fieldchange', {field: this, value: value, name: this.name})
            }
        }
    },
    unsetValue: function(options) {
        options = options || {};
        // var old = this.$el.data('value');
        var old = this.value;
        if(old !== undefined) {
            // $(this.el).removeData('value');
            this.value = value;
            if(!options.silent) {
                this.trigger('change', {field: this});            
                this.$el.trigger('fieldchange', {field: this, name: this.name})
            }
        }
    },
    getValue: function() {      
        // return $(this.el).data('value');
        return this.value;
    }
};


/**
A mixin for intercepting paste (ctrl+v) operations.
When user hits ctrl+v, the default paste is cancelled, and
instead an event "paste" is triggered, carrying the browser
event and the pasted text.

Example
--------------------
var KalleTextField = gui.TextField.extend({
    mixins: [gui.Field, gui.InterceptPaste],
    
    initialize: function(config) {
        gui.TextField.prototype.initialize.call(this, config);
        gui.InterceptPaste.initialize.call(this);
        this.on('paste', this.onPaste, this);
    },
    onPaste: function(e) {
        var data = e.data.replace(/kalle/g, 'hassan');
        WysiHat.Commands.insertHTML(data);
    }
});


*/
form.InterceptPaste = {
    initialize: function() {
        this.$el.bind('paste', $.proxy(this._onPaste, this));
    },
    _onPaste: function(e) {
        var ev = e.originalEvent,
            el = $('<div></div>')[0],
            savedcontent = el.innerHTML,
            data = '';
        if(ev && ev.clipboardData && ev.clipboardData.getData) { // Webkit
            if (/text\/html/.test(ev.clipboardData.types)) {
                var data = ev.clipboardData.getData('text/html');
            }
            else if (/text\/plain/.test(ev.clipboardData.types)) {
                var data = ev.clipboardData.getData('text/plain');
            }
            this.trigger('paste', {e: e, data: data});
            e.stopPropagation();
            e.preventDefault();
            return false;
        } else {
            function wait() {
                if(el.childNodes && el.childNodes.length > 0)
                    this.processPaste(el.innerHTML);
                else
                    setTimeout(wait,1000);         
            }
            wait();
            return true;
        }        
    }
};


/** 
A TextField
 
   ..typing something.. 
   --> this.setValue(this.interpret($(this.el).html()))
   --> this.render()
   ..model changes..
   --> this.render()
*/ 
form.TextField = Backbone.View.extend({
    tagName: 'div',
    className: 'textfield',
    attributes: {
        tabindex: '0', 
        contentEditable: 'true'
    },
    events: {
        'keydown': 'onKeyDown',
        'keyup': 'onKeyUp',
        'focus': 'onFocus',
        'blur': 'onBlur'
    },
    mixins: [form.Field],
    
    initialize: function(config) {
        config = config || {};
        form.Field.initialize.call(this, config);
        this.emptytext = config.emptytext || '';

        if($.browser.ltie9) 
            this.$el.iefocus();        
    },  
    getValue: function() {         
        return form.Field.getValue.call(this) || '';
    },
    format: function(value) {
        // make the value pretty
        return value;
    },
    interpret: function(value) {
        // make a pretty value real
        if(value === '') 
            return undefined;
        return value.replace(/\n/g, '');
    },
    render: function() {
        var v = this.getValue();
        if(this.emptytext && v === undefined)
            this.$el.addClass('empty').html(this.emptytext);
        else
            this.$el.removeClass('empty').html(this.format(v));
        this.$el.attr('name', this.name);
        this.delegateEvents();
        return this;
    },
    abort: function() {
        $(this.el).html(this.format(this.getValue()));
    },
    onFocus: function(e) {
        if($(this.el).is('.empty'))
            $(this.el).removeClass('empty').html('');            

        var keydown = gui._keyDownEvent;
        if(keydown && keydown.keyCode == gui.keys.TAB)
            this.$el.moveCursorToEnd();            
    },     
    onBlur: function(e) {
        var v = this.interpret(this.$el.getPreText());        
        if(v !== this.getValue()) {
            this.setValue(v);
            this.render();            
        }
    },
    onKeyDown: function(e) {
        if(e.keyCode == gui.keys.ENTER) {
            e.preventDefault();
            return;
        } else if(e.keyCode == gui.keys.ESC) {
            this.abort();
        }
        gui._keyDownEvent = e;
        // e.stopPropagation();
    },
    onKeyUp: function(e) {
        if(e.keyCode == gui.keys.ENTER) {
            e.preventDefault();
            e.stopPropagation();
        }
        gui._keyDownEvent = null;        
    }
});

form.TextArea = form.TextField.extend({
    className: 'textarea',
    
    initialize: function(config) {
        form.TextField.prototype.initialize.call(this, config);
    },
    onBlur: function(e) {        
        var value = this.interpret(this.$el.html());

        if(value !== this.getValue()) {
            this.setValue(value);          
        }
    },
    render: function() {
        var v = this.getValue();
        if(this.emptytext && v === undefined)
            this.$el.addClass('empty').html(this.emptytext);
        else
            this.$el.removeClass('empty').html(this.format(v));
        this.$el.attr('name', this.name);
        this.delegateEvents();
        return this;
    },        
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
    format: function(value) {
        // Upgrade.
        // The raw form.TextArea value is stored as plain text with \n
        // as exepected. Convert this proper html. 
        // Moz uses <br>, webkit uses <div>, and IE uses <p>.
        if($.browser.mozilla) {
            return value.trim().replace('\n', '<br>');
        }
        
        var out = $('<div></div>');
        _.each(_.compact(value.split('\n')), function(line) {
            if($.browser.msie) {
                out.append('<p>'+line+'</p>');
            }
            else if($.browser.webkit || $.browser.chrome) {
                out.append('<div>'+line+'</div>');
            }
        });
        
        return out.html();
    
    },        
    onKeyDown: function(e) {
        if(e.keyCode == gui.keys.ESC) {
            this.abort();
        }
        e.stopPropagation();
    },
    onKeyUp: function() {
        
    },
    onFocus: function(e) {
        if(this.$el.is('.empty')) {
            this.$el.removeClass('empty').html('');
        }
    }
})


form.AmountField = form.TextField.extend({
    initialize: function(config) {
        form.TextField.prototype.initialize.call(config);
    },
    format: function(v) {
        // make value pretty
        return accounting.formatMoney(v);
    },
    interpret: function(v) {
        // Todo: code dup of form.TextField.interpret
        var v = value.replace('<br>', ''); // contenteditable
        if(v === '') 
            return undefined;
        
        // Todo: finish implmentation
    }
});




// form.DateField = form.TextField.extend({
form.DateField = Backbone.View.extend({
    tagName: 'div',
    className: 'datefield',
    mixins: [form.Field],
    attributes: {
        tabIndex: '0'
    },
    events: {
        'keydown': 'onKeyDown',
        'keyup': 'onKeyUp',
        'click button.calendar': 'showDatePicker'
    },
    template: _.template(''+
        '<button class="calendar"></button>'+
        '<div class="textfield" contenteditable="true" tabindex="0"></div>'
    ),

    dateManip: /^([\+\-])?(\d{0,3})(\w)?$/,
    iscompactdate: /^(\d{2,4})(\d{2})(\d{2})$/,
    yyyymmdd: /^(\d{4})(\d{2})(\d{2})$/,
    yymmdd: /^(\d{2})(\d{2})(\d{2})$/,
    
        
    initialize: function(config) {
        config = config || {};
        this._format = config.format || 'YYYY-MM-DD';
        if(config.value)
            config.value = this.interpret(config.value);
        form.Field.initialize.call(this, config);
        
        this.on('change', this.onChange, this);
    },
    render: function() {
        var val = this.getValue();
        this.$el.html(this.template());
        var text = this.format(val);
        this.$('.textfield').html(text);
        this.$('.textfield').bind('blur', $.proxy(this.onBlur, this));
        this.$('.textfield').bind('focus', $.proxy(this.onFocus, this));
        if($.browser.ltie9)
            this.$('.textfield').iefocus();    


        this.delegateEvents();                
        return this;
    },
    interpret: function(s) {
        // make a pretty value real, (was "unformat")
        // s = String(s || '').replace('<br>', '');
        var s = $('<div>'+s+'</div>').getPreText();
        var d;
        if(s == 'now') {
            var now = new Date();
            d = moment(new Date(now.getFullYear(), now.getMonth(), now.getDate())); // trim time
        }
        else if(s && this.dateManip.test(s)) {
            // Date manipulation
            // >>> dateManip.exec('+1d')
            // ["+1d", "+", "1", "d"]
            var s = this.dateManip.exec(s);
            var method = s[1] == '-' ? 'subtract' : 'add';
            var unit = s[3] || 'd';
            var num = parseInt(s[2]);    
            d = moment(parseInt(this.getValue()))[method](unit, num);
        }
        else if(/^\d+$/.test(s)) {
            // Timestamp, millis, eg 1328137200000
            return parseInt(s);
        }        
        else if(s) {
            if(this.iscompactdate.test(s)) {
                // This doesn't work in Moment for some reason
                // d = moment(s, "YYYYMMDD");                
                var matcher = this.yyyymmdd.test(s) ? this.yyyymmdd : this.yymmdd;
                var gr = matcher.exec(s);
                var year = parseInt(gr[1]) > 1000 ? gr[1] : parseInt(gr[1])+2000;
                d = moment((new Date(year, gr[2]-1, gr[3])).getTime()); // month is zero-based
            } else {
                d = moment(s, this._format);
            }
        }
        if(d)
            return d.toDate().getTime();
    },
    format: function(value) {
        // Make the value pretty. value = millis since epoch
        if(!value)
            return '';
        try {
            return moment(value).format(this._format);
        } catch(e) {}
    },
    abort: function() {
        this.$('.textfield').html(this.format(this.getValue()));
    },
    _setValue: function() {
        var v = this.interpret(this.$('.textfield').html());
        if(v !== this.getValue()) {
            this.setValue(v);
            this.render();  
        }
    },
    getDatePicker: function() {
        // Lazy-create a DatePicker 
        if(!this.datepicker) {
            this.datepicker = new form.DatePicker({ 
                value: this.getValue()
            });
            this.datepicker.$el.hide();
            this.datepicker.render();
            this.datepicker.on('change', this.onDatePickerChange, this);
            this.datepicker.$el.bind('blur', $.proxy(this.onDatePickerBlur, this));
            this.datepicker.$el.bind('keydown', $.proxy(this.onDatePickerKeyDown, this));
            $(document.body).append(this.datepicker.el);
        }
        return this.datepicker;
    },
    showDatePicker: function() {
        var datepicker = this.getDatePicker();
        datepicker.setValue(this.getValue(), {silent: true});
        // show today's date if no date is set
        datepicker.date = moment(this.getValue() || new Date());
        datepicker.render();
        datepicker.$el.show();
        datepicker.alignTo(this.$('button.calendar'));
        datepicker.el.focus();
    },
    focus: function(e) {
        var textfield = this.$('.textfield');
        if(!textfield.is(':focus'))
            textfield.focus().selectAll();
    },    
    onFocus: function(e) {
        var evt = gui._keyDownEvent;
        if(evt && evt.keyCode == gui.keys.TAB) {
            this.$('.textfield').selectAll();
        }
    },
    hideDatePicker: function() {
        if($.browser.ltie9)
            this.datepicker.$el.hide();
        else
            this.datepicker.$el.fadeOut(150);
        this.focus();
    },
    onBlur: function(e) {
        this._setValue();
    },

    onChange: function(e) {
        // Update the datepicker
        var datepicker = this.getDatePicker();
        datepicker.setValue(e.value, {silent: true});
        if(datepicker.$el.is(':visible')) 
            datepicker.render();
    },
    onDatePickerChange: function(e) {
        this.hideDatePicker();
        this.setValue(e.value);
        this.render();
        this.focus();
    },
    onDatePickerBlur: function() {
        this.hideDatePicker();
    },
    onKeyDown: function(e) {
        if(e.keyCode == gui.keys.ESC)
            this.hideDatePicker();
            
        if(e.keyCode == gui.keys.DOWN) {
            this._setValue();
            this.showDatePicker();
            e.preventDefault();
            e.stopPropagation();
        } else {
            form.TextField.prototype.onKeyDown.call(this, e);
        }
    },
    onKeyUp: function(e) {
        if(e.keyCode == gui.keys.ENTER) {
            e.preventDefault();
            e.stopPropagation();
        }
    },    
    onDatePickerKeyDown: function(e) {
        if(e.keyCode == gui.keys.ESC) {
            this.hideDatePicker();
        }
    }
});






form.DatePicker = calendar.MonthCalendar.extend({
    className: 'calendar datepicker',
    
    // TODO: replace this uglyness with the new SubView mixin?
    events: _.extend(_.clone(calendar.MonthCalendar.prototype.events), {
        'mouseenter tbody td.day': 'onMouseEnterDay',
        'keydown': 'onKeyDown',
        'click .day': 'onClick'
    }),
    mixins: [form.Field],
    
    initialize: function(conf) {
        form.Field.initialize.call(this, conf);
        calendar.MonthCalendar.prototype.initialize.call(this, conf);
    },
    render: function() {
        calendar.MonthCalendar.prototype.render.call(this);
        if($.browser.ltie9)
            this.$el.iefocus();
        $(this.el).attr('tabIndex', '-1');
        
        if(this.getValue()) {
            var ymd = moment(this.getValue()).format('YYYY-MM-DD');
            this.$('.day[data-ymd="'+ymd+'"]').addClass('selected');
        }
    
        if($.browser.ltie9)
            // IE fires blur when touching a child table. Add unselectable="on" to 
            // everything as a workaround.        
            this.$('th, td, div').attr('unselectable', 'on');        
        return this;
    },
    alignTo: function(el) {
        // var offset = $(el).screen();
        // this.$el.css({
        //     left: offset.left,
        //     top: offset.top + $(el).outerHeight()
        // });
        this.$el.position({
            my: 'left top',
            at: 'right top',
            of: el,
            collision: 'flip fit',
            within: window
        });
    },
    onMouseEnterDay: function(e) {
        var td = $(e.target).parents('*').andSelf().filter('td:first');
        this.$('.selected').removeClass('selected');
        td.addClass('selected');
    },
    onKeyDown: function(e) {
        // Support keyboard navigation for selecting a day
        var curr = this.$('.selected');
        if(!curr[0]) curr = this.$('.today');
        if(!curr[0]) curr = this.$('.day:first');        
        
        var tr = curr.parents('tr:first'),
            select,
            keys = gui.keys,
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
            var m = moment(curr.attr('data-ymd'), 'YYYY-MM-DD');
            this.setValue(m.toDate().getTime());
            e.preventDefault();
        }
        if(_.indexOf(arrows, key) !== -1) 
            e.preventDefault();
        
        if(select && select.hasClass('day')) {
            curr.removeClass('selected');
            select.addClass('selected');
        }
    },
    onClick: function(e) {
        var el = $(e.currentTarget);
        if(el[0]) {
            var m = moment(el.attr('data-ymd'), 'YYYY-MM-DD');
            this.setValue(m.toDate().getTime());
        }
    }
});



form.ComboBox = Backbone.View.extend({
    tagName: 'div',
    className: 'combobox',
    template: _.template(''+
        '<i></i>'+
        '<span tabindex="0"><%= text %></span>'+
        '<div class="button"></div>'
    ),
    events: {
        'mousedown': 'onMouseDown',
        'keydown': 'onKeyDown'
    },
    mixins: [form.Field],
    overlay: true,
    
    initialize: function(conf) {
        conf = conf || {};
        this.editable = conf.editable;
        form.Field.initialize.call(this, conf);
        this.options = conf.options || [];
        _.bindAll(this, 'onSpanFocus', 'onSpanBlur', 'onBlur');
        this.on('blur', this.onBlur);
    },
    render: function() {
        // Find the text of the selected option, if any
        
        $(this.el).html(this.template({text: this.getText()}));
        var span = this.$('>span');
        span.on('focus', this.onSpanFocus);
        span.on('blur', this.onSpanBlur);
        
        if($.browser.ltie9) {
            this.$el.iefocus();
            this.$('*').add(this.el).attr('unselectable', 'on');
        }
        return this;
    },     
    getText: function() {
        /* Get the text of the selected option, or emptystring. */
        var text = '',
            value = this.getValue();
        if(value !== undefined)
            _.each(this.options, function(option) {
                if(option.id == value)
                    text = option.text;
            });        
        return text;
    },
    abort: function() {
        this.getDropdown().hide();
        this.el.focus();
    },
    focus: function() {
        this.$('>span').focus();
    },
    getDropdown: function() {
        if(!this.dropdown) {
            var dd  = new dropdown.DropdownList({
                options: this.options,
                overlay: this.overlay
            });
            dd.on('select', this.onDropdownSelect, this);
            dd.$el.bind('keydown', $.proxy(this.onDropdownKeyDown, this));
            dd.on('blur', this.onDropdownBlur, this);
            dd.on('show', this.onDropdownShow, this);
            dd.$el.bind('keypress', $.proxy(this.onDropdownKeyPress, this));
            this.dropdown = dd;
        }
        return this.dropdown;
    },
    showDropdown: function() {
        var dd = this.getDropdown();
        if(!dd.$el.is(':visible')) {
            var pos = this.$el.screen();
            dd.showAt(pos.left, pos.top+this.$el.outerHeight());
            dd.$el.css({'min-width': $(this.el).outerWidth()});
            dd.select(dd.$('li[id="'+this.getValue()+'"]'));
        }
        dd.refresh();
    },
    onMouseDown: function(e) {
        var dropdown = this.getDropdown();
        if(!dropdown.$el.is(':visible')) {
            this.showDropdown();
        }
        e.preventDefault();
    },
    onDropdownShow: function(dropdown) {
        dropdown.focus();
    },    
    onDropdownSelect: function(dropdown, e, selected) {
        this.setValue(this.interpret($(selected).attr('id')));
        this.render();
        this.focus();
    },
    onDropdownKeyDown: function(e) {
        if(e.keyCode == gui.keys.TAB) {
            this.focus();
        }
        else if(e.keyCode == gui.keys.ESC) {
            this.getDropdown().hide();
            this.focus();
            e.stopPropagation();
        }            
    },
    onDropdownBlur: function(e) {
        setTimeout($.proxy(function() { 
            // if(!$(document.activeElement).is('.combobox, .dropdownlist, span'))  {
            var a = document.activeElement;
            if(a!==this.$('>span')[0] && a !== this.getDropdown().el) {
                this.trigger('blur', this);
            }
        },this), 20); // short delay for webkit
    },
    onKeyDown: function(e) {
        var dropdown = this.getDropdown();
        if(e.keyCode == gui.keys.DOWN) {
            this.showDropdown();
            e.preventDefault();
            dropdown.el.focus();
        } 
        else if(dropdown.$el.is(':visible')) {
            if(e.keyCode == gui.keys.ESC) {
                this.abort();
            } else if(e.keyCode == gui.keys.TAB) {
                dropdown.el.focus();
                e.preventDefault();
            }
        }
    },
    onSpanFocus: function() {
        this.$el.addClass('focus');
    },
    onSpanBlur: function() {
        setTimeout($.proxy(function() { 
            var a = document.activeElement;
            if(a!==this.$('>span')[0] && a !== this.getDropdown().el) {
                this.trigger('blur', this);
            }
        },this), 20); // A short delay for webkit
    },
    onBlur: function() {
        this.abort();
        this.$el.removeClass('focus');
    }
    
});

form.EditableComboBox = form.ComboBox.extend({
    /* A cross between a textfield and combobox. */
    className: 'combobox editable',
    attributes: {
        tabIndex: '0'
    },

    render: function() {
        form.ComboBox.prototype.render.call(this);
        this.$('>span')[0].contentEditable = true;               
        
        if($.browser.ltie9)
            this.$('>span').add(this.el).removeAttr('unselectable');
        return this;
    },
    focus: function() {
        this.$('>span')[0].focus();
        var span = this.$('>span');
        span.moveCursorToEnd();        
    },
    abort: function() {
        this.getDropdown().hide();
        this.render();
    },
    getText: function() {
        return this.getValue();
    },
    onBlur: function() {
        // the EditableCombo does a setValue here, SearchableCombo does an abort
        var v = this.interpret(this.$('>span').html());
        this.setValue(v);
        this.$el.removeClass('focus');
        this.abort();
    },
    onMouseDown: function(e) {
        if($(e.target).is('.button'))
            form.ComboBox.prototype.onMouseDown.call(this, e);
    }
});


form.FilteringComboBox = form.ComboBox.extend({
    className: 'combobox searchable',
    overlay: false,

    initialize: function() {
        form.ComboBox.prototype.initialize.apply(this, arguments);
        _.bindAll(this, 'onSpanKeyUp', 'onSpanKeyDown', 'onSpanKeyPress');
    },
    
    render: function() {
        form.EditableComboBox.prototype.render.call(this);
        var span = this.$('>span');
        span.on('keyup', this.onSpanKeyUp);
        span.on('keydown', this.onSpanKeyDown);
        span.on('keypress', this.onSpanKeyPress);

        if($.browser.ltie9)
            span.add(this.el).removeAttr('unselectable');
        return this;
    },
    focus: function() {
        this.$('>span')[0].focus();
        if(this.$el.is('.typing'))
            this.$('>span').moveCursorToEnd();
    },    
    abort: function() {
        this.$el.removeClass('typing').removeClass('editable');
        this.getDropdown().hide();
        this.render();
        this.$('>span')[0].contentEditable = false;
    },    
    startTyping: function(s) {
        if(!this.$el.is('.typing')) {      
            var span = this.$('>span')[0];
            this.$('>span').text(s || '');
            span.contentEditable = true;
            this.$el.addClass('editable').addClass('typing');
            this.showDropdown();
            this.$('>span').moveCursorToEnd();
        }
    },
    showDropdown: function() {
        var dd = this.getDropdown();
        if(!dd.$el.is(':visible')) {
            var pos = this.$el.screen();
            dd.showAt(pos.left, pos.top+this.$el.outerHeight());
            dd.$el.css({'min-width': $(this.el).outerWidth()});
            dd.select(dd.$('li[id="'+this.getValue()+'"]'));
            dd.filter('');
        }
        dd.refresh();
    },
    
    // dropdown events
    onDropdownShow: function(dropdown) {
        dropdown.filter('');
        dropdown.focus();
    },
    onDropdownKeyPress: function(e) {
        this.startTyping(String.fromCharCode(e.which));
    },
    onDropdownSelect: function() {
        form.ComboBox.prototype.onDropdownSelect.apply(this, arguments);
        this.abort();
        this.focus();
    },    
    // Span events
    onSpanFocus: function() {
        this.$el.addClass('focus');
        var d = this.getDropdown();
        if(d.$el.is(':visible') && !d.$el.is(':animated')) { // fading out
            this.startTyping();
        }
    },
    onSpanKeyDown: function(e) {
        var dropdown = this.getDropdown();
        if(e.keyCode == gui.keys.ENTER) {
            e.preventDefault();
            e.stopPropagation();
        }
        if(e.keyCode == gui.keys.ENTER && dropdown.$('li:visible').length == 1) {
            // Only a single visible option? select it on enter
            dropdown._triggerSelect(e, dropdown.$('li:visible')[0]);
            this.abort();
        }
        else if(e.keyCode == gui.keys.ESC) {
            this.abort();
        }        
    },    
    onSpanKeyPress: function(e) {
        if(!this.$el.is('.typing')) { 
            this.startTyping();
        }
    },    
    onSpanKeyUp: function(e) {
        if(this.$el.is('.typing')) {
            var s = this.$('>span').text().replace(/\n/gi, '');
            var dropdown = this.getDropdown();
            dropdown.filter(s); 
            if(dropdown.scrollable) 
                dropdown.scrollable.refresh();
        }
    },
    onBlur: function() {
        // the EditableCombo does a setValue here, SearchableCombo does an abort
        this.abort();
        this.$el.removeClass('focus');
    }
});


form.Slider = Backbone.View.extend({
    tagName: 'div',
    className: 'slider',
    attributes: {
        tabindex: '0'
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
    mixins: [form.Field],
    
    initialize: function(config) {
        config = config || {};
        form.Field.initialize.call(this, config);
        this.steps = config.steps;
        this.precision = config.precision;
    },  
    render: function() {
        this.$el.html(this.template());
        if($.browser.ltie9) {
            this.$('*').attr('unselectable', 'on');
            this.$el.iefocus();
        }
        
        var value = this.getValue();
        if(value)  { // !== undefined 
            this.$('.handle').css('left', (value*100)+'%');
            this.$('.range-min').css('width', (value*100)+'%');            

        }      
        return this;
    },
    interpret: function(value) {
        // interpret a value with respect to steps and precision
        // eg 0.41221 -> 0.4
        // "52.242%"  -> 0.5 
        if(_.isString(value) && value.indexOf('%') !== -1)
            value = parseFloat(value) / 100;
        else
            value = parseFloat(value);            

        if(value > 1)
            value = 1;
        else if(value < 0)
            value = 0;

        var precision = this.steps || this.precision || 100;        
        var v =  Math.round(value*precision) / precision;
        return v;
    },
    _rangeWidth: function() {
        return $(this.el).width() - this.$('.handle').outerWidth();
    },
    _calculateLeft: function(offsetleft) {
        /* Returns a float between 0 and 1 from an offset in pixels 
        eg 122 -> 0.3241....
        */
        var width = this.$('.container').width(),
            step = 1 / this.steps,
            handleWidth = (this.$('.handle').outerWidth() / width);
        if(offsetleft > width)
            return 1;
        else if(offsetleft < 0) 
            return 0;
            
        var value = offsetleft / width;
        // make it snap?
        if(this.steps) { 
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
            left = this.interpret(left);
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
        gui.drag.start(conf);
        e.preventDefault();
        e.stopPropagation();
        this.el.focus();
    },  
    onSliderDrag: function(e, conf) {
        var pos = conf.pos;
        var offsetleft = (e.clientX - pos.left) - pos.offsetX;        
        var left = this._calculateLeft(offsetleft);
        left = this.interpret(left);
        this.$('.handle').css('left', (left*100)+'%');
        this.$('.range-min').css('width', (left*100)+'%');        
        this.trigger('drag', {slider: this, value: left});
    },
    onSliderDragEnd: function(e, conf) {
        var left = this.$('.handle')[0].style.left; // eg "20%"
        this.setValue(this.interpret(left));
        this.render();
    },
    onKeyDown: function(e) {
        var key = e.keyCode, 
            keys = gui.keys,
            step = 1/(this.steps || 100);
            
        if(key == keys.ENTER) {
            e.preventDefault();
            return;
        } else if(key == keys.ESC) {
            this.abort();
        } else if(key == keys.LEFT) {
            this.setValue(this.interpret(this.getValue() - step));
            this.render();
        } else if(key == keys.RIGHT) {
            this.setValue(this.interpret(this.getValue() + step));
            this.render();
        }
        e.stopPropagation();
    }
});





// Todo: move to separate js file
form.Dialog = Backbone.View.extend({
    className: 'dialog',
    attributes: {tabindex: '-1'},
    template: _.template(''+
        '<header><h2><%= obj.title %></h2></header>'+
        '<div class="content"></div>'+
        '<div class="buttons"></div>'+
        '<div class="resize"></div>'
    ),
    buttonsTemplate: _.template(''),
    contentTemplate: _.template(''),
    events: {
        'mousedown header': 'onHeaderMouseDown',
        'mousedown': 'onMouseDown',
        'click .buttons .close': 'close',
        'keydown': 'onKeyDown',
        'mousedown .resize': 'onResizeMouseDown'
    },
    onResizeMouseDown: function(e) {
        var curr = this.$el.position();
        gui.drag.start({
            ev: e,
            ondrag: this.onResizeDrag,
            onend: this.onResizeDragEnd,
            startX: curr.left,
            startY: curr.top
        });
        e.preventDefault();                        
    },
    onResizeDrag: function(e, conf) {
        var w = e.pageX - conf.startX,
            h = e.pageY - conf.startY;
        this.$el.css({'width': w, 'height': h});
    },
    ieRepaintScrollbars: function() {
        this.$('.tabs > div').css('overflow', 'hidden').css('overflow', 'auto');
    },
    onResizeDragEnd: function(e) {
        if($.browser.ltie9)
            this.ieRepaintScrollbars();
    },
    onHeaderMouseDown: function(e) {
        gui.drag.start({
            ev: e,
            el: this.el
        });
        e.preventDefault();                
    },
    onMouseDown: function(e) {
        var dialogs = $(document.body).children('.dialog');
        this.bringToTop();
    },
    initialize: function(conf) {
        this.config = conf;
        this.title = conf.title;
        _.bindAll(this, 'onResizeDrag', 'onResizeDragEnd');            
    },    
    render: function() {
        this.$el.html(this.template({title: this.title}));
        this.$(' > .buttons').html(this.buttonsTemplate());
        
        if($.browser.ltie9) {
            var divs = ['ds_l','ds_r','ds_t','ds_b','ds_tl','ds_tr','ds_bl','ds_br'];
            _.each(divs, function(item) {
                this.$el.append($('<div class="ds '+item+'"><div>'));
            }, this);
            this.$el.iefocus();
            // this.$el.prepend('<div class="dropshadow"></div>');
            this.$('> header h2, > header, > .resize').attr('unselectable', 'on');
        }
        return this;
    },
    show: function() {
        this.center();
        this.bringToTop();
    },
    bringToTop: function() {
        var currz = parseInt(this.$el.css('z-index') || 0),
            dialogs = $(document.body).children('.dialog');
        
        if(currz-100 === dialogs.length-1)
            return;
        
        dialogs.each(function() {
            var z = parseInt($(this).css('z-index'));
            if(z > currz) 
                $(this).css('z-index', z-1);
        });
        this.$el.css('z-index', (dialogs.length-1) + 100);
    },
    close: function() {
        $(this.el).remove();
    },
    center: function(args) {            
        var el = $(this.el),
            width = el.outerWidth(),
            height = el.outerHeight(),
            winWidth = $(window).width(),
            winHeight = $(window).height();

        var top = ((winHeight - height) / 2) + $(window).scrollTop(),
            left = ((winWidth - width) / 2) + $(window).scrollLeft();

        var top = 10;

        el.css({left: left, top: top});
    },
    onTitleChange: function(model, value) {
        this.$('header h2').html(value);
    },
    onKeyDown: function(e) {
        if(e.keyCode == gui.keys.ESC) 
            this.close();
    }
});



form.UploadField = Backbone.View.extend({
    className: 'upload',
    tagName: 'div',
    template: _.template2(''+
        '<div class="browse-container">'+
            '<button class="button browse">${obj.browseButtonText}</button>'+
            '<input type="file" multiple="multiple"/>'+
        '</div>'+
        '<div class="droparea"></div>'+
        '<ul class="queue"></ul>'),
    queueItemTemplate: _.template2(''+
        '<li>'+
            '<div class="progressbar"></div>'+
            '<span class="name">${obj.name}</span> '+
            '<span class="size">${gui.format.filesize(obj.size)}</span>'+
            '<button class="remove">${obj.field.removeButtonText}</button>'+
        '</li>', {gui: gui}),
    queueItemTemplateIE: _.template2(''+
        '<li>'+
            '<div class="progressbar"></div>'+
            '<span class="name">${obj.name}</span> '+
            '<button class="remove">${obj.field.removeButtonText}</button>'+
        '</li>', {gui: gui}),
        
    mixins: [form.Field],
    events: {
        'click .queue > li .remove': 'onRemoveClick',
        'click .browse': 'onBrowseClick'
    },
    
    initialize: function(config) {
        form.Field.initialize.call(this, config);
        this.files = [];
        this.browseButtonText = config.browseButtonText || 'Browse..';
        this.removeButtonText = config.removeButtonText || 'Remove';
        
        _.bindAll(this, 'onChange');
    },
    getValue: function(formdata) {
		// When the form is collecting all values before a submit,
		// a FormData is passed in modern browsers. Add all files 
		// to the FormData.		
		if(formdata) {
            _.each(this.files, function(f) {
                formdata.append(this.name, f);
            }, this);
        }
        return form.Field.getValue.call(this)
    },
    render: function() {
        this.$el.html(this.template(this));
        this.$('input[type="file"]').attr('name', this.name);
        this.$('input[type="file"]').on("change", this.onChange);
        


        // this.$('>ul').empty();



		// process all File objects
        // var files = [
        //     {name: 'Adasdasdasd.pdf', type: 'application/pdf', size: 384747},
        //     {name: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit.pdf', type: 'application/pdf', size: 384747},
        //     {name: 'test.jpg', type: 'image/jpeg', size: 384747},
        //     {name: 'Adasdasdasd.pdf', type: 'application/pdf', size: 384747}
        // ];

        var val = this.getValue();       
        if(val && val.length) {
            _.each(val, function(json, i) {
    	        json = _.clone(json);
    	        json.field = this; // add f
        	    this.$('>ul').append(this.queueItemTemplate(json))
            }, this);
        }

        if(!$.browser.ltie10) {
            // Hide the transparent <input type="file">
            this.$('input[type="file"]').hide();
        }        
        
        this.delegateEvents();
        return this;
    },
        //     uploadFile: function(file, xhr) {
        //         /* Invoked by the form */
        // var xhr = new XMLHttpRequest();
        //         // if (xhr.upload)  <-- useful test for old ie detection?
        // 
        // 
        // // create progress bar
        // var index = _.indexOf(this.files, file);
        // var li = this.$('>ul:nth-child('+index+')');
        // li.addClass('progress');
        // 
        // 
        // // progress bar
        // xhr.upload.addEventListener('progress', function(e) {
        //  var pc = parseInt(100 - (e.loaded / e.total * 100));
        //  li.css('background-position', pc + "% 0");
        // }, false);
        // 
        // // file received/failed
        // xhr.onreadystatechange = function(e) {
        //  if (xhr.readyState == 4) {
        //      progress.className = (xhr.status == 200 ? "success" : "failure");
        //  }
        // };
        // 
        // // start upload
        // xhr.open("POST", action, true);
        // xhr.setRequestHeader("X_FILENAME", file.name);
        // xhr.send(file);
        // 
        // 
        //     },
    addFilesToXHR: function() {
        
    },
    // onChange: function(e) {
    //     console.log('onchange', e)
    // },
    onChange: function(e) {
		// fetch FileList object
		var val = this.getValue() || [];
		if(e.target.files) {
    		var files = e.target.files || e.dataTransfer.files;
            // this.$('>ul').empty(); // <-- can I avoid redrawing on each file add?
            // this.files = [];

    		// process all File objects
    		_.each(files, function(f) {
    		    var vars = _.clone(f);
    		    vars.field = this;
    		    this.$('>ul').append(this.queueItemTemplate(vars))
    		    this.files.push(f);
    		    val.push({'name': f.name, 'size': f.size, 'type': f.type});
    		}, this);
    	} else {
            // IE<=9, only one file is added at a time
            // No file metadata
            var input = this.$(':file:last');
            var name = input[0].value;
            name = name.substr(name.lastIndexOf('\\')+1);
            var data = {
                'name': name,
                'field': this
            };
            this.$('>ul').append(this.queueItemTemplateIE(data));
            input.hide();
            
            this.files.push(input[0]);
            val.push({'name': name});            
            
            // add another input
            var newInput = $('<input type="file" name="'+this.name+'">');
            newInput.on('change', this.onChange);
            input.after(newInput);
            e.preventDefault();
    	}
    	this.setValue(val);
	},
	onRemoveClick: function(e) {
	    var li = $(e.target).parents('li:first'),
	        val = this.getValue(),
	        index = li.index(),
	        remove = val[index];

        
        li.remove();
	    val.splice(index, 1);
        this.setValue(val.length ? val : null);

	    if($.browser.ltie10) {
	        // remove the corresponding hidden input type="file"
	        var el = this.$(':file:nth-child('+(li.index()+1)+')');
    	    el.remove()	        
	    }
	    else {
	        // the file removed might be in this.files (it will if it was just added
	        // by the user, opposed to eg reading the value from database)
	        for(var i=0,f; f = this.files[i]; i++) {
	            if(f['name'] == remove['name'] && f['size'] == remove['size']) {
            	    this.files.splice(index, 1);
            	    break;
            	}
	        }
	    }

	},
	onBrowseClick: function(e) {
        // opening the Browse.. dialog by triggering a click does
        // indeed open it and allows you to choose a file. But later
        // when trying to submit, it just says "Access is denied."
        // without giving any clue to why. Clicking directy on a transparent
        // <input type="file"> is the only way to style a file field.
	    if(!$.browser.ltie10) {
    	    this.$('input[type="file"]').click();
	    }
	}
	
});


form.MessageBox = Backbone.View.extend({
    className: 'messagebox',
    attributes: {
        tabindex: '-1'
    },
    template: _.template2(
        '<div class="inner">'+
            '<div class="title">${title}</div>'+
            '<div class="message">${message}</div>'+
            '<div class="buttons">'+
                '<button class="button ok">OK</button>'+
            '</div>' +
        '</div><div class="dropshadow"></div></div>'
    ),
    events: {
        'click .button': 'onCloseClick',
        'keydown': 'onKeyDown'
    },
    
    initialize: function(config) {
        this.title = config.title || '';
        this.message = config.message || '';
    },
    render: function() {
        this.$el.html(this.template({
            title: this.title,
            message: this.message
        }));
        // Implicitly append message boxes to body
        if(!this.el.parentNode)
            $(document.body).append(this.el);
        
        if($.browser.ltie9) {
            // Todo: remove this quickfix
            try {
                this.$el.iefocus().addClass('ltie9');
            } catch(e) {}
        }
        return this;
    },
    show: function() {
        this.render();
        this.$el.center();
        this.$el.fadeIn('fast');
        this.$el.focus();
    },
    close: function() {
        this.$el.remove();
    },
    onKeyDown: function(e) {
        if(e.which == gui.keys.ESC || e.which == gui.keys.ENTER) {
            this.close();
        }
    },
    onCloseClick: function() {
        this.close();
    }
});




return form;

});

