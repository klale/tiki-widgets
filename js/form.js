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

var form = {
    types: {}
};

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
    initcls: function() {
        var typeName = this.prototype.typeName;
        if(typeName) {
            if(!form.types[typeName]) {
                form.types[typeName] = this;
            }
        }

    },
    interpret: function(value) {
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
        if(old !== null) {
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
var MyTextField = gui.TextField.extend({
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


/*
Utility function for creating a Field instance from
a DOM element.
*/
form.createFromElement = function(klass, el) {
    var attr = $(el).getAllAttributes();
    return new klass({
        el: el,
        name: attr.name,
        value: attr.value,
        required: attr.required
    });
}

/*
Create a form from an existing <form>..</form>.

Example
-------
<form class="foo" action="/foo" method="post">
    Name: <div type="text" name="name"></div>
    Date: <div type="date" name="date"></div>
</form>

var myform = form.createFromForm({
    el: $('form.foo')
});
myform.render();

Details
-------
The config dict is expected to contain config.el being the 
exsting form to wrap. The config dict is passed to the form's
initialize. 

Optionally specify config.factory. Defauls to form.FormView.
*/
form.createFromForm = function(config) {
    
    if(config.jquery || config.tagName)
        config = {el: $(config)}
    
    var formEl = $(config.el);
    var fields = [];
    var formFactory = config.factory || form.FormView;
    
    formEl.find('*[type]').each(function() {
        var type = $(this).attr('type');
        var Type = form.types[$(this).attr('type')];
        if(!Type) 
            throw new Error('Quickform: Unknown field type: ' + $(this).attr('type'));
        var field = Type.createFromElement(this);
        fields.push(field);
    });
    formEl.attr('class', 'quickform');
    
    // Create a Form instance
    var c = config || {}
    c.action = c.action || formEl.attr('action');
    c.method = c.method || formEl.attr('method');    
    c.fields = fields;
    c.el = formEl;
    var formobj = new formFactory(c);    
    
    // Initialize fields. ..can this be removed somehow?
    _.each(formobj.form.fields, function(field) {
        var attrs = field.attributes || {};
        if(field.id) attrs.id = field.id;                
        if(field.className) attrs['class'] = field.className;
        field.$el.attr(attrs)
        field.render();
    }, this);
    formobj.render();
    
    formobj.delegateEvents();
    return formobj;    
}


form.createFromEl = function(config) {    
    var el = $(config.el);
    var fields = {};
    var formFactory = config.factory || form.Form;
    
    
    formEl.find('*[type]').each(function() {
        var type = $(this).attr('type');
        var Type = form.types[$(this).attr('type')];
        if(!Type) 
            throw new Error('Quickform: Unknown field type: ' + $(this).attr('type'));
        var field = Type.createFromElement(this);
        fields[field.name] = field;
    });

    // Create a Form instance
    var form = new formFactory(c);
    
    // Initialize fields. ..can this be removed somehow?
    _.each(formobj.form.fields, function(field) {
        var attrs = field.attributes || {};
        if(field.id) attrs.id = field.id;                
        if(field.className) attrs['class'] = field.className;
        field.$el.attr(attrs)
        field.render();
    }, this);
    formobj.render();
    
    formobj.delegateEvents();
    return formobj;    
}



function isfield(field) {
    return field && field.setValue && field.getValue;
}






// =============
// = FormModel =
// =============
form.Model = Backbone.Model.extend({        
    initialize: function(config) {
        _.bindAll(this, '_createMultipartXHR', '_onSubmitDone', 
                  '_onSubmitFail', '_onSubmitAlways', '_onBeforeSend', '_onProgress',
                  '_onLoadStart', '_onLoad');
    },
    url: function() {
        if(this.ajax && this.ajax.url)
            return this.ajax.url;
        return form.Model.__super__.url.call(this)
    },
    // save: function() {
    //     // Like a normal model save, but look for attribute values that
    //     // are file objects. If found, do a multipart save. By changing
    //     // this.sync to a custom multipartSync?
    //     // Hmm. FormModel should always use this syncer.        
    //     // TODO: replace _saveMultipart with a custom Backbone.sync implementaion
    //     // to make the following logic more accessible.
    // 
    //     if(this.isSaving)
    //         return;  // easy on the trigger
    //     this.isSaving = true;
    // 
    //     var sendxhr = _.bind(function(conf) {
    //         var jqxhr = $.ajax(conf);
    //         jqxhr.done(this._onSubmitDone);
    //         jqxhr.fail(this._onSubmitFail);
    //         jqxhr.always(this._onSubmitAlways);            
    //     }, this);
    //     
    //     if(!this.isMultipart()) {            
    //         // Do a classic json-for-the-whole-body
    //         // Same in ie and modern browsers
    //         this.trigger('onbeforesubmit');
    //         var conf = {
    //             url: this.url(),
    //             type: this.isNew() ? 'POST' : 'PUT',
    //             dataType: 'json',
    //             contentType: 'application/json; charset=UTF-8',
    //             data: JSON.stringify(this.attributes),
    //             cache: false,
    //             beforeSend: this._onBeforeSend
    //         }
    //     }
    //     else {
    //         // Submit with files as a multipart body, instead of an all-json body.
    //         // The json data is moved into "_json".
    //         var formdata;
    //         if(window.FormData) {
    //             formdata = new FormData();
    //             var json = this.getValues(formdata);
    //                             
    //             // Add the json body
    //             try {
    //                 var blob = new Blob([JSON.stringify(json)], {type: "application/json"});
    //                 formdata.append('_json', blob);
    //             } catch (e) {
    //                 formdata.append('_json', JSON.stringify(json));
    //             }
    //         }
    //         else {
    //             // IE<=9. Add the json body, will deal with the files
    //             var formdata = {'_json': JSON.stringify(this.getValues())};
    //         }
    // 
    //         // Add any files and to the formdata object
    //         var files = []
    //         _.each(this.fields, function(field) {
    //             _.each(field.files || [], function(file) {
    //                 if(formdata) // modern browser
    //                     formdata.append(field.name, file)
    //                 else // IE<10
    //                     files.push(file);
    //             });
    //         });
    // 
    //         this.trigger('onbeforesubmit');                
    //         var conf = {
    //             url: this.action,
    //             type: this.method,
    //             dataType: 'json',
    //             data: formdata,
    //             accepts: 'application/json', // <-- why is this not working? Don't remove, used by iframe-transport.
    //             headers: {'Accept': 'application/json'},
    //             iframe: $.browser.ltie10 && files.length,
    //             files: files,
    //             cache: false,
    //             contentType: false,   // <---------------- important!
    //             processData: false,   // <---------------- important!
    //             xhr: this._createMultipartXHR,
    //             beforeSend: this._onBeforeSend
    //         };
    //     }
    //     sendxhr(conf);
    // },    
    save: function(key, value, options) {
        // if (_.isObject(key) || key == null) {
        //     attrs = key;
        //     options = value;
        // } else {
        //     attrs = {};
        //     attrs[key] = value;
        // }  
        var onvalid = _.bind(function() {
            Backbone.Model.prototype.save.call(this, key, value, options);
        }, this);
        this.validateAll(onvalid);
        // this.validateAll();        
    },
    validateOne: function(attr) {
        var data = {};
        data[attr] = this.get(attr);        
        var xhr = $.ajax({
            url: this.url(),
            type: 'post',
            dataType: 'json',
            data: JSON.stringify(data),
            contentType: 'application/json',            
            beforeSend: function(xmlhttp) {
                xmlhttp.setRequestHeader('X-Validate', 'single');
            },            
            success: _.bind(function(data, textStatus, response) {
                this.trigger('valid', {model: this, fieldName: attr});
            }, this),
            error: _.bind(function(xmlhttp, textStatus, errorThrown) {
                var json = JSON.parse(xmlhttp.responseText);
                this.trigger('invalid', {model: this, fieldName: attr, error: json});
            }, this)
        });
    },
    validateAll: function(onsuccess) {
        var attributes = this.attributes;
        this.trigger('beforevalidateall');
        $.ajax({
            url: this.url(),
            // type: this.method,
            type: 'post',
            dataType: 'json',
            data: JSON.stringify(attributes),
            contentType: 'application/json',            
            beforeSend: function(xmlhttp) {
                xmlhttp.setRequestHeader('X-Validate', 'all');
            },            
            success: _.bind(function(data, textStatus, response) {
                _.each(attributes, function(val, key) { 
                    this.trigger('valid', {model: this, fieldName: key}); }, 
                this);
                this.trigger('validateallsuccess', {form: this})
                if(onsuccess)
                    onsuccess()
            }, this),
            error: _.bind(function(xmlhttp, textStatus, errorThrown) {
                var resp = JSON.parse(xmlhttp.responseText);
                _.each(attributes, function(val, key) {
                    if(resp[key])
                        this.trigger('invalid', {model: this, fieldName: key, error: resp[key]});
                    else
                        this.trigger('valid', {model: this, fieldName: key});
                }, this);
                this.trigger('validateallfail')
            }, this),
            complete: _.bind(function() {
                this.trigger('aftervalidateall')
            }, this)
        });
    },
    isMultipart: function() {
        return false;
    },
    
    
    _createMultipartXHR: function() {
        var xhr = $.ajaxSettings.xhr();
        if(xhr.upload) {
            xhr.upload.addEventListener('progress', this._onProgress, false);
            xhr.upload.addEventListener('loadstart', this._onLoadStart, false);
            xhr.upload.addEventListener('load', this._onLoad, false);
        }
        return xhr;        
    },
    _onBeforeSend: function(jqxhr, settings) {
        // why is not the normal {accepts: '..'} option working?
        jqxhr.setRequestHeader('Accept', 'application/json; charset=UTF-8');
        this.trigger('beforesend', {jqxhr: jqxhr, form: this, settings: settings});
    },
    _onSubmitDone: function(json, statusText, jqxhr) {
        this.trigger('submitdone', {jqxhr: jqxhr, form: this});
    },
    _onSubmitFail: function(jqxhr, errorStr, exception) {
        this.trigger('submitfail', {jqxhr: jqxhr, form: this});
    },
    _onSubmitAlways: function() {    
        this.trigger('submitalways', {form: this});
        this.isSaving = false;
    },
    _onProgress: function(e) {
        var progress = Math.round((e.loaded / e.total) * 100);
        this.trigger('progress', {form: this, progress: progress, e: e, loaded: e.loaded, total: e.total})
    },
    _onLoadStart: function(e) {
        this.trigger('loadstart', {form: this, e: e});
    },
    _onLoad: function(e) {
        this.trigger('load', {form: this, e: e});
    }    
});



// ========
// = Form =
// ========

/*
form.FormModel
  - describe here

form.Form
  - Abstract. 
  - has dict this.fields
  - has .model
  - No layout. Implement render() yourself.
  - Listens to 'change' of all its fields, propagate field changes to the model
  - Does not fire change events. Use this.model as the observable.

form.SimpleForm
  - Has a UL based layout
  - Requires config.fields to be a list since order is relevant.
  - Uses field.label and field.required

form.CustomForm
  - Uses an arbitrary template.
  - Ignores config.fields.
  - Renders the tempalte, sniffs type="*" and replaces those elemens with 
    <Field>.render().el, as it popuplates the this.fields dict.




Examples
=================================================

Example 1: Create a form with no layout
----------------------------------------
var myform = new form.Form({
    model: new form.Model({title: 'Foo', description: 'Foo foo bar'});,
    fields: {
        'title': new form.TextField(),
        'description': new form.TextArea(),
    }
});
console.log(myform.model.attributes)
myform.model.set({title: 'Hello', description: 'World!'});      



Example 2: Create a form with layout (SimpleForm), without passing a model
--------------------------------------------------------------------------
// An empty this.model is implicity created
var myform = new form.SimpleForm({
    ajax: {
        type: 'PUT',
        url: '/foo/bar'
    },
    fields: [
        new form.TextField({name: 'title', label: 'Title'}),
        new form.TextArea({name: 'description', label: 'Description'})
    ]
});
body.append(myform.render().el);
myform.model.save()


Example 3: Create a form with layout (SimpleForm), passing a model
------------------------------------------------------------------
var model = new form.Model({description: 'Foo foo bar'});
var myform = new form.SimpleForm({
    model: model,
    urlRoot: '/foo/bar',
    fields: [
        new form.TextField({name: 'title', label: 'Title', value: 'Initial title value'}),
        new form.TextArea({name: 'description', label: 'Description'}),
    ]
});
body.append(myform.render().el);

console.log('Values: ', myform.model.attributes)    
console.log('Values: ', myform.fields['title'].getValue(), myform.fields['description'].getValue());

myform.model.set({title: 'Adam', description: ''});
myform.model.set('title', 'Adam Bertil');
myform.fields['title'].setValue('Adam Bertil Ceasar');

myform.model.save();


Example 4
--------------------------------
this.form = new form.SimpleForm({
    fields: [
        {type: 'text', name: 'aggregate_functions', label: 'Aggregate'},
        {type: 'text', name: 'bar', label: 'Bar'},
        {type: 'checkbox', name: 'visible', label: 'Visible', checked: true},
        {type: 'checkbox', name: 'group', label: 'Group', checked: false}
    ]
});

*/

form.ErrorMessages = {
    initialize: function(config) {                
        this.model.on('invalid', this.onInvalid, this);
        this.model.on('valid', this.onValid, this);
        this.model.on('change', this.onModelChange2, this);
        console.log('Hayuken')
    },
    showError: function(field, message) {
        var el = field.$el.parent().find('.error');
        if(el.length) 
            el.show().text(message);
        else {
            $('<div class="error"></div>').text(message).insertAfter(field.el);
            field.$el.parent().addClass('invalid');
        }
    },
    hideError: function(field) {
        field.$el.parent().find('.error').fadeOut(function() {$(this).remove()});
        field.$el.parent().removeClass('invalid');        
    },
    onInvalid: function(e) {
        this.showError(this.fields[e.fieldName], e.error.message);
    },
    onValid: function(e) {
        console.log('onValid (single field)', this.fields[e.fieldName], this.fields, e.fieldName)
        this.hideError(this.fields[e.fieldName]);
    },
    onModelChange2: function(e) {
        if(!this.model.validateOne)
            return;
        
        _.each(e.changedAttributes(), function(v, k) {
            this.model.validateOne(k);
        }, this)
    }
};
    


form.Form = Backbone.View.extend({
    
    mixins: [form.ErrorMessages],
    
    initialize: function(config) {
        this.config = config;
        this.ajax = config.ajax || {};
        this.model = config.model;
        if(!this.model)
            this.model = new form.Model();
        if(config.urlRoot)
            this.model.urlRoot = config.urlRoot;
        if(config.ajax)
            this.model.ajax = config.ajax;

        form.ErrorMessages.initialize.call(this, config); 
        this.model.on('change', this.onModelChange, this);
        
        // Set this.fields
        this.fields = {};
        _.each(config.fields, function(json, key) {
            // UPDATE: duck-type, form.Fiels is an Object (mixin), 
            // hence cannot use instanceof operator
            // if(json instanceof form.Field) {
            if(isfield(json)) { 
                var field = json;
            }
            else {
                var klass = form.types[json.type];
                if(!klass)
                    throw new Error('Field factory form.types['+json.type+'] does not exist');
                var field = new klass(json);
                
                // Todo: don't instrument Field
                field.label = json.label || '';
            }
            field.name = key;
            var value = this.model.get(key);
            if(value !== undefined)
                field.value = value;
            field.on('change', this.onFormFieldChange, this)
            this.fields[key] = field;
        }, this);    
        
    },
    submit: function(options) {
        options = options || {};
        // we must intercept the save() response and remove the
        // "_redirect", "_messagebox" etc keys, before model.set(model.parse(..resp..))
        // A quick solution now is to temporarily overwrite model.parse during the request
        // then put back the origal again when done
        var orig_parse = this.model.parse;
        var model = this.model,
            org_parse = model.parse,
            respData;
        var parse = function(resp, xhr) {
            // filter out "_redirect"
            console.log('Filter out stuff:', resp)
            respData = _.clone(resp)
            delete resp['redirect']
            return resp;
        }
        var complete = function() {
            // Restoring model.parse
            model.parse = org_parse;
        }
        var success = function() {
            console.log('we made it!')
            console.log('data: ', respData)
            
            // Remove this line when upgrading from Backbone 0.9.2
            model.trigger('sync');
            
            if(respData.forward) {
                var form = $('<form><input type="hidden" name="_json" value=""/></form>').attr({
                    action: respData.forward, 
                    method: 'post'
                });
                form.appendTo(document.body)
                form[0]._json.value = JSON.stringify(this.form.getValues());
                form.submit();
            }
            // else if(status == 301 || status == 302 || status == 303 || respData.redirect) {
            else if(respData.redirect) {
                var sep = respData.redirect.indexOf('?') === -1 ? '?' : '&'
                // window.location.href = respData.redirect + sep + '_rnd=' + parseInt(Math.random()*10000000);
                window.location.href = respData.redirect;
            }
            else if(json.messagebox) {
                var config = json.messagebox;
                var msgbox = new form.MessageBox(config);
                msgbox.show();
            }  
        }
        // Hi-jacking model.parse
        model.parse = parse;
        options.complete = complete;
        options.success = success;
        model.save(null, options);
    },
    onFormFieldChange: function(e) {
        this.model.set(e.field.name, e.value);
    },
    onModelChange: function() {
        _.each(this.model.changedAttributes(), function(v,k) {
            if(this.fields[k]) {
                this.fields[k].setValue(v);
                this.fields[k].render();
            }
        }, this);
    },
});




form.SimpleForm = form.Form.extend({
    className: 'gui-simpleform',
    
    template: _.template('<ul class="form"></ul>'),
    rowTemplate: _.template2(''+
        '<li>'+
            '<div class="label">${obj.label}[[ if(obj.required) print("*") ]]</div>'+
            '<div class="field"></div>'+
        '</li>'),    
    
    initialize: function(config) {
        // Change the list to a dict
        this.fieldList = config.fields;
        fields = {};
        _.each(config.fields, function(field) {
            fields[field.name] = field;
        })
        config.fields = fields;
        
        form.SimpleForm.__super__.initialize.call(this, config);
        _.each(this.fieldList.slice(), function(field, i) {
            this.fieldList[i] = this.fields[field.name];
        }, this);
    },

    render: function() {
        this.$el.empty().html(this.template());
        var ul = this.$('>ul');

        _.each(this.fieldList, function(field) {
            var li = $(this.rowTemplate({label: field.label, required: field.required}));
            li.children('.field').append(field.render().el);
            ul.append(li);
        }, this);
        return this;        
    }
});



form.CustomForm = form.Form.extend({
    
    initialize: function(config) {
        this.domTemplate = $(config.domTemplate).clone();
        
        // el will be our dom template.
        // Iterate all *[type] divs, and create one Field for each found.
        // Render will clone `el` and substitute all matching space-holder divs,
        // ..do this for each render().
        var fields = {};
        this.domTemplate.find('*[type]').each(function() {
            var div = $(this)
            var type = div.attr('type');
            var Type = form.types[div.attr('type')];
            if(!Type) 
                throw new Error('Quickform: Unknown field type: ' + div.attr('type'));
            var field = Type.createFromElement(this);
            fields[field.name] = field;
        });
        config.fields = fields;
        form.CustomForm.__super__.initialize.call(this, config);
    },
    
    render: function() {
        this.$el.empty();
        var fields = this.fields;
        var clone = $(this.domTemplate).clone();
        clone.find('*[type]').each(function() {
            var el = $(this);
            var field = fields[el.attr('name')];
            if(field.attributes)
                field.$el.attr(field.attributes);
            field.$el.attr('class', field.className);
            el.replaceWith(field.render().el);
        });
        this.$el.append(clone);
        return this;
    },
});




/**
Semi-silly convenience class assuming things.

- Reacts to 'valid' and 'invalid' events of this.form, showing/hiding error messages.
- Pressing Return or clicking config.submitButton, invokes this.form.submit().
- While sending:
  - If a config.submitbutton is given, toggle its text to "Sending.." during the ajax request.
  - Adds class "sending" to this.el
  - Disables the submitbutton to avoid accidental double clicking


var myformlayout = form.NiceFormLayout({
    form: myform,
    rows: [
        {label: 'Foo', name: 'foo'},    <-- shorthand for {el: myform.fields['foo'].el}
        {label: 'Bar', el: someEl},     <-- ..or pass any arbitrary element
    ]
})
*/
form.NiceFormLayout = form.SimpleForm.extend({
    hotkeys: {
        'keydown return': 'onReturnKeyDown',
    },
    initialize: function(config) {
        form.NiceFormLayout.__super__.initialize.call(this, config);
        _.bindAll(this, 'onSubmitButtonClick')
                
        if(config.submitButton) {
            this.submitButton = $(config.submitButton);
            this.submitButton.on('click', this.onSubmitButtonClick);
        }
                
        this.form.on('invalid', this.onInvalid, this);
        this.form.on('valid', this.onValid, this);
        this.form.on('beforevalidateall', this.onBeforeValidateAll, this);
        this.form.on('validateallfail', this.onValidateAllFail, this);        
        this.form.on('beforesubmit', this.onBeforeSubmit, this);        
        this.form.on('submitalways', this.onSubmitAlways, this);
    },
    
    render: function() {
        // Keep a reference to the submit button
        this.submitButton = this.$('button.submit');
        this.submitButton.data('origText', this.submitButton.text());    
        return this;
    },

    showError: function(field, message) {
        var el = field.$el.parent().find('.error');
        if(el.length) 
            el.show().text(message);
        else {
            $('<div class="error"></div>').text(message).insertAfter(field.el);
            field.$el.parent().addClass('invalid');
        }
    },
    hideError: function(field) {
        field.$el.parent().find('.error').fadeOut(function() {$(this).remove()});
        field.$el.parent().removeClass('invalid');        
    },

    onInvalid: function(e) {
        this.showError(e.field, e.error.message);
    },
    onValid: function(e) {
        this.hideError(e.field);
    },    
    onReturnKeyDown: function(e) {
        if(e.which == gui.keys.ENTER) {
            this.form.submit();
        }
    },
    onBeforeValidateAll: function() {
        if(this.submitButton) {
            this.submitButton.text('Validating..');
            this.submitButton[0].disabled = true;
        }
        this.isSubmitting = true;
    },
    onValidateAllFail: function() {
        if(this.submitButton) {
            this.submitButton.text(this.submitButton.data('origText'));
            this.submitButton[0].disabled = false;
            this.isSubmitting = false;
        }
    },
    onBeforeSubmit: function() {
        if(this.submitButton)
            this.submitButton.text('Sending..');        
    },
    onSubmitAlways: function() {
        if(this.submitButton) {
            this.submitButton.text(this.submitButton.data('origText'));    
            this.submitButton[0].disabled = false;
        }
        this.$el.removeClass('sending');
        this.isSubmitting = false;
    },   
    onSubmitButtonClick: function() {
        this.form.submit();
    },
    onFail: function(e) {
        try { 
            // responseText may be garbage (non-json) "always" is not triggered 
            // if there is a js error, hence the catching.
            var resp = JSON.parse(e.jqxhr.responseText || '{}');            
            var fields = this.form.fields;
            _.each(fields, function(v, k) {
                if(resp[k] && fields[k])
                    this.showError(fields[k], resp[k])
                else
                    this.hideError(fields[k])
            });        
        } catch(e) {
            // json response was not json
        }
    }
});




/**
Convenience class owning both a Form and a FormView.


var myform = form.Quickform({
    action: '/foo/bar',
    method: 'PUT',
    fields: [
        {'name': 'foo', label: 'Foo', type='text},
        {'name': 'foo', label: 'Foo', type='text}        
    ]
});

*/
form.Quickform = Backbone.View.extend({
    className: 'quickform',

    initialize: function(config) {
        console.log('Holy schmoly!')
        var fieldsMap = {};
        _.each(config.fields, function(field) {
            fieldsMap[field.name] = field;
        })
        
        this.form = new form.RemoteValidationAjaxForm({
            action: config.action,
            method: config.method,
            fields: fieldsMap
        });
        this.formLayout = new form.NiceFormLayout({
            rows: config.fields
        });
    },
    
    render: function() {
        this.$el.empty();
        this.$el.append(this.formLayout.render().el);
        return this;        
    },
    
    
});




// ==========
// = Fields =
// ==========
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
    typeName: 'text',
    attributes: {
        tabindex: '0', 
        contentEditable: 'true'
    },
    events: {
        'keydown': 'onKeyDown',
        'keyup': 'onKeyUp',
        'keypress': 'onKeyPress',
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
        // if(value === '') 
        //     return undefined;
        if(value === undefined)
            return '';
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
    },
    onKeyUp: function(e) {
        if(e.keyCode == gui.keys.ENTER) {
            e.preventDefault();
            e.stopPropagation();
        }
        gui._keyDownEvent = null;        
    },
    onKeyPress: function(e) {
        // On eg fututre numeric textfield, type is supposed to only 
        // trigger when hitting an allowed key.
        this.trigger('type', {e: e, character: String.fromCharCode(e.which)});
    }
},{
    createFromElement: function(el) {
        $(el).attr('foo', 'bar')
        var field = form.createFromElement(this, el);
        return field
    },
    defaultValue: ''
});



form.TextArea = form.TextField.extend({
    className: 'textarea',
    typeName: 'textarea',
    
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
},{
    createFromElement: function(el) {
        return form.createFromElement(this, el);
    }
});


form.AmountField = form.TextField.extend({
    typeName: 'amount',
    
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
    typeName: 'date',
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
},{
    createFromElement: function(el) {
        return form.createFromElement(this, el);
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
    typeName: 'combo',
    className: 'combobox',
    template: _.template(''+
        '<i></i>'+
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
                e.stopPropagation();
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
    
},{
    createFromElement: function(el) {
        return form.createFromElement(this, el);
    }
});

form.EditableComboBox = form.ComboBox.extend({
    /* A cross between a textfield and combobox. */
    className: 'combobox editable',
    typeName: 'editablecombo',
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
    typeName: 'filteringcombo',
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


form.PasswordField = form.TextField.extend({
    typeName: 'password',
    className: 'textfield password',
    mixins: [form.Field]
});


form.CheckboxField = Backbone.View.extend({
    tagName: 'div',
    typeName: 'checkbox',
    className: 'checkbox',
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



form.CheckboxesField = Backbone.View.extend({
    tagName: 'div',
    typeName: 'checkboxes',
    className: 'checkboxes',
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
        return form.createFromElement(this, el);
    }
});


// ==========
// = Radios =
// ==========
form.RadiosField = Backbone.View.extend({
    tagName: 'div',
    typeName: 'radios',
    className: 'radios',
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
        return form.createFromElement(this, el);
    }
});


// Todo: What is "make:" below? This class needs an overhaul.
form.HiddenField = Backbone.View.extend({
    
    tagName: 'input',
    typeName: 'hidden',
    // attributes: {'type': 'hidden'},
    mixins: [form.Field],

    make: function(tagName, attributes, content) {
      var el = $('<input type="hidden"/>')[0]
      if (attributes) $(el).attr(attributes);
      if (content) $(el).html(content);
      return el;
    }
},{
    createFromElement: function(el) {
        return form.createFromElement(this, el);
    }
});


form.Slider = Backbone.View.extend({
    tagName: 'div',
    typeName: 'slider',
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
},{
    createFromElement: function(el) {
        return form.createFromElement(this, el);
    }
});



form.SubformField = Backbone.View.extend({
    tagName: 'div',
    typeName: 'subform',
    className: 'subform',
    rowTemplate: _.template2(''+
        '<tr>'+
            '<th>${obj.label}[[ if(obj.required) print("*") ]]</th>'+
            '<td></td>'+
        '</tr>'),
    events: {
        'fieldchange': 'onFieldChange'
    },
    mixins: [form.Field],
    
    initialize: function(conf) {
        form.Field.initialize.call(this, conf);
        this.config = conf;
        this.name = conf.name;
        this.fields = []; // list of Views

        _.each(this.config.form.fields, function(json) {
            // Create field
            var klass = quickform.types[json.type];
            if(!klass)
                throw new Error('Factory quickform.types['+json.type+'] does not exist');
            
            var field = new klass(json);            
            this.fields.push(field);            
        }, this)        
        
        _.bindAll(this, 'onFieldChange');
    },
    render: function() {
        var table = $('<table class="form"><tbody></tbody></table>');
        
        _.each(this.fields, function(field) {
            // Create table row
            var tr = $(this.rowTemplate(field));
            
            // Append and continue
            $('td', tr).append(field.render().el);
            table.append(tr);
        }, this);
        
        this.$el.html('').append(table)
        return this;
    },
    getFieldByName: function(name) {
        return _.find(this.fields, function(f) { return f.name == name; });
    },
    getFieldsByName: function(name) {
        var o = {};
        _.each(this.fields, function(f, key) { o[f.name] = f; })
        return o;
    },
    
    // ===================
    // = Field interface =
    // ===================
    showError: function(messages) {
        _.each(messages, function(message, key) { 
            var field = this.getFieldByName(key)
            if(field)
                field.showError(message);
        }, this);
    },
    hideError: function(message) {
    },
    getValue: function() {
        var values = {};
        _.each(this.fields, function(field) {
            values[field.name] = field.getValue()
        });
        return values;
    },
    setValue: function(values, options) {
        _.each(this.fields, function(field) {
            field.setValue(values[field.name], options)
        });
    },

    // ==================
    // = Event handlers =
    // ==================
    onFieldChange: function(e, evt) {
        // capture fieldchange events, and prepend the
        // name of this subform to the field name, eg
        // "first_name" becomes "mysubform.first_name".
        // Then let evt continue its bubbling up to the 
        // main form.
        if(this.name) {
            // A subform only has a named when used as a "named stand-alone", 
            // unlike being an anonymous form instance in subformlist.
            evt.name = this.name + '.' + (evt.name || evt.field.name);
            evt.value = evt.field.getValue();
        }
    }
});



form.SubformListField = Backbone.View.extend({
    /* 
    Has a list of subforms.
    
    Very much like subform, but it is a list of X instances
    of the form instead of just one instance. The user can add 
    instances in the gui. 
    
    The layout of the fields is horizontal. 
    Todo: make this a parameter, defaulting to vertical layout.
    */
    tagName: 'div',
    typeName: 'subformlist',
    className: 'subformlist',
    template: _.template2(''+
        '<div class="forms"></div>'+
        '<footer><button class="add">${obj.addButtonText}</button></footer>'
    ),
    formContainer: _.template2(''+
        '<div class="formcontainer">'+
            '<footer><button class="delete">${obj.removeButtonText}</button></footer>'+
        '</div>'
    ),
    events: {
        'click .add': "addForm",
        'fieldchange': 'onFieldChange',
        'click button.delete': 'onDeleteClick'    
    },    
    mixins: [form.Field],
    
    initialize: function(conf) {
        form.Field.initialize.call(this, conf);
        this.config = conf;
        this.name = conf.name;
        this.forms = []; // list of Views
        this.addButtonText = conf.addButtonText || 'Add';
        this.removeButtonText = conf.removeButtonText || 'Remove';
        _.bindAll(this, 'addForm');        
    },
    render: function() {
        this.$el.html('').append(this.template(this))
        var forms = this.getValue();
        this.forms = [];
        _.each(forms || [], function(formvalues) {
            var subform = this.addForm();
            subform.setValue(formvalues);
            subform.render();
        }, this);
        // Append a footer with an Add-button
        this.delegateEvents()
        return this;
    },
    
    // ===================
    // = Field interface =
    // ===================
    showError: function(messages) {
        /* Example "messages"
        {"1": {"bar": "Required"}}, */
        if(typeof(messages) == 'string') {
            Feedback.showError.call(this, messages);
            return;
        }
            
        
        
        _.each(messages, function(messages, index) { 
            var form = this.forms[parseInt(index)];
            form.showError(messages);
        }, this);
    },
    hideError: function(message) {
    },    
    getValue: function() {
        var ret = [];
        _.each(this.forms, function(form, i) {
            ret.push(form.getValue())
        })
        if(ret.length == 0) 
            return null;
        return ret;
    },
    setValue: function(value, options) {        
        this.$el.html('');
        _.each(value || [], function(formvalues, i) {
            var subformfield = this.addForm();
            subformfield.setValue(formvalues, options);
        }, this);
    },
    unsetValue: function(options) {
        form.Field.unsetValue.call(this, options);
        this.forms = [];
    },
    
    
    
    addForm: function() {
        var forms = this.$('>.forms');
        
        var container = $(this.formContainer(this));
        var form = new quickform.types.subform({
            form: this.config.form
        });
        // insert the form in its container
        container.prepend(form.render().el);
        
        forms.append(container);
        this.forms.push(form);
        return form;
    },
    removeForm: function() {        
    },
    onFieldChange: function(e, evt) {
        // capture fieldchange events, and prepend the
        // name of this subform to the field name, eg
        // "first_name" becomes "mysubform.first_name".
        // Then let evt continue its bubbling up to the 
        // main form.
        
        
        // "mysubform[1].first_name"
        // the "evt.name || .." part is to support infinite levels of nesting 
        var index = evt.field.$el.parents('.subform').index();
        // evt.name = this.name + '[' + index + '].' + (evt.name || evt.field.name);
        evt.name = this.name + '.' + (evt.name || evt.field.name);        
        evt.value = evt.field.getValue();
    },
    onDeleteClick: function(e) {
        var container = $(e.target).parents('.formcontainer')
        var i = container.index();
        this.forms.splice(i, 1)
        container.fadeOut(function() {
            container.remove();
        });
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
    typeName: 'upload',
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
	
},{
    createFromElement: function(el) {
        return form.createFromElement(this, el);
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

