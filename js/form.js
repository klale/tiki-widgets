
gui.Field = Backbone.View.extend({
    /**
    Different versions describing the same value:
    - A pretty version. 
    - The value deserialized into javascript land
    - The value serialized into something that can be 
      transported (as json in most cases)
      
    
    Renering the value
    - format and shove string into a <div..></div>
    - The value could deserialize into a Collection of Models, which
      is fed to a view, which in turn renders a list of stuff.
     
    setValue/getValue:
    - Default is to store in $(this.el).data
    - Use mixins to alter the behavior to eg instead target a property 
      of a Model.
      
    TODO: 
    - Trigger "change" when not using a model
    */    
    
    initialize: function(config) {
        this.name = config.name || 'value';
        if(this.model) {
            this.model.on('change:'+this.name, this.onChangeHepp, this);               
        }
    },
    onChangeHepp: function() {
        this.render();
    },
    serialize: function(value) {
        return value;
    },
    deserialize: function(value) {
        return value;
    },
    render: function() {
    },
    setValue: function(value) {
        if(this.model) 
            this.model.set(this.name, value);
        else
            $(this.el).data(this.name, value);

    },
    unsetValue: function() {
        if(this.model) 
            this.model.unset(this.name);
        else
            $(this.el).removeData(this.name);        
    },
    getValue: function() {
        if(this.model) 
            return this.model.get(this.name);
        return $(this.el).data(this.name);
    }
});



gui.TextField = gui.Field.extend({
    tagName: 'div',
    className: 'editable textfield',
    attributes: {
        tabindex: '0', 
        contentEditable: 'false'
    },
    events: {
        'keydown': 'onKeyDown',
        'focus': 'onFocus',
        'blur': 'onBlur'
    },
    
    /*
    ..typing something.. 
    --> this.setValue(this.interpret($(this.el).html()))
    --> this.render()
    ..model changes..
    --> this.render()
    */
    
    initialize: function(config) {
        gui.Field.prototype.initialize.call(this, config);
        
        var name = config.name,
            value = config.value;
        
        if(this.el) {
            var name = name || $(this.el).attr('data-name') || this.el.name,
                value = value || $(this.el).attr('data-value') || this.el.value;
        } 

        this.name = name;
        this.emptytext = config.emptytext || '';
        if(value !== undefined)
            this.setValue(this.interpret(value));
        
    },  
    // getValue: function() {
    //     var value = gui.Field.prototype.getValue.call(this);
    //     if
    // }    
    format: function(value) {
        // make the value pretty
        return value;
    },
    interpret: function(value) {
        // make a pretty value real, (was "unformat")
        var v = value.replace('<br>', ''); // contenteditable
        if(v === '') 
            return undefined;
    },
    render: function() {
        $(this.el).attr(this.attributes);
        $(this.el).addClass('textfield');

        var v = this.getValue();
        var text = (v === undefined) ? this.emptytext : this.format(v);
        $(this.el).toggleClass('empty', v===undefined);
        
        $(this.el).html(text);
        return this;
    },
    abort: function() {
        this.el.contentEditable = false;
        $(this.el).html(this.format(this.getValue()));
    },
    onFocus: function(e) {
        if($(this.el).is('.empty'))
            $(this.el).removeClass('empty').html('');
        else
            $(this.el).html(this.format(this.getValue()));
            
        this.el.contentEditable = true;
        this.selectAll();
        
    },     
    onBlur: function(e) {
        var v = this.interpret($(this.el).html());
        if(v === undefined)
            this.unsetValue();
        else
            this.setValue(v);

        this.render();        
    },
    selectAll: function() {
        var div = this.el;
        window.setTimeout(function() {
            // document.execCommand('selectAll',false,null);            
            var sel, range;
            if (window.getSelection && document.createRange) {
                range = document.createRange();
                range.selectNodeContents(div);
                sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
            } else if (document.body.createTextRange) {
                range = document.body.createTextRange();
                range.moveToElementText(div);
                range.select();
            }
        }, 20);
    },
    onKeyDown: function(e) {
        if(e.keyCode == gui.keys.ENTER) {
            e.preventDefault();
            return;
        } else if(e.keyCode == gui.keys.ESC) {
            this.abort();
        }
        e.stopPropagation();
    }
});



