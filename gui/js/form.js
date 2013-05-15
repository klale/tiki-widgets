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

    var culture = 'sv-SE';
    // var formatter = Globalize('sv-SE');
    Globalize.culture('sv-SE');


    window.Globalize = Globalize;
    window.moment = moment;

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

    
    - each view class (aka "type") has a default model type, see "default_models"
    - You always specify a view type, just like html5 <input type="...">
    - 
    - A model type has no default view
    - form.fields is a list of Models, which view to use is a part of the 
      model's configuration, aka state. In theory changing model.view from 'text'
      to 'textarea' should work.
    - Soo.. a model actually knows of a view factory. Thus, we could just as well
      equip these with default view factories
    
    Form - VIew
    Form.fields - Collection
    Form.fields.at(0) - Model
    Form.fields.at(0).type - View-factory
    

    {type: 'text'}
    {type: 'textarea'}
    {type: 'email'}
    
    var myform = new Form({
        fields: [
            // vanilla text field
            {type: 'text', name: 'foo', value: 'I am foo'},  
            
            // ..change the default "string" model
            {type: 'text', model: 'currency', name: 'total_amount', value: 4827.43},
            {type: 'text', model: 'email', name: 'home_email'},            
            
            // ..there are plenty of preconfigured html5 look-a-like views
            {type: 'email', name: 'home_email'}
            
            // looks like a text field, but only accepts numbers
            {type: 'number', name: 'score', numberformat: '...'}

            // equivalent
            {type: 'text', model: 'number', name: 'score', numberformat: '...'}
                    
            ]
    });
    
    
    */

    // default_models = {
    //     'text': StringModel,
    //     'textarea': StringModel,
    //     'email': EmailModel,
    //     'date': DateModel,
    //     'datetime': DatetimeModel,
    //     'time': TimeModel,
    //     'slider': NumberModel,
    //     'number': NumberModel,
    //     'combo': StringModel
    // }



    /*
    The Text field
      - its a Text extension, and as such, having its own model
      - it has custom "interpret" and "format" implmentation represention of self.model.get('value')
      - it has a cust
    The button
      - 
    The Datepicker
     
    
    
    Shall a field hold complex or json value?

    textfield.model.get('value')  // no challenge, always a json compatible value
    amountfield.model.get('value') // ditto

    relationlist.model.get('value') // here the value is a Collection of, possibly reused, models

    boxfield.model.get('value') // 


    textfield.onBlur - this.model.set('value', ...)
    combo.selectable.onChoose - this.model.set('value', ..)
    
    
    boxfield.boxes.onAdd - this.model.set('value', ['343822AAA', '232EAF10'])
    // here, the value feels a bit stale compared to boxes
    boxfield.model.get('value')  could yield a Collection
    
    Now for the first time, a value is non-json compatible.
    A field's model.toJSON downgrades it into a json compatible representation. Eg a list of 
    ids, or something fancier.
    
    
    Doing field.model.get('value') assumes a complex value.
    Hmm.. field.model.toJSON()
          field.model.parse(json)
    
    Text
    ------------------
    field.name = 'title'
    field.enabled = true
    field.value = 'helo app!'
    toJSON()
      "helo app!"
    format()
      "helo app!"
    
    DateTextModel
    ------------------
    this.name = 'created_at'
    this.enabled = true
    this.date = '2011-11-04'
    parse(json)
        json.date = moment(json.date)
        return json
        
    toJSON()
        {name: 'created_at',
         enabled: true,
         date: "2011-11-04"}    
    
    DateText
    --------
    render()
        this.el.html(this.model.get('date').format('coolformat'))"4 nov 2011"
    
    BoxField
    --------
    field.name = 'grouping'
    field.enabled = true
    field.boxes = [{id:123, name: 'foo'}, {id:123, name: 'foo'}]
                  [<BoxModel>, <BoxModel>]
    
    ..we need to propagate the boxes-Collection changes.
    
    toJSON():
        {name: 'grouping',
         enabled: true,
         boxes: ["123", "456"]}
    parse(json):
        json.boxes = [<BoxModel>, <BoxModel>]   <-- convert to models
        
    
    */



    // =========
    // = Utils =
    // =========

    var tests = {
        dateManip: /^([\+\-])?(\d{0,3})(\w)?$/,
        iscompactdate: /^(\d{2,4})(\d{2})(\d{2})$/,
        yyyymmdd: /^(\d{4})(\d{2})(\d{2})$/,
        yymmdd: /^(\d{2})(\d{2})(\d{2})$/
    };    
    var interpretdate = function(value, basedate) {
        if(value instanceof Date) 
            return moment(value);
        
        var s = $('<div>'+value+'</div>').getPreText();
        if(s == 'now') {
            // var now = new Date();
            // return moment(new Date(now.getFullYear(), now.getMonth(), now.getDate())); // trim time
            return moment();
        }
        else if(basedate && s && tests.dateManip.test(s)) {
            // Date manipulation
            // >>> dateManip.exec('+1d')
            // ["+1d", "+", "1", "d"]
            s = tests.dateManip.exec(s);
            var method = s[1] == '-' ? 'subtract' : 'add';
            var unit = s[3] || 'd';
            var num = parseInt(s[2]);    
            return moment(basedate || new Date())[method](unit, num);
        }
        else if(/^\d+$/.test(s)) { // Timestamp, millis
            return moment(parseInt(s));
        }        
        else if(s) {
            if(tests.iscompactdate.test(s)) {
                // moment(s, "YYYYMMDD") doesn't work for some reason
                var matcher = tests.yyyymmdd.test(s) ? tests.yyyymmdd : tests.yymmdd;
                var gr = matcher.exec(s);
                var year = parseInt(gr[1]) > 1000 ? gr[1] : parseInt(gr[1])+2000;
                return moment((new Date(year, gr[2]-1, gr[3])).getTime()); // month is zero-based
            } 
            var date = Globalize.parseDate(value);
            // let moment have a go as well if Globalze can't parse
            return moment(date || value);  
        }
    };




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
            if(_.isNaN(attrs.value))
                return "Not a number";
        },
        format: function(value) {
            return Globalize.format(value, this.get('format'));
        },
        set_value: function(value, attrs) {
            if(_.isNumber(value)) 
                attrs['value'] = value;
            else
                attrs['value'] = Globalize.parseFloat(value);                
        }
    });    

    var DateTimeModel = FieldModel.extend({
        mixins: [base.ChildModel],
        defaults: {
            format: 'd'
        },
        validate: function(attrs, options) {  
            if(!(attrs.value instanceof Date) || _.isNaN(attrs.value.valueOf()))
                return "Not a date";
        },        
        format: function(value) {
            return Globalize.format(value, this.get('format'));
        },        
        set_value: function(v, attrs) {
            attrs['value'] = v ? interpretdate(v, this.get('value')).toDate() : undefined;
        },
        parse: function(json) {
            if(json.date)
                json.date = interpretdate(json.date).toDate();
            return json;
        },
        toJSON: function() {
            var json = _.clone(this.attributes);
            json.date = json.date.format(this.internalFormat);
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
        */

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
        parseValue: function(v, options) {
            // Todo: this method needs another iteration
            options = options || this.get('options');
            if(!_.isArray(v)) 
                v = [v];
            
            var val = _.compact(_.map(v, function(v) {
                if(_.isString(v))
                    return options.get(v);
                else if(_.isObject(v) && v.id)
                    return options.get(v.id);
            }));
            return val;
        },
        getopt: function(id) {
            return this.get('options').get(id.id || id);
        },
        parse: function(json) {
            // SimpleFormRow.render passes a complete <Model> to the field constructor.
            // new form.Text({..rawjson..})
            // new form.Text(modelobj)
            if(json.attributes)
                json = json.attributes;

            if(!(json.options instanceof Backbone.Collection))
                json.options = new Backbone.Collection(json.options);
            if(!(json.value instanceof Backbone.Collection))
                json.value = new Backbone.Collection(this.parseValue(json.value, json.options));
            json.value.on('all', this.onValueAll, this);
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
            field.$el.parent().find('.error').fadeOutFast();
            field.$el.parent().removeClass('invalid');
        }    
    };

    
    // =========
    // = Forms =
    // =========
    var Form = Backbone.View.extend({
        className: '',

        initialize: function(config) {
            _.bindAll(this, 'addOne', 'removeOne', 'propagateToModel', 'propagateToFields');
            this.model = config.model || new Backbone.Model();
            this.views = {};
            this.fields = new Fields(config.fields);
            
            if(config.model) {
                _.each(config.model.attributes, function(v,k) {
                    var fieldmodel = this.fields.findWhere({name: k});
                    if(fieldmodel) {
                        fieldmodel.set('value', v);
                    }
                }, this);
            }
            
            this.fields.on('add', this.addOne);
            this.fields.on('remove', this.removeOne);
            this.fields.on('change:value', this.propagateToModel);
            
            this.listenTo(this.model, 'change', this.propagateToFields);
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


    /*
    SimpleForm
    ==========
    A simple <ul> based form layout.

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

            // ..and append the field subview    
            this._fieldview = new viewtypes[this.model.get('type')]({model:this.model});
            this.$('>.field').append(this._fieldview.render().el);
            return this;
        }
    });

    var SimpleForm = Form.extend({
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
            'keydown esc': 'abort'
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
            return this;
        },

        // ===================
        // = Field interface =
        // ===================
        focus: function() {
            this.focus();
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
            this.$el.removeClass('gui-text');
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
            var v = this.interpret(this.$el.getPreText());        
            if(v !== this.model.get('value'))
                this.model.set('value', v);
            // Don't allow newlines in a text field
            e.preventDefault();
        },
        onKeyPress: function(e) {
            // On eg future numeric textfield, type is supposed to only 
            // trigger when hitting an allowed key.
            this.trigger('type', {e: e, character: String.fromCharCode(e.which)});
        }
    },{
        createFromElement: function(el) {
            var field = createFromElement(this, el);
            return field;
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
        onReturnKeyDown: function(e) {
            e.stopPropagation();
        }
    },{
        createFromElement: function(el) {
            return createFromElement(this, el);
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
                    return {id: o.id, text: o.get('text')};
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
    },{
        createFromElement: function(el) {
            return createFromElement(this, el);
        }
    });


    var Checkbox = Backbone.View.extend({
        className: 'gui-checkbox',
        events: {
            'click': 'onClick'
        },
        hotkeys: {
            'keydown space': 'onClick'
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
            return this;
        },
        onClick: function(e) {
            this.model.set('value', !this.model.get('value'));
            e.preventDefault();
        }
    },{
        createFromElement: function(el) {
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
            this.$el.empty();
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
    },{
        createFromElement: function(el) {
        }
    });







    var ColumnField = Backbone.View.extend({
        className: 'columnfield',
        attributes: {
            tabindex: 0
        },
        template: _.template(''+
            '<ul></ul>'+
            '<div class="buttons">'+
                // '<button class="add" tabindex="-1"></button>'+
                '<button class="remove" tabindex="-1"></button>'+
            '</div>'),            
        events: {
            'dropover': 'onDropOver',
            'dropout': 'onDropOut',            
            'dropon': 'onDropOn',
            'dropend': 'onDragEnd',
            'mousedown': 'onMouseDown',
            'click .remove': 'onRemoveClick' 
        },
        hotkeys: {
            'keydown backspace': 'onBackspaceDown'
        },
        defaultmodel: SelectionModel,
        
        initialize: function(config) {
            _.bindAll(this, 'addOne', 'removeOne');
            this.model = config.model || new (_.pop(config, 'modeltype') || this.defaultmodel)(config, {parse:true});
            // this.listenTo(this.model, 'change', this.render, this);
            this.views = {};

            // Collection
            var value = this.model.get('value');
            this.listenTo(value, 'add', this.addOne);
            this.listenTo(value, 'remove', this.removeOne);
            
            // Selectable
            this.selectable = new tools.Selectable({
                el: this.el,
                selectables: 'li',
                collection: value
            });
            
            // Sortable
            this.sortable = new tools.Sortable({
                el: this.el,
                sortables: 'li',
                collection: value
            });
            this.sortable.on('draginit', this.onSortableDragInit, this);
            this.$el.iefocus();
        },
        render: function() {
            this.$el.attr('name', this.model.get('name'));
            this.$el.html(this.template());
            this.model.get('value').each(function(model) {
                this.addOne(model);
            }, this);
            return this;
        },        
        addOne: function(model) {
            if(!this.views[model.cid])
                this.views[model.cid] = new BoxDir({model: model});
            var view = this.views[model.cid];
            
            // When adding a column model, implicitly give it direction 'asc' if not set.
            // This will trigger 'change' and 'change:value' of this.model if not silenced.
            if(!_.isNumeric(model.get('direction'))) 
                model.set({'direction': 'asc'}, {silent: true});
            this.$('>ul').append(view.render().el);
        },
        removeOne: function(model) {
            _.pop(this.views, model.cid).remove();
        },

                
        onDropOver: function(e, drop, drag) {
            this.$el.addClass('over');
        },
        onDropOn: function(e, drop, drag) {
            if(drag.delegate != drop.element[0]) {
                this.model.get('value').add(drag.model, {at: drag.index});
            }
        },
        onDropOut: function(e, drop, drag) {
            this.$el.removeClass('over');
        },
        onDragEnd: function(e, drop, drag) {
            this.$el.removeClass('over');
        },
        onBackspaceDown: function(e) {
            var models = this.selectable.getSelectedModels();
            this.model.get('value').remove(models);
        },
        onMouseDown: function() {
            this.el.focus(); // why is this necessary?
        },
        onSortableDragInit: function(e, drag) {
            drag.ghostEl.addClass('token-direction');
        },
        onRemoveClick: function(e) {
            var models = this.selectable.getSelectedModels();
            this.model.get('value').remove(models);
            e.stopPropagation();
            e.preventDefault(); // prevent loosing focus
        }
    });

    var BoxDir = Backbone.View.extend({
        tagName: 'li',
        template: _.template2('<span>${obj.title}</span><i class="direction"></i>'),
        events: {
            'click .direction': 'onDirectionClick',
            'mousedown .icon': 'onDirectionMouseDown'
        },
        
        initialize: function(config) {
            this.model = config.model;
            this.model.on('change:direction', this.render, this);
        },
        render: function() {
            var dir = this.model.get('direction');
            this.$el.html(this.template(this.model.toJSON()));
            
            if(dir == 'asc')
                this.$el.removeClass('desc').addClass('asc');
            else if(dir == 'desc')
                this.$el.removeClass('asc').addClass('desc');
            
            return this;
            
        },
        onDirectionMouseDown: function(e) {
            e.stopPropagation();
        },
        onDirectionClick: function(e) {
            var dir = this.model.get('direction');
            this.model.set('direction', dir == 'asc' ? 'desc' : 'asc');
        }
    });
    
    var Popup = Backbone.View.extend({
        className: 'column-popup',
        attributes: {
            tabindex: -1
        },
        events: {
            'focusleave': 'onBlur'
        },
        initialize: function(config) {
            this.model = config.model;
            this.form = new SimpleForm({
                model: config.model,
                fields: [
                    {type: 'combo', name: 'testcombo', value: 'aaa', options: [{id:'aaa',text:'Aaa'},{id:'bbb',text:'Bbb'}]},                    
                    {type: 'checkboxgroup', name: 'aggfun', options: [
                        {id: 'sum', text: 'Summering (sum)'},
                        {id: 'avg', text: 'Medelvärde (avg)'},
                        {id: 'count', text: 'Antal (count)'}
                    ]},

                    {type: 'text', name: 'title'}
                ],
                metadata: {
                    'title': {label: 'Title'},
                    'aggfun': {label: 'Aggregation function'}
                }
            });
        },
        render: function() {
            this.$el.html('').append(this.form.render().el);
            return this;
        },
        onBlur: function(e) {
            this.$el.detach();
        }
    });
    

    var BoxCog = Backbone.View.extend({
        tagName: 'li',
        template: _.template2('<span>${obj.title}</span><i class="icon-cog"></i>'),
        events: {
            'click .icon-cog': 'onCogClick'
        },
        
        initialize: function(config) {
            this.model = config.model;
            this.model.on('change:title', this.render, this);
        },
        render: function() {
            this.$el.html(this.template(this.model.toJSON()));
            return this;
        },
        onCogClick: function(e) {
            // Create?
            if(!this.popup) {
                this.popup = new Popup({model: this.model});
                this.popup.$el.on('blur', this.onPopupBlur);           
            }
            // Render, position and focus
            this.popup.render().$el.appendTo(document.body).position({
                my: 'left top',
                at: 'right top',
                of: this.$('.icon-cog'),
                collition: 'fit-flip'
            });
            this.popup.el.focus();
        }
    });



    var AllColumnsField = Backbone.View.extend({
        className: 'columnfield allcolumns',
        attributes: {
            tabindex: 0
        },
        template: _.template('<ul></ul>'),            
        events: {
        },
        defaultmodel: SelectionModel,
        
        initialize: function(config) {
            _.bindAll(this, 'addOne', 'removeOne', 'onSortableDragInit');
            this.model = config.model || new (_.pop(config, 'modeltype') || this.defaultmodel)(config, {parse:true});
            this.listenTo(this.model, 'change', this.render, this);
            this.views = {};

            // Collection
            var value = this.model.get('value');
            this.listenTo(value, 'add', this.addOne);
            this.listenTo(value, 'remove', this.removeOne);
                        
            // Sortable
            this.sortable = new tools.Sortable({
                el: this.el,
                sortables: 'li',
                collection: value
            });
            this.sortable.on('draginit', this.onSortableDragInit);
            this.$el.iefocus();
        },
        render: function() {
            this.$el.attr('name', this.model.get('name'));
            this.$el.html(this.template());
            this.model.get('value').each(function(model) {
                this.addOne(model);
            }, this);
            return this;
        },        
        addOne: function(model) {
            if(!this.views[model.cid])
                this.views[model.cid] = new BoxCog({model: model});
            this.$('>ul').append(this.views[model.cid].render().el);
        },
        removeOne: function(model) {
            _.pop(this.views, model.cid).remove();
        },
        onSortableDragInit: function(e, drag) {
            drag.ghostEl.addClass('token-direction');
        }        

    });

    



    var viewtypes = {
        text: Text,
        textarea: TextArea,
        combo: Combo,
        checkbox: Checkbox,
        checkboxgroup: CheckboxGroup,        
        column: ColumnField,
        allcolumns: AllColumnsField
    };
    var modeltypes = {
        bool: BoolModel,
        string: StringModel,
        number: NumberModel,
        datetime: DateTimeModel,
        selection: SelectionModel
    };





    var exp = {
        // Form views
        Form: Form,
        SimpleForm: SimpleForm,
        
        // Field views
        Text: Text,
        TextArea: TextArea,
        Combo: Combo,
        Checkbox: Checkbox,
        CheckboxGroup: CheckboxGroup,
        ColumnField: ColumnField,
        AllColumnsField: AllColumnsField,        

        // Models
        BoolModel: BoolModel,
        StringModel: StringModel,
        NumberModel: NumberModel,
        DateTimeModel: DateTimeModel,
        SelectionModel: SelectionModel,
        
        // maps
        viewtypes: viewtypes,
        modeltypes: modeltypes
    };
    window.formnew = exp;
    return exp;



});