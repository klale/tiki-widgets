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
            this.binder = new glue.Binder();
            _.defaults(this, config);
            this.setupListeners();
            
            this.$el.attr('data-glue', 'true');
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
        drawDefault: function(el, v, model, key, options) {
            var tagName = el.tagName.toLowerCase();
            var control = $(el).attr('control')
            if(control) {
                if(!glue[control]) throw new Error('Glue["'+control+'"] does not exist')
                glue[control].apply(this, arguments);
            }
            else if(tagName == 'input' || tagName == 'select' || tagName == 'textarea') {
                $(el).val(v);
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
                    // Ignore elements with data-bind inside any nested Glues.
                    // Todo: is there any other way of skipping ceritain DOM branches? already in the selector?
                    var isNested = false;
                    $(el).parentsUntil(this.el).each(function() {
                        if(this.attributes['data-glue']) 
                            isNested=true;
                    });
                    if(!isNested)
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
            
            // Stop the event entering any parent glues
            e.stopPropagation();
            
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
    
        
    glue.Binder = Tools.Events.extend('Glue.Binder', {
        bind: function(a, b) {
            if(a.model && b.model)
                this._bindModel(a, b);
            else if(a.collection && b.collection)
                this._bindCollection(a, b);
            else
                throw new Error('Invalid Glue.Binder arguments');
        },
        _bindModel:function(a, b) {            
            if(a.attr) {
                // Bind a single attribute
                this.listenTo(a.model, 'change:'+a.attr, _.partial(this.onModelChangeOne, b.model, a.send, b.attr));
                this.listenTo(b.model, 'change:'+b.attr, _.partial(this.onModelChangeOne, a.model, b.send, a.attr));
            }
            else {
                // Bind all attribute changes
                this.listenTo(a.model, 'change', _.partial(this.onModelChange, b.model, a.send));
                this.listenTo(b.model, 'change', _.partial(this.onModelChange, a.model, b.send));
            }            
        },
        _bindCollection: function(a, b) {
            this.listenTo(a.collection, {
                'add': _.partial(this.onCollectionAdd, b.collection, a.send),
                'change': _.partial(this.onCollectionChange, b.collection, a.send)
            });
            this.listenTo(b.collection, {
                'add': _.partial(this.onCollectionAdd, a.collection, b.send),
                'change': _.partial(this.onCollectionChange, a.collection, b.send)
            });
        },

        onModelChange: function(target, send, model, opt) {
            opt || (opt = {});
            if(opt.frombind) return;
            var attrs = model.changedAttributes(),
                retval;
            if(send) retval = send(attrs, model);
            target.set(retval || attrs, Util.merge(opt, {frombind:true}));
        },
        onModelChangeOne: function(target, send, attrname, model, newval, opt) {
            opt || (opt = {});
            if(opt.frombind) return;
            if(send) 
                newval = send(newval, model)
            target.set(attrname, newval, Util.merge(opt, {frombind:true}));
        },
        onCollectionChange: function(target, send, model, collection, opt) {
            opt || (opt = {});
            if(opt.frombind) return;
            var attrs = model.changedAttributes(),
                retval;
            if(send) retval = send(attrs, model);            
            var targetModel = target.get(model.id);
            if(targetModel)
                targetModel.set(retval || attrs, Util.merge(opt, {frombind:true}));
        },        
        onCollectionAdd: function(target, send, model, coll, opt) {
            opt || (opt = {});
            if(opt.frombind) return;            
            var attrs = _.clone(model.attributes),
                retval;
            if(send)
                retval = send(attrs, model);
            target.add(retval || attrs, Util.merge(opt, {frombind:true}));
        },
        
    })
    

    
    glue.text = function(el, v, model, key, options, glue) {
        var text = glue.views[key]
        if(!text) {
            // Create a control on the first draw..
            text = new Controls.Text({el: el});
            $(el).addClass('tiki-text');
            glue.views[key] = text;
            text.render();
            glue.binder.bind({model: text.model, attr: 'value'}, {model: model, attr: key});            
        }
        text.model.value = v;           
    };

    glue.textarea = function(el, v, model, key, options, glue) {
        var textarea = glue.views[key];
        if(!textarea) {
            // Create a control on the first draw..
            textarea = new Controls.TextArea({el: el});
            $(el).addClass('tiki-textarea');
            glue.views[key] = textarea;
            textarea.render();
            glue.binder.bind({model: textarea.model, attr:'value'}, {model: model, attr: key});
        }
        textarea.model.value = v;
    };

    glue.date = function(el, v, model, key, options, glue) {
        var date = glue.views[key];
        if(!date) {
            // Create a control on the first draw..
            date = new Controls.Date({el: el});
            $(el).addClass('tiki-date');
            glue.views[key] = date;
            date.render();
            // date.delegateEvents();
            glue.binder.bind({model: date.model, attr: 'value'}, {model: model, attr: key});
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
            glue.binder.bind(
                {model: dropdown.model, attr: 'value', send: function(val) { return val.id }}, 
                {model: model, attr: key});
            
            var onChangeValue = $(el).attr('change-value');
            if(onChangeValue) {
                onChangeValue = Util.getkey(glue, onChangeValue);
                glue.binder.listenTo(dropdown.model, 'change:value', _.partial(onChangeValue, glue));
            }
            

        }
        dropdown.model.value = v;
    };
    
    glue.checkbox = function(el, v, model, key, options, glue) {
        var checkbox = glue.views[key];
        if(!checkbox) {
            checkbox = new Controls.Checkbox({el: el});
            $(el).addClass('tiki-checkbox');
            glue.views[key] = checkbox;
            var text = $(el).attr('text');
            if(!text)
                text = $(el).html();
            if(text)
                checkbox.model.set('text', text);

            // Todo: abstract this for all controls
            var disabled = $(el).attr('data-disabled');
            if(disabled) {
                var s = disabled.split('.'), modelname = s[0], propname = s[1];
                glue.binder.bind(
                    {model: Util.getkey(glue, s[0]), attr: s[1]}, 
                    {model: checkbox.model, attr: 'disabled'});
                // Set initial disabled state
                checkbox.model.disabled = Util.getkey(glue, disabled);
            }
            glue.binder.bind({model: checkbox.model, attr: 'value'}, {model: model, attr: key});
            checkbox.render();
        }
        checkbox.model.value = v;
    };
    

   
    return glue;
    
});