define([
    'jquery', 
    'underscore',
    'backbone',
    'moment',    
    'globalize/globalize',
    './util'
], function($, _, Backbone, moment, Globalize, Util) {
    'use strict';

    var tools = {};

    var delegateHotkeySplitter = /^(\S+)\s+(\S+)\s*(.*)$/;    


    function headOrTail(e, el) {
        var left = $(el).offset().left,
            center = $(el).outerWidth() / 2 + left;
        return e.pageX > center ? 'tail' : 'head';
    }


    tools.reverseSortBy = function(sortByFunction) {
        return function(left, right) {
            var l = sortByFunction(left);
            var r = sortByFunction(right);
            if (l === void 0) return -1;
            if (r === void 0) return 1;
            return l < r ? 1 : l > r ? -1 : 0;
        };
    };


    tools.center = function(el, args) {
        el = $(el);
        var winHeight = $(window).height(),
            winWidth = $(window).width(),
            top = ((winHeight - el.outerWidth()) / 2) + $(window).scrollTop(),
            left = ((winWidth - el.outerHeight()) / 2) + $(window).scrollLeft();
        el.css({top: args.top || 0, left: left});
    };


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
        events: {
            'mousedown': 'onMouseDown'
        },
        // hotkeys: {
        //     'keydown meta+a': 'onMetaAKeyDown',
        // },

        initialize: function(config) {
            _.bindAll(this, 'onSelectableMouseDown', 'onChooseSelected', 'onSelectableKeyDown');
            this.selectables = config.selectables;
            this.collection = config.collection; // optional

            this.$el.on('mousedown', config.selectables, this.onSelectableMouseDown);
            
            // Todo: Why can't i declare this 'keydown' in events dict above?
            this.$el.on('keydown', this.onSelectableKeyDown);
            

            // Todo: Replace these silly arguments with the out-commented code below?
            if(config.chooseOnDblClick)
                this.$el.on('dblclick', config.selectables, this.onChooseSelected);
            if(config.chooseOnClick)
                this.$el.on('click', config.selectables, this.onChooseSelected);
            if(config.chooseOnMouseUp)
                this.$el.on('mouseup', config.selectables, this.onChooseSelected);
          

            // this.triggerChooseOn = config.triggerChooseOn || ['keydown enter', 'dblclick li'];
            // _.each(this.triggerChooseOn, function(evtstr) {
            //     var matches = evtstr.match(splitter),
            //         eventName = match[1], 
            //         hotkey = match[2] || '',
            //         selector = match[3] || '';
            //                         
            //     if(_.indexOf(['keydown', 'keypress', 'keyup')], matches[1]) {
            //         // register hotkey
            //         this.$el.on(eventName, selector || null, hotkey, this.chooseSelected);
            //     } else {
            //         this.$el.on(eventName, match[2] + ' ' + match[3], this.chooseSelected);                    
            //     }
            // })
        },
        getSelected: function() {
            return this.$(this.selectables).filter('.selected');
        },
        getSelectedModels: function(collection) {
            collection = collection || this.collection;
            return this.getSelected().map(function() {
                return collection.at($(this).index());
            }).toArray();
        },
        getSelectedModel: function(collection) {
            return (collection || this.collection).at(this.getSelected().filter(':first').index());
        },
        getSelectables: function() {
            return this.$(this.selectables);
        },
        toggle: function(el) {
            if($(el).is('.selected')) 
                this.unselect(el);
            else
                this.select(el);
        },
        select: function(el) {
            if(_.isNumber(el))
                el = this.$(this.selectables+':nth-child('+el+')');

            var ev = {
                el: el[0],
                selected: this.getSelected()
            };
            if(this.collection)
                ev.model = this.collection.at(el.index());
                
            $(el).addClass('selected');
            this.trigger('select', ev);
            this.trigger('change');
        },
        selectOne: function(el) {
            if(!el || !el[0])
                el = this.$(this.selectables+':visible:first');

            if(!el || !el.is(this.selectables)) 
                return;
            


            if(!el.hasClass('selected')) {
                this.unselectAll();                
                this.select(el);
            }

            el.make('head').make('tail');
        },
        selectAll: function() {
            this.unselectAll();
            this.$(this.selectables).addClass('selected');
            this.$(this.selectables).first().addClass('tail');
            this.$(this.selectables).last().addClass('head');
            this.trigger('select');
            this.trigger('change');
        },
        setSelection: function(items) {
            _(Util.listify(items)).each(function(item) {
                // item can be an index, an elemenet
                this.select(item);
            }, this);
        },
        unselect: function(el) {
            var ev = {el: el[0]};
            if(this.collection)
                ev.model = this.collection.at(el.index());
            
            $(el).removeClass('selected');
            this.trigger('unselect', ev);
            this.trigger('deselect'); // legacy
            this.trigger('change');
            
            if(this.collection)
                ev.model = this.collection.at(el.index());
        },

        unselectAll: function() {
            this.$('.selected').each(_.bind(function(i, el) {
                this.unselect($(el));
            }, this));
            this.$('.selected').removeClass('selected');
            this.$('.head').removeClass('.head');
            this.$('.tail').removeClass('.tail');
        },
        moveUp: function(steps) {

        },
        moveDown: function(steps) {
        
        },
        selectRight: function() {
            
        },
        selectLeft: function() {
            
        },
        selectUp: function() {
            
        },
        selectDown: function() {
            
        },   
        onMouseDown: function(e) {
            if(!$(e.target).closest(this.el, this.selectables).length || e.target == this.el) {
                this.unselectAll();
            }
        },
        onMetaAKeyDown: function(e) {
            if(this.keynav) {
                this.selectAll();
                e.preventDefault();
            }
        },
        onChooseSelected: function(e) {
            this.trigger('beforechoose', e);
            if(e.cancel)
                return;
            
            var el = $(e.currentTarget);
            e = {selected: el};
            
            if(this.collection)
                e.model = this.collection.at(el.index());

            this.selectOne(el);
            this.trigger('choose', e);
        },
        onSelectableMouseDown: function(e) {
            var el = $(e.currentTarget);
        
            if(e.metaKey) {
                this.toggle(el);
                el.make('head');
            }
            else if(e.shiftKey) {
                var a = this.$('.tail').index(),
                    b = el.index(),
                    start = Math.min(a,b),
                    end = Math.max(a,b);
                this.unselectAll();
                this.$(this.selectables).slice(start, end+1).addClass('selected');
                el.make('head');
            
                // Allow text selection, but no shift-click text selection
                e.preventDefault();
                Util.iepreventTextSelection(e);
            }
            else {
                this.selectOne(el);
                // this.trigger('choose', {selected: el});
            }
        },   
        onSelectableKeyDown: function(e) {
            if(e.which == Util.keys.ENTER) {
                var el = this.getSelected(),
                    ev = {selected: el};
                if(el[0]) {
                    if(this.collection)
                        ev.model = this.collection.at(el.index());
                    this.trigger('choose', ev);
                }
                e.preventDefault();
            }
            else if(Util.isArrowKey(e)) {
                if(!e.ctrlKey && !e.metaKey && !e.altKey)
                    e.preventDefault();
                
                if(!this.$('.selected').length) {
                    this.selectOne();
                    return;
                }                
                var head = this.$('.head'),
                    tail = this.$('.tail'),
                    prev = head.prevAll(this.selectables+':visible:first'),
                    next = head.nextAll(this.selectables+':visible:first');

                // within visible viewport?
                if(e.which == Util.keys.UP)
                    prev.scrollIntoView(true, this.el);
                else if(e.which == Util.keys.DOWN)
                    next.scrollIntoView(false, this.el);
            
                if(!e.shiftKey) {
                    if(e.which == Util.keys.DOWN && next[0]) 
                        this.selectOne(tail.nextAll(this.selectables+':visible:first'));
                    else if(e.which == Util.keys.UP && prev[0]) 
                        this.selectOne(tail.prevAll(this.selectables+':visible:first'));
                }    
                else {            
                    var below;
                    if(e.which == Util.keys.DOWN && next[0]) {
                        below = head.index() >= tail.index(); 
                        if(below) {
                            this.select(next);
                            next.make('head');
                        } else {
                            this.unselect(head);
                            next.make('head');
                        }
                    }
                    else if(e.which == Util.keys.UP && prev[0]) {
                        below = head.index() > tail.index();
                        if(below) {
                            this.unselect(head);
                            prev.make('head');
                        } else {
                            this.select(prev);
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


    // =========
    // = Utils =
    // =========
    var tests = {
        dateManip: /^([\+\-])?(\d{0,3})(\w)?$/,
        iscompactdate: /^(\d{2,4})(\d{2})(\d{2})$/,
        yyyymmdd: /^(\d{4})(\d{2})(\d{2})$/,
        yymmdd: /^(\d{2})(\d{2})(\d{2})$/
    };    
    tools.interpretdate = function(value, basedate) {
        var date = false;
        if(value instanceof Date) {
            date = value;
        }
        else {
            var s = $('<div>'+value+'</div>').getPreText();
            if(s == 'now') {
                date = new Date();
            }
            else if(basedate && s && tests.dateManip.test(s)) {
                // Date manipulation
                // >>> dateManip.exec('+1d')
                // ["+1d", "+", "1", "d"]
                s = tests.dateManip.exec(s);
                var method = s[1] == '-' ? 'subtract' : 'add';
                var unit = s[3] || 'd';
                var num = parseInt(s[2], 10);
                date = moment(basedate || new Date())[method](unit, num).toDate();
            }
            else if(/^\d+$/.test(s)) { // Timestamp, millis
                date = new Date(parseInt(s, 10));
            }        
            else if(s) {
                if(tests.iscompactdate.test(s)) {
                    var matcher = tests.yyyymmdd.test(s) ? tests.yyyymmdd : tests.yymmdd;
                    var gr = matcher.exec(s);
                    var year = parseInt(gr[1], 10) > 1000 ? gr[1] : parseInt(gr[1], 10)+2000;
                    date = new Date(year, gr[2]-1, gr[3]); // month is zero-based
                } 
                else {
                    // Let globalize parse it
                    var result = Globalize.parseDate(value);
                    if(result)
                        date = result;
                    else {                        
                        // let moment have a go as well
                        var m = moment(date || value);  
                        if(m && m.toDate().valueOf())
                            date = m.toDate();
                    }
                }
            }
        }
        return date; // false or window.Date object
    };




    return tools;

});

