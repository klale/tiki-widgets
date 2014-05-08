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
    A mixin for the common scenario of associating elements with models
    using the attribute data-id */
    tools.ModelToElement = {
        getModel: function(el) {
            return this.collection.get($(el).attr('data-id'));
        },
        getEl: function(model) {
            return this.$el.find(this.selector+'[data-id="'+model.id+'"]').filter(':first');
        }
    };    
    
    
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
        // Mixin support for Hotkeys
        delegateEvents: tools.Hotkeys.delegateEvents,                
        empty: function(html) {
            _(this.views).each(function(view) {
                view.remove();
            });
            return this;
        }
    },{
        extend: Util.extend
    });


    tools.Collection = Backbone.Collection.extend();
    tools.Collection.extend = Util.extend;



    tools.Sortable = Backbone.View.extend({
        hotkeys: {
            'keydown esc': 'onEscKeyDown'
        },

        initialize: function(config) {
            this.config = config;
            
            // legacy
            if(config.sortables)
                config.selector = config.sortables;

            this.selector = config.selector;
            this.collection = config.collection; // optional
            this.idAttr = config.idAttr || 'data-id';
            _.bindAll(this, 'onDragInit', 'onDragEnd', 'onDropOverHead', 'onDropOverTail', 'onDropOn', 'abort');
            
            this.$el.on('dragdown', config.selector, this.onDragDown);
            this.$el.on('draginit', config.selector, this.onDragInit);
            this.$el.on('dragend', config.selector, this.onDragEnd);
            this.$el.on('dropover', config.selector, this.onDropOver);
            this.$el.on('dropmove', config.selector, this.onDropMove);
            this.$el.on('dropoverhead', config.selector, this.onDropOverHead);
            this.$el.on('dropovertail', config.selector, this.onDropOverTail);            
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
                drag.model = this.collection.get(drag.element.attr('data-id'));
            
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




    tools.Selectable = tools.View.extend('Selectable', {
        initialize: function(config) {
            _.bindAll(this, 'onSelectableMouseDown', 'onKeyDown', 'onMetaAKeyDown', 'onSelectedAdd',
                      'onSelectedRemove', 'onSelectedReset', 'onKeyPress', 'onMouseUp', 'onSelectableMouseOver');
        
            // Implicitly create a model if not set
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
        
            this.selector = config.selector;
            this.views = config.views;
            this.keynav = Util.pop(config, 'keynav', true);
            this.dragselect = Util.pop(config, 'dragselect', true);
            this.idAttr = config.idAttr || 'data-id';
            this.textAttr = config.textAttr || 'text';
            this._typing = '';
                    
            // Bind dom handlers
            this.$el.on('mousedown', this.selector, this.onSelectableMouseDown);
            this.$el.on('mouseover', this.selector, this.onSelectableMouseOver);            
            this.$el.on('mouseup', this.onMouseUp)
            if(this.keynav) {
                this.$el.on('keydown', null, 'meta+a', this.onMetaAKeyDown);
                this.$el.on('keydown', this.onKeyDown);
                this.$el.on('keypress', this.onKeyPress);
            }
        },
        render: function() {
            this.$(this.selector+'.selected').removeClass('selected head tail');
            this.model.get('selected').each(function(model) {
                this.getEl(model).addClass('selected');
            }, this);
        },
        selectClosestStartingWith: function(text) {
            if(!text.length)
                return;
            var coll = this.model.get('selectables'),
                model = Util.getClosestStartingWith(coll, text, this.textAttr);
            if(model) 
                this.model.selectOne(model)
        },

        // Default implementations
        getModelByStartingWith: function(text) {
            if(!text.length) return;
            return Util.getClosestStartingWith(this.model.get('selectables'), 
                                               text, this.textAttr);            
        },
        getModel: function(el) {
            var idAttr = this.idAttr;
            return this.model.get('selectables').get($(el).attr(idAttr));
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
        onMouseUp: function(e) {
            if(this._dragSelecting) {
                this._dragSelecting = false;
                // you cannot change selection when drag-selecting
                this.$el.css('user-select', 'text');


                var hasChanged = this.$('.selected').length != this.model.get('selected').models.length;

                if(hasChanged) {
                    var models = this.$('.selected').map(_.bind(function(i, el) {
                        return this.getModel(el);
                    }, this)).toArray();
                    this.model.get('selected').reset(models);
                }
            }
        },
        onSelectableMouseOver: function(e) {
            if(!this._dragSelecting) 
                return;
            this.$el.css('user-select', 'none');
            e.preventDefault();
            var el = $(e.target);
            
            var a = this.$('.tail').index(),
                b = el.index(),
                start = Math.min(a,b),
                end = Math.max(a,b);
            
            // Todo: improve this
            this.$(this.selector).removeClass('selected');
            this.$(this.selector).slice(start, end+1).addClass('selected');
                
            // sel.get('selected').reset(sel.get('selectables').slice(start, end+1));
            el.make('head');                
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
                if(this.dragselect)
                    this._dragSelecting = true;
                var m = this.getModel(el);
                // No action if clicking the only selected item multiple times
                if(sel.isSelected(m) && sel.get('selected').length == 1)
                    return;

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
        },
        onKeyPress: function(e) {
            if(e.which < 48) 
                return;
            this._typing += String.fromCharCode(e.charCode);
            this._onKeyPressDeb();
            var model = this.getModelByStartingWith(this._typing)
            if(model) 
                this.model.selectOne(model);
        },
        _onKeyPressDeb: _.debounce(function() {
            this._typing = '';
        }, 500)
    });    




    
    
    tools.SelectableMutate = tools.View.extend('SelectableMutate', {
        initialize: function(config) {
            _.bindAll(this, 'onSelectableMouseDown', 'onKeyDown', 'onMetaAKeyDown', 
                'onSelectedChange', 'onKeyPress', 'onMouseUp', 'onSelectableMouseOver');
        
            if(config.selectables)
                this.collection = config.selectables
                
            this.listenTo(this.collection, 'change:selected', this.onSelectedChange);
            this.listenTo(this.collection, 'change:active', this.onActiveChange);
            this.listenTo(this.collection, 'change:disabled', this.onDisabledChange);
        
            this.selector = config.selector;
            this.views = config.views;
            this.keynav = Util.pop(config, 'keynav', true);
            this.dragselect = Util.pop(config, 'dragselect', true);
            this.idAttr = config.idAttr || 'data-id';
            this.textAttr = config.textAttr || 'text';
            this.selectOnNavigate = config.selectOnNavigate !== false;
            this._typing = '';
            
            if(config.selected)
                this.reset(config.selected, {silent:true});
                    
            // Bind dom handlers
            this.$el.on('mousedown', this.selector, this.onSelectableMouseDown);
            this.$el.on('mouseover', this.selector, this.onSelectableMouseOver);            
            this.$el.on('mouseup', this.onMouseUp)
            if(this.keynav) {
                this.$el.on('keydown', null, 'meta+a', this.onMetaAKeyDown);
                this.$el.on('keydown', this.onKeyDown);
                this.$el.on('keypress', this.onKeyPress);
            }
        },
        render: function() {
            var self = this;
            this.$(this.selector+'.selected').removeClass('selected active tail');
            _(this.getSelected()).each(function(m) { this.getEl(m).addClass('selected'); }, this);
            _(this.getDisabled()).each(function(m) { this.getEl(m).addClass('disabled'); }, this);            
        },
        selectClosestStartingWith: function(text) {
            if(!text.length)
                return;
            var coll = this.model.get('selectables'),
                model = Util.getClosestStartingWith(coll, text, this.textAttr);
            if(model) 
                this.model.selectOne(model)
        },
    
    

        // =========================
        // = Model <-> DOM Element =
        // =========================
        getModel: function(el) {
            return this.collection.get($(el).attr(this.idAttr));
        },
        getEl: function(model) {
            return this.$el.find(this.selector+'['+this.idAttr+'="'+model.id+'"]').filter(':first');
        },
        getModelByStartingWith: function(text) {
            if(!text.length) return;
            return Util.getClosestStartingWith(this.collection, 
                                               text, this.textAttr);            
        },



        // =================
        // = Selection API =
        // =================
        getSelected: function() {
            return this.collection.filter(function(m) { return m.get('selected'); });
        },
        getFirstSelected: function() {
            return this.collection.find(function(m) { return m.get('selected'); });
        },        
        getDisabled: function() {            
            return this.collection.filter(function(m) { return m.get('disabled'); });
        },
        reset: function(models, options) {
            // Iterate selected
            options || (options = {});
            var propName = options.propName || 'selected',
                coll = this.collection;
                
            if(_.isEmpty(models)) 
                models = [];
            else
                models = Util.idArray(models);
            
            this.$(this.selector+'.'+propName).each(_.bind(function(i, el) {
                var model = this.getModel(el);
                var bool  = _.indexOf(models, model.id) !== -1;
                model.set(propName, bool, {internal: true})
            }, this));

            // Iterate models
            _(models).each(function(id) {
                coll.get(id).set(propName, true, {internal: true});
            });
            
            // Update active and tail
            if(models.length==0)
                this.$(this.selector+'.active '+this.selector+'.tail').removeClass('active tail');
            else {
                this.$(this.selector+'.'+propName+':first').make('active');
                this.$(this.selector+'.'+propName+':last').make('tail');
            }
        },
        getAllSelectedIDs: function() {
            return _.pluck(this.collection.filter(function(m) {return m.get('selected'); }), 'id');
        },
        selectFirst: function(options) {
            // options || (options = {});
            
            this.reset([], options);
            var first = this.collection.find(function(model) { return !model.get('disabled')});
            if(first)
                this.reset(first, options);
        },
        selectAll: function(options) {
            this.collection.each(function(m) { m.set('selected', true); });
        },
        add: function(model, options) {
            model.set('selected', true, options);
        },
        remove: function(model, options) {            
            model.set('selected', false, options);
        },
        toggle: function(model, options) {
            model.set('selected', !model.get('selected'));
        },
        isSelected: function(model) {
            return !!model.get('selected');
        },        
        
        // ================
        // = Model events =
        // ================
        onSelectedChange: function(model, selected) {
            this.getEl(model).toggleClass('selected', selected)
        },
        onActiveChange: function(model, selected) {
            this.getEl(model).toggleClass('active tail', selected)
        },        
        onDisabledChange: function(model, disabled) {
            this.getEl(model).toggleClass('disabled', disabled)
        },
    
    
        // ==============
        // = DOM events =
        // ==============
        onMouseDown: function(e) {
            // Clicking directly on the container deselects all
            if(!$(e.target).closest(this.el, this.selector).length || e.target == this.el) {
                this.reset();
            }
        },
        onMouseUp: function(e) {
            if(this._dragSelecting) {
                this._dragSelecting = false;
                // you cannot change selection when drag-selecting
                this.$el.css('user-select', 'text');
    
    
                var hasChanged = this.$('.selected').length != this.getSelected().length;
    
                if(hasChanged) {
                    var models = this.$('.selected').map(_.bind(function(i, el) {
                        return this.getModel(el);
                    }, this)).toArray();
                    this.reset(models);
                }
            }
        },
        onSelectableMouseOver: function(e) {
            if(!this._dragSelecting) 
                return;
            this.$el.css('user-select', 'none');
            e.preventDefault();
            var el = $(e.target);
            
            var a = this.$('.tail').index(),
                b = el.index(),
                start = Math.min(a,b),
                end = Math.max(a,b);
            
            // Todo: improve this
            this.$(this.selector).removeClass('selected');
            this.$(this.selector).slice(start, end+1).addClass('selected');
                
            // sel.get('selected').reset(sel.get('selectables').slice(start, end+1));
            el.make('active');                
        },
        onMetaAKeyDown: function(e) {
            this.selectAll();
            e.preventDefault();
        },
        onSelectableMouseDown: function(e) {
            var el = $(e.currentTarget),
                sel = this.model;
        
            if(e.metaKey) {
                this.toggle(this.getModel(el));
                el.make('active');
            }
            else if(e.shiftKey) {
                var a = this.$('.tail').index(),
                    b = el.index(),
                    start = Math.min(a,b),
                    end = Math.max(a,b);
             
                this.reset(this.collection.slice(start, end+1));
                el.make('active');
        
                // Allow text selection, but no shift-click text selection
                e.preventDefault();
                Util.iepreventTextSelection(e);
            }
            else {
                if(this.dragselect)
                    this._dragSelecting = true;
                var m = this.getModel(el);
                // No action if clicking the only selected item multiple times
                if(this.isSelected(m) && this.$(this.selector+'.selected').length == 1)
                    return;
    
                this.reset(this.getModel(el));
            }
        },   
        onKeyDown: function(e) {
            var sel = this.model,
                upOrDown = e.which == Util.keys.UP || e.which == Util.keys.DOWN,
                propName = this.selectOnNavigate ? 'selected' : 'active';
                        
            if(Util.isArrowKey(e) && upOrDown) {
                if(!e.ctrlKey && !e.metaKey && !e.altKey)
                    e.preventDefault();
                                
                if(this.$(this.selector+'.'+propName).length == 0) {
                    // select first
                    this.selectFirst({propName: propName});
                    return;
                }

                var up = e.which == Util.keys.UP,
                    down = e.which == Util.keys.DOWN,
                    active = this.$('.active'),
                    tail = this.$('.tail'),
                    prev = active.prevAll(this.selector+':visible:first'),
                    next = active.nextAll(this.selector+':visible:first');
    
                // within visible viewport?
                // Todo: Add option to specify the element to scroll instead of
                // assuming parentNode of the selected element.
                if(up) {
                    prev.scrollIntoView(true);                    
                }
                else if(down) {
                    next.scrollIntoView(false);        
                }
                
                
        
                if(!e.shiftKey) {
                    var el;                    
                    if(down && next[0]) 
                        el = tail.nextAll(this.selector+':first');
                    else if(up && prev[0]) 
                        el = tail.prevAll(this.selector+':first');
    
                    if(!el || !el[0])
                        el = this.$(this.selector+':'+ (up ? 'first':'last'));
                    
                    if(el && el[0]) {
                        if(this.selectOnNavigate) 
                            // $(el).make('head').make('selected').make('tail');
                            this.reset(this.getModel(el));
                        else
                            // this.activate(this.getModel(el));
                            this.reset(this.getModel(el), {propName: 'active'});

                    }
                }
                else {            
                    var below;
                    if(down && next[0]) {
                        below = active.index() >= tail.index(); 
                        if(below) {
                            this.add(this.getModel(next));
                            next.make('active');
                            
                        } else {
                            this.remove(this.getModel(active));
                            next.make('active');
                        }
                    }
                    else if(up && prev[0]) {
                        below = active.index() > tail.index();
                        if(below) {
                            this.remove(this.getModel(active));
                            prev.make('active');
                        } else {
                            this.add(this.getModel(prev));
                            prev.make('active');
                        }
                    }
                }
            }
        },
        onKeyPress: function(e) {
            if(e.which < 48) 
                return;
            this._typing += String.fromCharCode(e.charCode);
            this._onKeyPressDeb();
            var model = this.getModelByStartingWith(this._typing)
            if(model) 
                this.reset(model, {propName: this.selectOnNavigate ? 'selected' : 'active'});
        },
        _onKeyPressDeb: _.debounce(function() {
            this._typing = '';
        }, 500)
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