gui.DateField = gui.TextField.extend({
    tagName: 'div',
    className: 'editable datefield',
    attributes: {
        tabindex: '0', 
        contentEditable: 'false'
    },
    events: {
        'keydown': 'onKeyDown',
        'focus': 'onFocus',
        'blur': 'onBlur'
    },
    dateManip: /^([\+\-])?(\d{0,3})(\w)?$/,
    iscompactdate: /^(\d{2,4})(\d{2})(\d{2})$/,
    yyyymmdd: /^(\d{4})(\d{2})(\d{2})$/,
    yymmdd: /^(\d{2})(\d{2})(\d{2})$/,
    
        
    initialize: function(config) {
        gui.TextField.prototype.initialize.call(this, config);
        this._format = config.format;
    },
    interpret: function(s) {
        // make a pretty value real, (was "unformat")
        s = s.replace('<br>', '');
        
        var d;
        if(s == 'now') {
            d = moment();
        } 
        else if(s && this.dateManip.test(s)) {
            // Date manipulation
            // >>> dateManip.exec('+1d')
            // ["+1d", "+", "1", "d"]
            var s = this.dateManip.exec(s)
            var method = s[1] == '-' ? 'subtract' : 'add';
            var unit = s[3] || 'd';
            var num = parseInt(s[2]);    
            d = moment(parseInt(this.getValue()))[method](unit, num);
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
                d = moment(s, "YYYY-MM-DD");
            }
        }
        if(d)
            return d.toDate().getTime();
    },
    format: function(value) {
        // make the value pretty
        // `value` is number of milliseconds since epoch
        return moment(value).format(this._format || 'YYYY-MM-DD'); // 'LL'
    },
    render: function() {
        gui.TextField.prototype.render.call(this);
        if(this.calendar) 
            $(this.calendar.el).remove()    
        return this;
    },
    abort: function() {
        gui.TextField.prototype.abort.call(this);
        // Teardown popup calendar if showing
        // [code here]
        if(this.calendar) 
            $(this.calendar.el).remove()
    },
    onKeyDown: function(e) {
        if(e.keyCode == gui.keys.ENTER) {
            e.preventDefault();
            return;
        } else if(e.keyCode == gui.keys.ESC) {
            this.abort();
        } else if(e.keyCode == gui.keys.DOWN) {
            this.calendar = new gui.DatePickerCalendar();
            $(document.body).append(this.calendar.render().el);
        }
        e.stopPropagation();
        
        
    }    
});

