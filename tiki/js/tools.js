define([
    'jquery', 
    'underscore',
    'backbone',
    'moment',    
    'globalize/globalize',
    './util',
    './models'
], function($, _, Backbone, moment, Globalize, Util, Models) {
    'use strict';

    var tools = {};

    var delegateHotkeySplitter = /^(\S+)\s+(\S+)\s*(.*)$/;    


    function headOrTail(e, el) {
        var left = $(el).offset().left,
            center = $(el).outerWidth() / 2 + left;
        return e.pageX > center ? 'tail' : 'head';
    }




    /*
    A tiki View adds:
     - hotkeys
     - merge

    Example:
    --------
    var MyView = tools.View({
        events: {
            'click .foo': 'onFooClick'
        },
        // Maps to Resig's jquery-hotkeys
        hotkeys: {
            'keydown alt+c': 'onAltCKeyDown'
        },
        // Merge this Class' events with any events of parent Class
        merge: ['events']    
    })
    */
    tools.Hotkeys = {
        delegateEvents: function(events) {
            Backbone.View.prototype.delegateEvents.call(this, events);

            // Add "hotkeys" support
            if(!this.hotkeys) 
                return;

            var hotkeys = _.result(this, 'hotkeys');
            for (var key in hotkeys) {
                var method = hotkeys[key];
                if (!_.isFunction(method)) method = this[hotkeys[key]];
                if (!method) throw new Error('Method "' + hotkeys[key] + '" does not exist');
                var match = key.match(delegateHotkeySplitter);
                var eventName = match[1], 
                    hotkey = match[2],
                    selector = match[3];
                method = _.bind(method, this);
                eventName += '.delegateEvents' + this.cid;
                this.$el.on(eventName, selector || null, hotkey, method);
            }
        }        
    };
    
    
    
    /*
    Extension of Backbone.View adding support for "merge" and "hotkeys"
    
    Example
    -------
    var MyView = SomeBaseView.extend({
        
        events: {
            'click .foo': 'someHandler'
        },
        hotkeys: {
            'keydown shift+return': 'asdsad'
        },
        merge: ['events', 'hotkeys'],
             
        initialize: function() {   
        }
    })    
    */
    tools.View = Backbone.View.extend({        
        initcls: function() {
            var proto = this.prototype, 
                constr = this;
            
            // add "merge" support
            _.each(Util.arrayify(proto.merge), function(propname) {
                var parentval = constr.__super__[propname] || {};
                proto[propname] = _.extend({}, parentval, _.result(proto, propname));
            });  
        },
        mixins: [tools.Hotkeys]
    });





    tools.Sortable = Backbone.View.extend({
        hotkeys: {
            'keydown esc': 'onEscKeyDown'
        },

        initialize: function(config) {
            this.config = config;
            this.sortables = config.sortables; // a selector string
            this.collection = config.collection; // optional
            _.bindAll(this, 'onDragInit', 'onDragEnd', 'onDropOverHead', 'onDropOverTail', 'onDropOn', 'abort');
            
            this.$el.on('dragdown', config.sortables, this.onDragDown);
            this.$el.on('draginit', config.sortables, this.onDragInit);
            this.$el.on('dragend', config.sortables, this.onDragEnd);
            this.$el.on('dropover', config.sortables, this.onDropOver);
            this.$el.on('dropmove', config.sortables, this.onDropMove);
            this.$el.on('dropoverhead', config.sortables, this.onDropOverHead);
            this.$el.on('dropovertail', config.sortables, this.onDropOverTail);            
            this.$el.on('dropon', this.onDropOn);
        },
        render: function() {
            return this;
        },
        abort: function() {
            var container = this.drag.orgContainer;
            container.insertAt(this.drag.orgIndex, this.drag.element[0]);
            this.drag.cancel();
            this.cleanup();
            this.trigger('abort', {drag: this.drag});
        },
        cleanup: function() {
            $(this.drag.activeElement).off('keydown', null, 'esc', this.abort);
            this.drag.ghostEl.remove();            
            this.drag.spaceholder.remove();            
        },

        // Drag events
        onDragDown: function(e, drag) {
            drag.distance(5);
            drag.mouseOffset = Util.mouseOffset(e, e.currentTarget);
            e.preventDefault();
        },    
        onDragInit: function(e, drag) {
            if(this.collection)
                drag.model = this.collection.at(drag.element.index());
            
            this.drag = drag;
            drag.orgIndex = drag.element.index();
            drag.spaceholder = drag.element.clone();
            drag.spaceholder.addClass('tiki-spaceholder');
            drag.orgContainer = drag.element.parent();
            
            drag.ghostEl = drag.element.clone().addClass('tiki-ghost').appendTo(document.body);
            drag.ghostEl.css({position: 'absolute'});
            drag.index = drag.element.index();            
            drag.element.detach();
            drag.representative(drag.ghostEl, drag.mouseOffset.left, drag.mouseOffset.top);
            drag.name = 'tiki-sort';
            drag.sortmode = 'horizontal';

            // Add an extra event listener to activeElement
            drag.activeElement = document.activeElement;
            $(drag.activeElement).on('keydown', null, 'esc', this.abort);

            this.trigger('draginit', e, drag);
        },
        
        // Drop events
        onDropOver: function(e, drop, drag) {
            if(drag.allowDrop === false) 
                return;
            drag.currOver = {el: drop.element, part: null};
        },        
        onDropMove: function(e, drop, drag) {
            if(drag.allowDrop === false) 
                return;
            var dragel = drag.element,
                dropel = drop.element;
                
            if(dropel[0] == dragel[0])
                return;
                        
            var part = headOrTail(e, drop.element);
            if(part != drag.currOver.part && part) {
                drop.element.trigger('dropover'+part, [drop, drag]);
                drag.currOver.part = part;
            }            
        },
        onDropOverHead: function(e, drop, drag) {
            drag.index = drop.element.index();

            var afterSpaceholder = !!drop.element.prevAll('*.tiki-spaceholder')[0];
            if(afterSpaceholder)
                drag.index -= 1;
                
            drag.spaceholder.insertBefore(drop.element);
        },
        onDropOverTail: function(e, drop, drag) {
            drag.index = drop.element.index() + 1;
            var afterSpaceholder = !!drop.element.prevAll('*.tiki-spaceholder')[0];
            if(afterSpaceholder)
                drag.index -= 1;

            drag.spaceholder.insertAfter(drop.element);
        },        
        onDropOn: function(e, drop, drag) {
            if(!drag.allowDrop || drop.element[0] != drag.delegate)
                return;
            
            if(this.collection)
                this.collection.move(drag.model, drag.index);
            drag.success = true;
        },
        onDragEnd: function(e, drag) {
            if(drag.preventDefault) {
                return;
            }
            else if(drag.success) {
                if(drag.spaceholder[0].parentElement)
                    drag.spaceholder.replaceWith(drag.element); 
                else
                    drag.orgContainer.append(drag.element);
                this.cleanup();
                this.trigger('sort', {drag: drag});
            }
            else
                this.abort();
        },
        onEscKeyDown: function(e) {
            this.abort();
            e.preventDefault();
        }        
    });




    tools.Selectable = tools.View.extend({
        initialize: function(config) {
            _.bindAll(this, 'onSelectableMouseDown', 'onKeyDown', 'onMetaAKeyDown', 'onSelectedAdd',
                      'onSelectedRemove', 'onSelectedReset');
        
            // Crete the model
            if(!config.model)
                this.model = new Models.Selection({
                    selectables: config.selectables,
                    selected: config.selected,
                });
            
            
            this.listenTo(this.model.get('selected'), {
                'add': this.onSelectedAdd,
                'remove': this.onSelectedRemove,
                'reset': this.onSelectedReset
            });
        
            // view configs
            this.selector = config.selector;
            this.views = config.views;
            this.keynav = Util.pop(config, 'keynav', true);
            this.idAttr = Util.pop(config, 'idAttr', 'data-id');
            
        
            // Bind handlers
            this.$el.on('mousedown', this.selector, this.onSelectableMouseDown);
            if(this.keynav) {
                this.$el.on('keydown', null, 'meta+a', this.onMetaAKeyDown);
                this.$el.on('keydown', this.onKeyDown);
            }
        },
        render: function() {
            this.$(this.selector+'.selected').removeClass('selected head tail');
            this.model.get('selected').each(function(model) {
                this.getEl(model).addClass('selected');
            }, this);
        },
        getModel: function(el) {
            return this.model.get('selectables').get($(el).attr(this.idAttr));
        },
        getEl: function(model) {
            return this.$el.find(this.selector+'['+this.idAttr+'="'+model.id+'"]').filter(':first');
        },
        
        // Collection events
        onSelectedReset: function() {
            var selected = this.model.get('selected');
            this.$(this.selector+'.selected').removeClass('selected head tail');

            if(selected.length) {
                selected.each(function(model) {
                    this.getEl(model).addClass('selected');
                }, this);
                this.getEl(selected.at(0)).addClass('head tail');
            }
        },
        onSelectedAdd: function(model, coll, options) {
            this.getEl(model).addClass('selected');
        },
        onSelectedRemove: function(model, coll, options) {
            this.getEl(model).removeClass('selected');
        },

        // Dom events
        onMouseDown: function(e) {
            // Clicking directly on the container deselects all
            if(!$(e.target).closest(this.el, this.selector).length || e.target == this.el) {
                this.model.get('selected').reset();
            }
        },
        onMetaAKeyDown: function(e) {
            this.model.selectAll();
            e.preventDefault();
        },
        onSelectableMouseDown: function(e) {
            var el = $(e.currentTarget),
                sel = this.model;
    
            if(e.metaKey) {
                sel.toggle(this.getModel(el));
                el.make('head');
            }
            else if(e.shiftKey) {
                var a = this.$('.tail').index(),
                    b = el.index(),
                    start = Math.min(a,b),
                    end = Math.max(a,b);
                                    
                sel.get('selected').reset(sel.get('selectables').slice(start, end+1));
                el.make('head');
        
                // Allow text selection, but no shift-click text selection
                e.preventDefault();
                Util.iepreventTextSelection(e);
            }
            else {
                sel.get('selected').reset(this.getModel(el));
            }
        },   
        onKeyDown: function(e) {
            var sel = this.model;
                        
            if(Util.isArrowKey(e)) {
                if(!e.ctrlKey && !e.metaKey && !e.altKey)
                    e.preventDefault();
            

            
                if(sel.get('selected').length == 0) {
                    sel.selectFirst();
                    return;
                }
                var up = e.which == Util.keys.UP,
                    down = e.which == Util.keys.DOWN,
                    head = this.$('.head'),
                    tail = this.$('.tail'),
                    prev = head.prevAll(this.selector+':visible:first'),
                    next = head.nextAll(this.selector+':visible:first');

                // within visible viewport?
                if(up)
                    prev.scrollIntoView(true, this.el);
                else if(down)
                    next.scrollIntoView(false, this.el);
        
                if(!e.shiftKey) {
                    var el;                    
                    if(down && next[0]) 
                        el = tail.nextAll(this.selector+':first');
                    else if(up && prev[0]) 
                        el = tail.prevAll(this.selector+':first');

                    if(!el || !el[0]) {
                        el = this.$(this.selector+':'+ (up ? 'first':'last'));
                    }

                    if(el && el[0])
                        sel.get('selected').reset(this.getModel(el))
                        
                }
                else {            
                    var below;
                    if(down && next[0]) {
                        below = head.index() >= tail.index(); 
                        if(below) {
                            sel.get('selected').add(this.getModel(next));
                            next.make('head');
                            
                        } else {
                            sel.get('selected').remove(this.getModel(head));
                            next.make('head');
                        }
                    }
                    else if(up && prev[0]) {
                        below = head.index() > tail.index();
                        if(below) {
                            sel.get('selected').remove(this.getModel(head));
                            prev.make('head');
                        } else {
                            sel.get('selected').add(this.getModel(prev));
                            prev.make('head');
                        }
                    }
                }
            }
        }
    
    
    });    
        
    

    /*
    A mixin for intercepting paste (ctrl+v) operations.
    When user hits ctrl+v, the default paste is cancelled, and
    instead an event "paste" is triggered, carrying the browser
    event and the pasted text.

    Example
    --------------------
    var MyTextField = form.Text.extend({
        mixins: [form.Field, tools.InterceptPaste],
    
        initialize: function(config) {
            form.Text.prototype.initialize.call(this, config);
            tools.InterceptPaste.initialize.call(this);
            this.on('paste', this.onPaste, this);
        },
        onPaste: function(e) {
            var data = e.data.replace(/kalle/g, 'hassan');
            WysiHat.Commands.insertHTML(data);
        }
    });
    */
    tools.InterceptPaste = {
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
                    data = ev.clipboardData.getData('text/html');
                }
                else if (/text\/plain/.test(ev.clipboardData.types)) {
                    data = ev.clipboardData.getData('text/plain');
                }
                this.trigger('paste', {e: e, data: data});
                e.stopPropagation();
                e.preventDefault();
                return false;
            } else {
                var wait = function() {
                    if(el.childNodes && el.childNodes.length > 0)
                        this.processPaste(el.innerHTML);
                    else
                        setTimeout(wait,1000);         
                };
                wait();
                return true;
            }        
        }
    };
    
    
    /*
    A mixin for tabbing between elements within a single view.
    */
    tools.TabChain = {
        initialize: function() {
            this.$el.on('keydown', _.bind(this._onKeyDown, this));
        },
        _onKeyDown: function(e) {
            if(e.which == Util.keys.TAB) {
                var set = this.$('*:tabable'),
                    index = set.index(e.target),
                    next = set[index + (e.shiftKey ? -1 : 1)];
                (next || set[e.shiftKey ? set.length-1 : 0]).focus();
                e.preventDefault();
            }
        }
    };






    return tools;

});

