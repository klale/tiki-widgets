define([
    'jquery', 
    'underscore',
    'backbone',
    './base',
    './calendar',
    './dropdown',
    'iframetransport'
], function($, _, Backbone, base, calendar, dropdown) {

    var form = {
        types: {}
    };


    // =========
    // = Utils =
    // =========
    /*
    Utility function for creating a Field instance from
    a DOM element.
    */
    function createFromElement(klass, el) {
        var attr = $(el).getAllAttributes();
        $(el).attr(klass.prototype.attributes || {});
        $(el).addClass(klass.prototype.className)
        return new klass({
            el: el,
            name: attr.name,
            value: attr.value,
            required: attr.required
        });
    }
    form.createFromElement = createFromElement;

    function isfield(field) {
        return field && field.setValue && field.getValue;
    }


    form.ErrorMessages = {
        showError: function(field, error) {
            var el = field.$el.parent().find('.error');
            if(el.length) 
                el.show().text(error.message);
            else {
                $('<div class="error"></div>').text(error.message).insertAfter(field.el);
                field.$el.parent().addClass('invalid');
            }
        },
        hideError: function(field) {
            field.$el.parent().find('.error').fadeOut(function() {$(this).remove()});
            field.$el.parent().removeClass('invalid');        
        }    
    };





    // =========
    // = Forms =
    // =========
    form.Form = Backbone.View.extend({
    
        initialize: function(config) {
            this.remoteValidate = config.remoteValidate;
            // Bind handlers
            _.bindAll(this, 'onFieldChange', 'onModelChange', 'onInvalid', 'onSync', 'onError');
        
            // Set fields and fieldsmap
            this.fields = [];
            this.fieldsmap = {};  // Todo: hmm.. now I've got two views of the same data.
            _.each(config.fields, function(json) {
                var field;
                if(isfield(json))
                    field = json;
                else if(isfield(json.type)) {
                    field = json.type;
                }
                else {
                    var klass = form.types[json.type];
                    if(!klass)
                        throw new Error('Field factory form.types['+json.type+'] does not exist');
                    field = new klass(json);
                }
                field.on('change', this.onFieldChange)
                this.fields.push(field);
                this.fieldsmap[field.name] = field;
            }, this);    

            // Set the model
            var model;
            if(config.model) {
                if(config.model instanceof Backbone.Model)
                    model = config.model;
                else if(_.isObject(config.model))
                    // model = new form.Model(config.model)
                    model = new Backbone.Model(config.model)                
            }
            this.model = null; // undo backbone implicit assignment
            // this.setModel(model || new form.Model());            
            this.setModel(model || new Backbone.Model());                    
        },
    
        // Implement in subclass
        render: function() {
            return this;
        },
    
        // Implement in subclass
        showError: function(field, error) {
        },
    
        // Implement in subclass    
        hideError: function(field) {
        },
    
        // Use this to change the model of an existing form.
        // Useful for a "row editing" form - a single form, and many models.
        setModel: function(model) {
            // unbind any exising model before switching
            if(this.model) {
                this.model.off('change', this.onModelChange);
                this.model.off('invalid', this.onInvalid);
                this.model.off('sync', this.onSync);
                this.model.off('error', this.onError);      
            }
            
            // Set the new model
            this.model = model;
            model.on('change', this.onModelChange);
            model.on('invalid', this.onInvalid);
            model.on('sync', this.onSync);
            model.on('error', this.onError);

            // Update all fields with new values
            _.each(this.fields, function(field) {
                var value = model.get(field.name);
                field.setValue(value, {silent: true});
            });
        },
    
        remoteValidateOne: function(field) {
            (attr = {})[field.name] = this.model.get(field.name)
            this.model.save(null, {
                attrs: attr, 
                headers: {'X-Validate': 'single'},
            });
        },
        
        // Propagate all field changes to the model
        onFieldChange: function(e) {
            this.model.set(e.field.name, e.value);
        },
    
        // Propagate any model changes to the field
        onModelChange: function() {
            _.each(this.model.changedAttributes(), function(v,k) {
                var field = this.fieldsmap[k]
                if(field) {
                    field.setValue(v);
                    field.render();
                    if(this.remoteValidate)
                        this.remoteValidateOne(field);
                }
            }, this);
        },
        onInvalid: function(model, errors, resp) {
            _.each(errors.errors || [], function(error) {
                var field = this.fieldsmap[error.name];
                this.showError(field, error);
            }, this)
        },
        onSync: function(model, respdata, c) {
            if(c.headers && c.headers['X-Validate'] == 'single')
                this.hideError(this.fieldsmap[_.keys(c.attrs)[0]])
            else {
                _.each(this.fields, function(field) {
                    this.hideError(field)
                }, this);
                respdata = respdata || {};
                if(respdata.redirect)
                    window.location.href = respdata.redirect;
                
            }
        },
        onError: function(model, resp, options) {
            if(resp.status == 422) {
                var resp = JSON.parse(resp.responseText)
                model.trigger('invalid', model, resp, resp)        
            }
        }
    });




    /*
    form.SimpleForm
    ===============
    A simple <ul> based form layout.

    Example
    -------
    var myform = new form.SimpleForm({
        model: new Backbone.Model(null, {
            url: '/foo/bar'
        }),
        fields: [
            new form.Text({name: 'title', label: 'Title'}),
            new form.TextArea({name: 'description', label: 'Description'})
        ],
        metadata: {
            'title': {label: 'Title'},
            'description': {label: 'Description'},  // todo: add support for `renderer`?
        }    
    });
    body.append(myform.render().el);
    myform.model.save()

    */
    form.SimpleForm = form.Form.extend({
        className: 'gui-simpleform',
        template: _.template('<ul class="form"></ul>'),
        rowTemplate: _.template2(''+
            '<li>'+
                '<div class="label">${obj.label}[[ if(obj.required) print("*") ]]</div>'+
                '<div class="field"></div>'+
            '</li>'),    
        mixins: [form.ErrorMessages],
    
        initialize: function(config) {
            form.SimpleForm.__super__.initialize.call(this, config);
            this.metadata = config.metadata;
        },
        render: function() {
            this.$el.empty().html(this.template());
            var ul = this.$('>ul');

            _.each(this.fields, function(field) {
                var meta = this.metadata[field.name],
                    li = $(this.rowTemplate({
                        label: meta.label, 
                        required: field.required
                    }));
            
                li.children('.field').append(field.render().el);
                li.addClass(field.typeName);
                ul.append(li);
            }, this);
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

    */
    form.CustomForm = form.Form.extend({
        mixins: [form.ErrorMessages],
    
        initialize: function(config) {
            // Collect all fields
            if(config.fields) {
                var fields = config.fields;            
            } 
            else {
                var fields = [];
                this.$('*[name]').each(function() {
                    var div = $(this)
                    var type = div.attr('type');
                    var Type = form.types[div.attr('type')];
                    if(!Type) 
                        throw new Error('Unknown field type: ' + div.attr('type'));
                    var field = Type.createFromElement(this);
                    fields.push(field);
                });            
            }
            config.fields = fields;
            form.CustomForm.__super__.initialize.call(this, config);
        
            if(config.fields) {
                // find all fields
                var fieldsmap = this.fieldsmap;
                this.$('*[name]').each(function() {
                    var field = fieldsmap[$(this).attr('name')];
                    if(field.attributes)
                        $(this).attr(field.attributes)
                    field.setElement(this);
                    field.render();
                    field.$el.addClass(field.className)
                    field.delegateEvents();
                });
            
            }
        },    
        render: function() {
            _.each(this.fields, function(field) {
                // console.log('RENDER: ', field.name)
                field.render();
            });
            return this;
        }
    });





    /*
    <div class="form" id="484683">
        <h1 name="title">Foobar</h1>
        <div name="content">I am long text with <em>html</em>.</div>
        <div name="news_date" value="2013-01-01">1 januari 2013</div>   <-- pick value from either el.attr('value') or el.text(). 
                                                                            <FieldClass>.createFromElement is used for this.
    </div>


    var model = {...}
    var form = new CustomForm2({
        el: $('.form'),
        model: model
        form: new form.Form({..})          // <-- should be able to pass a formspec
    })

    The layout is the actual el.
    However, a formspecification is given, and all you do in the layout
    is referencing field names. 
    Eg <div name="favorite_color" value="blue">Blue!</div>    <-- will become a combo with 20 options, using the form spec
                                                              <-- I need a custom js renderer here as well, eg "red" -> "Red!"

    Also, the origial divs are not touched, until clicked. Then they are wrapped by the appropriate field view.

    The PageEditor has some formspecs. It iterates all <div id="123" form="spotform">...</div>
    and creates 1 CustomForm2 for each.

    */
    form.CustomForm2 = form.Form.extend({
        className: 'gui-form',
        rendered: false,
        events: {
            'click *[name]': 'onClickField'
        },
        mixins: [base.ChildView],
        
        initialize: function(config) {    
            form.Form.prototype.initialize.call(this, config);
            // this.delegateEvents();
        },    
        render: function() {
            // Well, do nothing here
            return this;
        },
        onClickField: function(e) {
            var target = $(e.currentTarget),
                field = this.fieldsmap[target.attr('name')];
        
            // ..now apply the behavior of field onto the clicked element
            if(!target.is('.wrapped')) {
                field.wrapElement(target);
                target.addClass('wrapped');
                field.on('fieldblur', function() {
                    field.unwrapElement(target)
                    target.removeClass('wrapped');
                });
            }        
        },    
    });






    // ==========
    // = Fields =
    // ==========
    /**
    A field is an input point for the user. Its value is stored in this.data.
    The stored value is always in a json-transportable format. eg "test", 123, {a:1, b:2}, 
    but not a <object Date>.
        
    Different versions of the same value:
    - A pretty version. 
    - The value deserialized into javascript land
    - The value serialized into something that can be 
      transported (as json in most cases)
    */    
    form.Field = {
        initialize: function(config) {
            this.name = config.name;
            this.required = config.required;        
            this.config = config;

            // Set value
            if(config.value !== undefined) {
                // Use given config.value
                this.value = config.value;
            }
            else if(config['default'] !== undefined) { // config.default = error in IE (reserved word)
                // Use configured default value
                this.value = config['default'];                
            }
            else {
                // Use the Field's default value, or null
                this.value = this.constructor.defaultValue || null;
            }
        },
    
        // Collect all field classes in a dict `form.types`, keyed on `field.typeName`
        initcls: function() {
            var typeName = this.prototype.typeName;
            if(typeName && !form.types[typeName]) 
                form.types[typeName] = this;
        },
    
        getValue: function() {      
            return this.value;
        },
    
        // Implement as you like, as log as `value` is json serializable.
        setValue: function(value, options) {
            options = options || {};

            var old = this.value;
            if(old !== value) {                
                this.value = value;
                if(!options.silent) {
                    this.trigger('change', {field: this, value: value});
                    this.$el.trigger('fieldchange', {field: this, value: value, name: this.name})
                }
            }
        }
    };








    /** 
    A text field
 
       ..typing something.. 
       --> this.setValue(this.interpret($(this.el).html()))
       --> this.render()
       ..model changes..
       --> this.render()
    */ 
    form.Text = Backbone.View.extend({
        className: 'gui-text',
        typeName: 'text',
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
            'keydown esc': 'onEscKeyDown',
        },    
        mixins: [form.Field],
    
        initialize: function(config) {
            config = config || {};
            form.Field.initialize.call(this, config);
            this.renderer = config.renderer;
            this.$el.attr('name', this.name);
        
            if($.browser.ltie9) 
                this.$el.iefocus();        
        },      
        
        // Accepts a string and returns an interpreted value in a json trasportable format. 
        // Eg "tomorrow" could be interpreted as now + 1d.
        interpret: function(value) {
            return value;
        },
        render: function() {
            var v = this.renderer ? this.renderer(this) : this.getValue();
            this.$el.html(v);
            return this;
        },
    
        // Focus the text field
        focus: function() {
            this.el.focus();
            this.$el.moveCursorToEnd();
            this.$el.selectAll();
        },
        abort: function() {
            $(this.el).html(this.format(this.getValue()));
        },
    
        // Attach this View on the given el
        wrapElement: function(el) {
            this._orig_el = this.el;
            this._orig_attr = $(el).getAllAttributes();
            this.setElement(el);
            this.delegateEvents();
            $(el).attr(this.attributes);
            this.$el.removeClass('textfield');
        },
        // Detach this View from its currently wrapped element
        unwrapElement: function() {
            this.$el.removeAttr('tabindex');
            this.$el.removeAttr('contenteditable');
        },
        onFocus: function(e) {
            var keydown = base._keyDownEvent;
            if(keydown && keydown.keyCode == base.keys.TAB)
                this.$el.moveCursorToEnd();            
        },     
        onBlur: function(e) {
            var v = this.interpret(this.$el.getPreText());        
            if(v !== this.getValue()) {
                this.setValue(v);
                this.render();            
            }
            this.trigger('fieldblur');
        },
        onReturnKeyDown: function(e) {        
            // Set value immediately when pressing Return, as the event
            // may continue upwards to a form, triggering a submit.
            var v = this.interpret(this.$el.getPreText());        
            if(v !== this.getValue()) {
                this.setValue(v);
            }        
            // Don't allow newlines in a text field
            e.preventDefault();
        },
        onEscKeyDown: function(e) {
            this.abort();
        },
        onKeyPress: function(e) {
            // On eg fututre numeric textfield, type is supposed to only 
            // trigger when hitting an allowed key.
            this.trigger('type', {e: e, character: String.fromCharCode(e.which)});
        }
    },{
        createFromElement: function(el) {
            var field = createFromElement(this, el);
            return field
        },
        defaultValue: ''
    });



    form.TextArea = form.Text.extend({
        className: 'gui-textarea',
        typeName: 'textarea',
        hotkeys: {
            'keydown return': 'onReturnKeyDown'
        },
        attributes: {   // <---- TODO: If not repeated here, className:'gui-textarea' is set on form.Text as well
            tabindex: 0, 
            contentEditable: true
        },    
        mixins: [base.ChildView, form.Field],
    
        initialize: function(config) {    
            form.Text.prototype.initialize.call(this, config);
            form.Field.initialize.call(this, config);        
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
            value = value || '';
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
        onBlur: function(e) {        
            var value = this.interpret(this.$el.html());

            if(value !== this.getValue()) {
                this.setValue(value);          
            }
        },
        onReturnKeyDown: function(e) {
            e.stopPropagation();
        }
    },{
        createFromElement: function(el) {
            return createFromElement(this, el);
        }
    });


    form.DateField = Backbone.View.extend({
        typeName: 'date',
        className: 'gui-datefield',
        mixins: [form.Field],
        // attributes: {
        //     tabIndex: 0
        // },
        events: {
            'keydown': 'onKeyDown',
            'keyup': 'onKeyUp',
            'click button.calendar': 'showDatePicker',
        },
        template: _.template(''+
            '<button class="calendar" tabindex="-1"></button>'+
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
            // this.$('.textfield').bind('blur', $.proxy(this.onBlur, this));
        
            var self = this;
            this.$('.textfield').bind('focusleave', $.proxy(this.onTextFocusLeave, this));        
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
                d = moment(parseInt(s));
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
                    // todo: use a regex here instead of using moment, and just return the string
                    d = moment(s, 'YYYY-MM-DD');  
                }
            }
            if(d)
                return d.format('YYYY-MM-DD');
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
                // this.datepicker.$el.bind('blur', $.proxy(this.onDatePickerBlur, this));
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
        wrapElement: function(el) {


            // // grab the old content and remove it from the dom
            // var oldContent = this.$el.children();
            // if(!oldContent.length) {
            //     oldContent = this.$el.text();
            //     this.$el.empty();
            // }
            // else
            //     oldContent.remove();
            // 
            // // Add the field                
            // this.$el.append(this.render().el);
            // this.$el..delegateEvents();
            // this.$el..focus();
        
            // Store the orignal dumb el
            this._orig_el = $(el).clone();
        

            this.setElement(el);
            this.render();
            this.delegateEvents();
            this.$el.attr(this.attributes);
        },
        unwrapElement: function() {
            console.log('orig: ', this._orig_el)
            this.$el.replaceWith(this._orig_el)
            // this.$el.removeClass('datefield')
            // this.$el.removeAttr('tabindex');
        },     
        onFocus: function(e) {
            var evt = base._keyDownEvent;
            if(evt && evt.keyCode == base.keys.TAB) {
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
        onTextFocusLeave: function(e) {
            var ae = $(document.activeElement);
            if(!ae.is('.datepicker') && !ae.is('.datefield')) {
                this._setValue();
                this.trigger('fieldblur');
            }
        },
        // onBlur: function(e) {
        //     this._setValue();
        // },

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
            if(e.keyCode == base.keys.ESC)
                this.hideDatePicker();
            
            if(e.keyCode == base.keys.DOWN) {
                this._setValue();
                this.showDatePicker();
                e.preventDefault();
                e.stopPropagation();
            }
        },
        onKeyUp: function(e) {
            if(e.keyCode == base.keys.ENTER) {
                e.preventDefault();
                e.stopPropagation();
            }
        },    
        onDatePickerKeyDown: function(e) {
            if(e.keyCode == base.keys.ESC) {
                this.hideDatePicker();
            }
        }
    },{
        createFromElement: function(el) {
            return createFromElement(this, el);
        }
    });


    form.DatePicker = calendar.MonthCalendar.extend({
        className: 'gui-datepicker',
        events: {
            'mouseenter tbody td.day': 'onMouseEnterDay',
            'keydown': 'onKeyDown',
            'click .day': 'onClick'
        },
        mixins: [form.Field, base.ChildView],
    
        initialize: function(conf) {
            form.Field.initialize.call(this, conf);
            calendar.MonthCalendar.prototype.initialize.call(this, conf);
        },
        render: function() {
            calendar.MonthCalendar.prototype.render.call(this);
            if($.browser.ltie9)
                this.$el.iefocus();
            $(this.el).attr('tabIndex', -1);
        
            if(this.getValue()) {
                // I WAS HERE (.local()....)
                var ymd = moment(this.getValue()).local().format('YYYY-MM-DD');
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
            // this.$el.position({
            //     my: 'left top',
            //     at: 'right top',
            //     of: el,
            //     collision: 'flip fit',
            //     within: window
            // });
            this.$el.align({
                my: 'lt',
                at: 'rt',
                of: el,
                offset: [0,0]
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
        typeName: 'combo',
        className: 'gui-combobox',
        template: _.template(''+
            '<span tabindex="0"><%= text || "&nbsp;" %></span>'+
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
            _.bindAll(this, 'onSpanFocus', 'onSpanBlur', 'onBlur', 'onBodyMouseDown');
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
            // Lazy-create the dropdown
            if(!this.dropdown) {
                var dd  = new dropdown.DropdownList({
                    options: this.options,
                    overlay: this.overlay
                });
                dd.selectable.on('choose', this.onDropdownChoose, this);
                dd.$el.bind('keydown', $.proxy(this.onDropdownKeyDown, this));
                dd.on('blur', this.onDropdownBlur, this);
                dd.on('show', this.onDropdownShow, this);
                dd.on('hide', this.onDropdownHide, this);            
                dd.$el.bind('keypress', $.proxy(this.onDropdownKeyPress, this));
                this.dropdown = dd;
            }
            return this.dropdown;
        },
        showDropdown: function() {
            var dd = this.getDropdown(),
                body = $(this.el.ownerDocument.body);

            body.on('mousedown', this.onBodyMouseDown)
            if(!dd.$el.is(':visible')) {
                // var pos = this.$el.screen();
                // dd.show(pos.left, pos.top+this.$el.outerHeight());
                dd.show(this.el);
                dd.$el.css({'min-width': $(this.el).outerWidth()});
                dd.selectable.select(dd.$('li[id="'+this.getValue()+'"]'));
                dd.el.focus();
            }
        },
        onBodyMouseDown: function(e) {
            this.getDropdown().hide();
        },
        onMouseDown: function(e) {
            var dropdown = this.getDropdown();
            if(!dropdown.$el.is(':visible')) {
                this.showDropdown();
            }
            e.stopPropagation();
            e.preventDefault();
        },
        onDropdownShow: function(dropdown) {
            dropdown.el.focus();
            this.$el.addClass('active');
        },    
        onDropdownHide: function(dropdown) {
            dropdown.el.focus();
            this.$el.removeClass('active');    
        },    
        onDropdownChoose: function(e) {
            var option = this.dropdown.options.at($(e.selected).index());
            this.setValue(option.id);
            this.render();
            this.focus();
        },
        onDropdownKeyDown: function(e) {
            if(e.keyCode == base.keys.TAB) {
                this.focus();
            }
            else if(e.keyCode == base.keys.ESC) {
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
            if(e.keyCode == base.keys.DOWN) {
                this.showDropdown();
                e.preventDefault();
                dropdown.el.focus();
            } 
            else if(dropdown.$el.is(':visible')) {
                if(e.keyCode == base.keys.ESC) {
                    this.abort();
                    e.stopPropagation();
                } else if(e.keyCode == base.keys.TAB) {
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
            },this), 1); // A short delay for webkit
        },
        onBlur: function() {
            this.abort();
            this.$el.removeClass('focus');
            this.trigger('fieldblur');
        }
    
    },{
        createFromElement: function(el) {
            return createFromElement(this, el);
        }
    });

    form.EditableComboBox = form.ComboBox.extend({
        /* A cross between a text and combobox. */
        className: 'gui-combobox editable',
        typeName: 'editablecombo',
        attributes: {
            tabIndex: 0
        },
        mixins: [form.Field],

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
            this.trigger('fieldblur');
        },
        onMouseDown: function(e) {
            if($(e.target).is('.button'))
                form.ComboBox.prototype.onMouseDown.call(this, e);
        }
    });


    form.FilteringComboBox = form.ComboBox.extend({
        className: 'gui-combobox searchable',
        typeName: 'filteringcombo',
        overlay: false,
        mixins: [form.Field],

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

                dd.show(this.el);
                dd.$el.css({'min-width': $(this.el).outerWidth()});
                dd.selectable.select(dd.$('li[id="'+this.getValue()+'"]'));
                dd.filter('');
                dd.el.focus();
            }
        },
    
        // dropdown events
        onDropdownShow: function(dropdown) {
            dropdown.filter('');
            dropdown.el.focus();
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
            if(e.keyCode == base.keys.ENTER) {
                e.preventDefault();
                e.stopPropagation();
            }
            if(e.keyCode == base.keys.ENTER && dropdown.$('li:visible').length == 1) {
                // Only a single visible option? select it on enter
                dropdown._triggerSelect(e, dropdown.$('li:visible')[0]);
                this.abort();
            }
            else if(e.keyCode == base.keys.ESC) {
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
            }
        },
        onBlur: function() {
            // the EditableCombo does a setValue here, SearchableCombo does an abort
            this.abort();
            this.$el.removeClass('focus');
            this.trigger('fieldblur');        
        }
    });


    form.PasswordField = form.Text.extend({
        typeName: 'password',
        className: 'gui-password',
        mixins: [form.Field]
    });


    form.Checkbox = Backbone.View.extend({
        typeName: 'checkbox',
        className: 'gui-checkbox',
        events: {
            'change': 'onCheckboxChange'
        },
        mixins: [form.Field],
    
        initialize: function(config)  {
            form.Field.initialize.call(this, config);
        },
        render: function() {
            this.$el.empty();
            var checkbox = $('<input type="checkbox"/>').attr({
                name: this.name
            });
            if(this.getValue()) {
                checkbox.attr('checked', 'checked');
            }

            if(this.config.text) {
                var rnd = parseInt(Math.random() * 100000),
                    id = this.name + '_' + rnd,
                    label = $('<label for="'+id+'"> '+this.config.text+'</label>');

                checkbox.attr('id', id);
                this.$el.append(checkbox).append(label);
            }
            else
                this.$el.append(checkbox);
        
            return this;
        },
        // onCheckboxChange: function() {
        //     var cb = $('input[type="checkbox"]');
        //     var v = cb.is(':checked') ? cb[0].value : null;
        //     this.setValue(v);
        // },
        onCheckboxChange: function() {
            this.setValue(this.$('input').is(':checked'));
        }
    
    },{
        createFromElement: function(el) {
            var attr = $(el).getAllAttributes();
            var checked = attr.checked == 'true';

            return new this({
                el: el,
                name: attr.name,
                value: attr.value,
                required: attr.required,
                checked: checked
            });
        }
    });



    form.CheckboxGroup = Backbone.View.extend({
        typeName: 'checkboxgroup',
        className: 'gui-checkboxgroup',
        events: {
            'click label': 'onClickLabel',
            'change': 'onCheckboxChange'
        },
        mixins: [form.Field],
    
    
        initialize: function(config)  {
            form.Field.initialize.call(this, config);
        },
        render: function() {
            var config = this.config;
            var rnd = parseInt(Math.random() * 100000);
            _.each(config.options || [], function(conf, i) {
                var div = $('<div></div>');
            
                // var checked = conf.checked ? ' checked="checked"' : '';
                var checked = _.indexOf(this.getValue() || [], conf.value) !== -1;
            
                var id = this.name + '_' + rnd +'_'+i;
                var checkbox = $('<input id="'+id+'" type="checkbox" name="'+this.name+'" value="'+conf.value+'"'+checked+'>');
                var label = $('<label for="'+id+'"> '+conf.text+'</label>');
                div.append(checkbox).append(label);
                this.$el.append(div);
            }, this);

            return this;
        },
        onClickLabel: function(e) {
            var cb = $(e.target).prev();
            if(!cb.is(':checked')) {
                cb[0].checked = true; // native change not triggered?
                cb.trigger('change'); // ..manually trigger a change
            }
        },    
        onCheckboxChange: function() {
            var value = [];
            this.$('input[type="checkbox"]:checked').each(function(el) {
                value.push(this.value);
            });
            this.setValue(value);
        }
    
    },{
        createFromElement: function(el) {
            return createFromElement(this, el);
        }
    });


    // ==========
    // = Radios =
    // ==========
    form.RadioGroup = Backbone.View.extend({
        typeName: 'radiogroup',
        className: 'gui-radiogroup',
        events: {
            'click label': 'onClickLabel',
            'change': 'onRadioChange'
        },
        mixins: [form.Field],    
        
        initialize: function(config)  {
            form.Field.initialize.call(this, config);
            this.horizontal = true;
            this._rnd = parseInt(Math.random()*10000);
        },
        render: function() {
            var config = this.config;
            this.$el.empty();
            _.each(config.options || [], function(conf, i) {
                var div = $('<div></div>'),
                    checked = '',
                    value = this.getValue();
            
                if(value) {
                    if(value == conf.value)
                        checked = ' checked="checked"';
                } 
                // else if(conf.checked) {
                //     checked = ' checked="checked"';
                // }
                var id = this.name+'_'+this._rnd;
                var checkbox = $('<input type="radio" id="'+id+'" value="'+conf.value+'"'+checked+'>');
                var label = $('<label for="'+id+'"> '+conf.text+'</label>');
                div.append(checkbox).append(label);
                this.$el.append(div);
            }, this);

            if(this.horizontal)
                this.$el.addClass('horizontal');

            return this;
        },
        onClickLabel: function(e) {
            var radio = $(e.target).prev();
            if(!radio[0].checked) {
                radio[0].checked = true; // native change not triggered?
                radio.trigger('change'); // ..manually trigger a change
            }
        },
        onRadioChange: function(e) {
            this.setValue(e.target.value);
            this.$el.trigger('fieldchange', {field: this, value: this.getValue(), name: this.name})
        }
    
    },{
        createFromElement: function(el) {
            return createFromElement(this, el);
        }
    });




    form.Slider = Backbone.View.extend({
        typeName: 'slider',
        className: 'gui-slider',
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
            base.drag.start(conf);
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
                keys = base.keys,
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
    },{
        createFromElement: function(el) {
            return createFromElement(this, el);
        }
    });





    form.UploadField = Backbone.View.extend({
        className: 'upload',
        typeName: 'upload',
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
                '<span class="size">${base.format.filesize(obj.size)}</span>'+
                '<button class="remove">${obj.field.removeButtonText}</button>'+
            '</li>', {base: base}),
        queueItemTemplateIE: _.template2(''+
            '<li>'+
                '<div class="progressbar"></div>'+
                '<span class="name">${obj.name}</span> '+
                '<button class="remove">${obj.field.removeButtonText}</button>'+
            '</li>', {base: base}),
        
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
        
    		// process all File objects, eg
            // var files = [
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

        addFilesToXHR: function() {
        
        },

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
	
    },{
        createFromElement: function(el) {
            return createFromElement(this, el);
        }
    });


    form.Hidden = Backbone.View.extend({
        tagName: 'div',
        typeName: 'hidden',
        className: 'gui-hidden',
        mixins: [form.Field],
        initialize: function(config)  {
            form.Field.initialize.call(this, config);
        },
        render: function() {
            return this;
        }

    },{
        createFromElement: function(el) {
            return createFromElement(this, el);
        }
    });




    return form;

});

