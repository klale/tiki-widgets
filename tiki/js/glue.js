define([
    'jquery',
    'underscore',
    'backbone',
    'tiki/tools',
    'tiki/util',
    'tiki/traits',
    'tiki/controls',
], function($, _, Backbone, Tools, Util, t, Controls) {
    'use strict';

    var glue = {};

    glue.Glue = Tools.View.extend('Glue', {        
        constructor: function(config) {
            Tools.View.apply(this, arguments);
            this.modelSelector = config.modelSelector || '';
            this.collectionSelector = config.collectionSelector || '';
            this.itemView = config.itemView;
            this.draw = config.draw || {};
            this.save = config.save || {};
            this.scope = config.scope;
            this.domChangeEventName = config.domChangeEventName || 'change';
            _.defaults(this, config);
            this.setupListeners();
            
        },
        setupListeners: function(config) {
            if(this.collection)
                this.listenTo(this.collection, {
                    'change': this.onModelChange,
                    'add': this.addOne,
                    'remove': this.removeOne,
                    'reset': this.onReset
                });
            if(this.model)
                this.listenTo(this.model, 'change', this.onModelChange);
            this.$el.on(this.domChangeEventName, this.onDOMChange.bind(this));
        },
        bind: function(model1, prop1, parse1, model2, prop2, parse2) {
            this.listenTo(model1, 'change:'+prop1, function(model, newval, opt) {
                opt || (opt = {});
                if(opt.frombind) return;
                if(parse1) 
                    newval = parse1(newval)
                model2.set(prop2, newval, {frombind:true});
            });
            this.listenTo(model2, 'change:'+prop2, function(model, newval, opt) {
                opt || (opt = {});                
                if(opt.frombind) return;
                if(parse2)
                    newval = parse2(newval)
                model1.set(prop1, newval, {frombind: true});
            });
        },
        drawDefault: function(el, v, model, key, options) {
            var tagName = el.tagName.toLowerCase();
            var control = $(el).attr('control')
            if(tagName == 'input' || tagName == 'select' || tagName == 'textarea') {
                $(el).val(v);
            }
            else if(control) {
                if(!glue[control]) throw new Error('Glue["'+control+'"] does not exist')
                glue[control].apply(this, arguments);
            }
            else    
                $(el).text(v);
        },
        saveDefault: function(model, v, el, key, event) {
            model.set(key, v, {mute: el})
        },
        drawAll: function(options) {
            var model = this.model,
                collection = this.collection,
                draw = this.draw,
                drawDefault = this.drawDefault;

            if(model) {
                this.$(this.modelSelector + ' *[data-bind]').each(function(i, el) {
                    var key = $(el).attr('data-bind');
                    (draw[key] || drawDefault).call(this.scope, el, model.get(key), model, key, options || {}, this);
                }.bind(this));
            }
            if(collection) {
                this.$(this.collectionSelector + ' *[data-id]').each(function(i, el) {
                    var id = $(el).attr('data-id'),
                        model = collection.get(id);
                    if(model)
                        $(el).find('*[data-bind]').each(function(j, el2) {
                            var key = $(el2).attr('data-bind');
                            (draw[key] || drawDefault).call(this.scope, el2, model.get(key), model, key, options || {}, this)
                        })
                }.bind(this));
            }
        },
        addOne: function(model) {
            if(this.itemView && this.collectionSelector) {
                // Render the itemView template and append it to collectionSelector
                this.$(this.collectionSelector).append(this.itemView(model))
            }
        },
        removeOne: function(model) {
            var el;
            if(this.collectionSelector)
                el = this.$(this.collectionSelector).find('*[data-id="'+model.id+'"]');
            else
                el = this.$('*[data-id="'+model.id+'"]');
            el.remove();
        },
        onModelChange: function(model, options) {
            options || (options = {})
            _.each(model.changedAttributes(), function(v, key) {
                var el, draw = this.draw[key] || this.drawDefault;
                // modelSelector and collectionSelector may look like ".searchMe, .andSearchMe"
                // hence the two-pass find.
                
                // todo: This big if/else is ugly
                if(this.model && model.cid == this.model.cid) {
                    if(this.modelSelector) 
                        el = this.$(this.modelSelector).find('*[data-bind="'+key+'"]');
                    else 
                        el = this.$('*[data-bind="'+key+'"]');
                }
                else {
                    if(this.collectionSelector)
                        el = this.$(this.collectionSelector).find('*[data-id="'+model.id+'"] *[data-bind="'+key+'"]');
                    else
                        el = this.$('*[data-id="'+model.id+'"] *[data-bind="'+key+'"]');
                }
                
                el.each(function(i, el) {
                    if(options.mute != el)
                        draw.call(this.scope, el, v, model, key, options, this);
                }.bind(this))
            }, this);
        },
        onReset: function() {
            this.$(this.collectionSelector).empty();
            this.collection.each(this.addOne, this);
        },
        onDOMChange: function(e, evt) {
            // Sniff on `e`. If it's a vanilla <input> <select> and <textarea> event, 
            // fetch the value from el.value.
            // If it's a Tiki.Control or Tiki.Control-compliant event, pull the value
            // from the event object instead.
            var model = this.model;
            if(this.collection) {
                var id = $(e.target).closest('*[data-id]').attr('data-id'),
                    model = this.collection.get(id);
            }
        
            var el = $(e.target).closest('*[data-bind]'),
                key = el.attr('data-bind'),
                save = this.save[key] || this.saveDefault,
                value;
                
            if(evt) 
                // custom control
                save.call(this.scope, model, evt.value, el[0], key, e, this);
            else if(e.target.value != undefined)
                // native control
                save.call(this.scope, model, e.target.value, el[0], key, e, this);
        },        
    });
    
    
    
    

    
    glue.text = function(el, v, model, key, options, glue) {
        // Create a text control the first time..
        var text = glue.views[key]
        if(!text) {
            text = new Controls.Text({el: el});
            $(el).addClass('tiki-text');
            glue.views[key] = text;  // XXX: make a property
            text.render();
            // ..also bind the models together here..
            glue.bind(text.model, 'value', null, model, key);            
        }
        text.model.value = v;           
    };

    glue.textarea = function(el, v, model, key, options, glue) {
        // Create a text control the first time..
        var textarea = glue.views[key];
        if(!textarea) {
            textarea = new Controls.TextArea({el: el});
            $(el).addClass('tiki-textarea');
            glue.views[key] = textarea;  // XXX: make a property
            textarea.render();
            // ..also bind the models together here..
            glue.bind(textarea.model, 'value', null, model, key);
        }
        textarea.model.value = v;
    };
    
    
    glue.wikitextarea = glue.textarea;


    glue.date = function(el, v, model, key, options, glue) {
        var date = glue.views[key];
        if(!date) {
            date = new Controls.Date({el: el});
            $(el).addClass('tiki-date');
            glue.views[key] = date;  // XXX: make a property
            date.render();
            date.delegateEvents();
            // ..also bind the models together here..
            glue.bind(date.model, 'value', null, model, key);
        }
        date.model.value = v;
    };

    
    
    glue.dropdown = function(el, v, model, key, options, glue) {
        var dropdown = glue.views[key];
        if(!dropdown) {
            dropdown = new Controls.Dropdown({el: el});
            $(el).addClass('tiki-dropdown');
            glue.views[key] = dropdown;
            var options = $(el).attr('options');
            if(options) {
                dropdown.model.options = glue[options];
            }
            dropdown.render();
            
            // Implicitly bind value
            glue.bind(dropdown.model, 'value', function(val) { return val.id }, model, key)

        }
        dropdown.model.value = v;
    };
    
    glue.filteringdropdown = glue.dropdown;

    glue.checkbox = function(el, v, model, key, options, glue) {
        var checkbox = glue.views[key];
        if(!checkbox) {
            checkbox = new Controls.Checkbox({el: el});
            $(el).addClass('tiki-checkbox');
            glue.views[key] = checkbox;
            var text = $(el).attr('text');
            if(text)
                checkbox.model.text = text;

            var disabled = $(el).attr('data-disabled');
            if(disabled) {
                var s = disabled.split('.'), modelname = s[0], propname = s[1];
                // Setup binding
                glue.bind(Util.getkey(glue, s[0]), s[1], null, checkbox.model, 'disabled');
                // Set initial disabled state
                checkbox.model.disabled = Util.getkey(glue, disabled);
            }

            // Implicitly bind value
            glue.bind(checkbox.model, 'value', null, model, key);
            checkbox.render();
        }
        checkbox.model.value = v;
    }
    glue.checkboxGroup = function(el, v, model, key, options, glue) {
        var group = glue.views[key];
        if(!group) {
            group = new Controls.CheckboxGroup({el: el});
            $(el).addClass('tiki-checkboxgroup');
            glue.views[key] = group;
            group.render();
        }
        checkbox.model.value = v;
    }
   
    return glue;
    
});