gui.DatePickerCalendar = gui.MonthCalendar.extend({
    className: 'calendar datepicker',
    events: _.extend(gui.MonthCalendar.prototype.events, {
        'mouseenter': 'onMouseEnter'
    },
    
    initialize: function(conf) {
        gui.MonthCalendar.prototype.initialize.call(this, conf);
    },
    render: function() {
        gui.MonthCalendar.prototype.render.call(this);
        $(this.el).attr('tabIndex', 0);
        return this;
    },
    onMouseEnter: function(e) {
        console.log('yeee')
        this.el.focus();
    }
    
});




// ==================
// = PropertiesForm =
// ==================
/**
Convenience class for a common form layout. 
*/
gui.ClassicForm = Backbone.View.extend({
    tagName: 'ul',
    className: 'classicform',
        
    initialize: function(config) {
        /* A list of: {
            constructor: gui.TextField, 
            args: {},
            name: 'title',
            label: 'Title'
        }
        ..to create the form from. `args` are any extra constructor arguments. */
        this.field_spec = config.fields;
        
        /* Optional, if given, the field value is stored in model
        instead of in $(el).data(..). Eg model.set('title', 'Bla bla') is run when 
        a the textfield triggers "change" */
        this.model = config.model;
        
        /* Holds the field objects after a render, by name */
        this.fields = {};
    },
    render: function() {
        var elements = [];
        
        _.each(this.field_spec, function(spec) {
            // Collect constructor arguments 
            var args = spec.args || {};
            args.name = spec.name;
            args.model = this.model;
            
            // Create a field and a row    
            var field = new spec.constructor(args).render();    
            var row = new gui.PropertiesFormRow({
                field: field,
                label: spec.label
            }).render();
            
            elements.push(row.el);
            this.fields[spec.name] = field;
        }, this);
        
        $(this.el).append(elements)
        return this;
    },
    toJSON: function() {
        // Serialize the form to json
        var values = {};
        _.each(this.fields, function(field, name) {
            values[name] = field.getValue();
        });
        return values;
    }
    
});
/**
Has a label, a Field of some sort and mechanics for 
showing error/invalid messages for this field.
*/
gui.PropertiesFormRow = Backbone.View.extend({
    tagName: 'li',
    rowTemplate: _.template(''+
        '<label for="<%= obj.cid %>"><%= obj.label %></label>'+
        '<div></div>' // <-- field.el is appended here
    ),
    
    initialize: function(config) {
        this.field = config.field; // <-- a Field view, complete with model
        this.label = config.label;
    },
    render: function() {
        var html = this.rowTemplate({cid: this.cid, label: this.label});
        $(this.el).html(html);
        this.$('> div').append(this.field.el);
        return this;
    } 
});


// =========
// = Combo =
// =========
gui.Combo = Backbone.View.extend({
    tagName: 'div',
    attributes: {
        'tabindex': '0'
    },
    className: 'combo',
    events: {        
        'mousedown': 'onMouseDown',
        'keydown': 'onKeyDown',
        'keypress': 'onElKeyPress',
        'keyup': 'onKeyUp'
    },
    itemTemplate: _.template(''+
        '<li data-value="<%= obj.value %>"><a><%= obj.html %></a></li>'),

    
    initialize: function(config) {        
        config = config || {};
        this.dropdown = config.dropdown;
        if(config.itemTemplate) {
            this.itemTemplate = config.itemTemplate;
        }
        
        // Create an empty dropdown if no onw was supplied
        if(!this.dropdown) {
            this.dropdown = new gui.DropdownList({
                triggerEl: this.el,
                itemTemplate: this.itemTemplate
            });            
        }
    },
    render: function() {
        $(this.el).html();
        return this;
    },
    showDropdown: function() {               
        // Is it already showing?
        if(this.dropdown.isVisible()) {
            this.dropdown.focus();
            return;
        }
        
        // Hold on to this, in case of an abort (pressing esc)
        this._orgText = $(this.el).html();
        this.el.contentEditable = true;

        // Remove any current 'select' listener if the dropdown is 
        // shared by many Combos
        this.dropdown.off('select');
        this.dropdown.off('hide');
        this.dropdown.on('select', this.onSelect, this);
        // this.dropdown.on('hide', this.onDropdownHide, this);
        this.dropdown.scrollable.scrollTo(0);
        this.dropdown.align(this.el);
        this.dropdown.filter('');
        this.dropdown.show();        
        
        var li = this.dropdown.content.find('li[data-value="'+$(this.el).attr('data-value')+'"]');        
        if(li[0]) {
            this.dropdown.select(li);
        }
    },    
    abort: function() {
        this.dropdown.hide();
        this.el.contentEditable = false;
        $(this.el).html(this._orgText);
    },
    onMouseDown: function(e) {
        e.stopPropagation();
        this.showDropdown();
        e.preventDefault();
    },
    onKeyDown: function(e) {
        this._modifierKeyPressed = e.ctrlKey || e.metaKey;
        var keys = gui.keys;
        if(e.keyCode == keys.ESCAPE) {
            this.abort();
            e.preventDefault();     
        } 
        else if(e.keyCode == keys.DOWN) {
            var selnext = document.activeElement == this.el;
            this.showDropdown();
            if(selnext) {
                this.dropdown.selectNext();
            }
            e.preventDefault();    
        } 
        else if(e.keyCode == keys.TAB && this.dropdown.isVisible()) {

            if(this.dropdown.$('.content li[class!="hidden"]').length == 1) {
                // select it if there is ony one visible option
                var sel = this.dropdown.getSelected();
                if(sel) {
                    this.dropdown.select(sel);
                    this.onSelect();                    
                }
            } else {
                this.dropdown.focus();                
                e.preventDefault();                            
            }    
        } 
        else if(e.keyCode == keys.ENTER) {
            e.preventDefault(); // Don't allow newlines
            if(this.dropdown.isVisible()) {
                var item = this.dropdown.$('.content li[class="selected"]');            
                if(item[0]) {
                    this.dropdown.select(item);
                    this.onSelect();
                    e.preventDefault();
                    e.stopPropagation();
                }            
            }
            else {
                var form = $(this.el).parents('form');
                if(form[0]) {
                    form.submit();
                }
            }
        }
        else if(e.keyCode == keys.BACKSPACE && $(this.dropdown.el).is(':visible') && document.activeElement == this.el) {
            // We're typing in the textbox, allow backspace
            e.stopPropagation();
        }
    },
    onElKeyPress: function(e) {

        if((e.keyCode >= 47 || e.keyCode == gui.keys.BACKSPACE)) {
            // Pressing a literal character
            var character = String.fromCharCode(e.keyCode);

            if(!this.dropdown.container.is(':visible')) {
                $(this.el).html('');
                this.showDropdown();                
                this.dropdown.filter(character);
                this.el.focus();
            }
            e.stopPropagation();
        }
    },
    onKeyUp: function(e) {
        if(e.keyCode >= 47 || e.keyCode == gui.keys.BACKSPACE) {
            this.dropdown.filter($(this.el).html().replace('<br>', '')); // Wow, contentEditable is funny
            e.preventDefault();
            e.stopPropagation();
        }
    },
    onSelect: function() {
        var sel = this.dropdown.getSelected();
        var text =  sel.find('a').html()
        var value = sel.attr('data-value');
        
        $(this.el).html(text);
        $(this.el).attr('data-value', value);
        this.dropdown.hide();
        this.el.focus();
        $(this.el).trigger('change');
    }
});


// =============
// = AjaxCombo =
// =============
gui.AjaxCombo = gui.Combo.extend({
    xhr: null,
    
    initialize: function(config) {
        Combo.prototype.initialize.call(this, config);
        this.url = config.url;
    },
    search: function(s) {
        if(this.xhr) {
            this.xhr.abort();
        }
        this.xhr = $.ajax({  // Reuse? dispose?
            url: this.url,
            type: 'get',
            dataType: 'json',
            data: {q: s},
            success: $.proxy(this.onSearchSuccess, this),
            error: $.proxy(this.onSearchError, this)
        });
    },
    onSearchSuccess: function(data, status, response) {
        // I WAS HERE!
        // this.dropdown.
    },
    onSearchError: function(xhr, status, error) {
        this.dropdown.el.find('li').remove();
    },
    onElKeyPress: function(e) {
        if((e.keyCode >= 47 || e.keyCode == this.BACKSPACE)) {
            var character = String.fromCharCode(e.keyCode);
            // this.textbox[0].value = character
            this.textbox[0].value = ''
            // this.textbox[0].focus();
            this.showDropdown();
            // e.preventDefault()
            this.dropdown.filter(character)            
            this.textbox[0].focus();            
        }
    },
    onKeyUp: function(e) {
        if(e.keyCode >= 47 || e.keyCode == this.BACKSPACE) {
            this.dropdown.filter(this.textbox[0].value);
            e.preventDefault();            
        }
    },    
    
    
});

