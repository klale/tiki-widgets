define([
    'jquery',
    'underscore',
    'backbone',
    'moment',
    'globalize/globalize',

    './util',
    './models',
    './jqueryext',
    'jquery.hotkeys',
], function($, _, Backbone, moment, Globalize, Util, Models) {
    'use strict';

    var tools = {};

    var delegateHotkeySplitter = /^(\S+)\s+(\S+)\s*(.*)$/;


    function headOrTail(e, el) {
        var left = $(el).offset().left,
            center = $(el).outerWidth() / 2 + left;
        return e.pageX > center ? 'tail' : 'head';
    }

    /**
     * Returns text, with any regular-expression-specific special control characters
     * escaped.
     */
    var _reCache;
    function escapeRegexp(text) {
        if (!_reCache) {
            var specials = [ '/', '.', '*', '+', '?', '|', '(', ')', '[', ']', '{', '}', '\\' ];
            _reCache = new RegExp( '(\\' + specials.join('|\\') + ')', 'g' );
        }
        return text.replace(_reCache, '\\$1');
    }


    /*
    Prevent scroll events of a scrollable element from leaking up to parents
    when reaching an end.

    Usage:
    new LocalTouchScroll({el: document});

     */
    tools.LocalTouchScroll = Backbone.View.extend({
      events: {
        'touchstart': 'onTouchStart',
        'touchmove': 'onTouchMove',
        'touchend': 'onTouchEnd'
      },
      initialize: function(options) {
        _.bindAll(this, 'onTick');
        this.speedX = 0;
        this.speedY = 0;
      },
      findFirstScrollable: function(el, horizontal) {
        while(el) {
          var style = window.getComputedStyle(el);
          var overflow = style['overflow-' + (horizontal ? 'x' : 'y')];
          if ((overflow === 'auto' || overflow === 'scroll') && el.tagName !== 'TEXTAREA') {
            return el;
          }
          el = el.parentElement;
        }
      },
      onTouchStart: function(e) {
        clearInterval(this.interval);
        var elX = this.findFirstScrollable(e.target, true);
        var elY = this.findFirstScrollable(e.target);

        this.preventDefault = elX || elY;
        this.elX = elX || this.el.body;
        this.elY = elY || this.el.body;

        var touch = e.originalEvent.touches[0];
        this.touchX = touch.pageX;
        this.touchY = touch.pageY;
      },

      onTouchMove: function(e) {
        clearInterval(this.interval);
        if (!this.preventDefault) return;
        e.preventDefault();

        var touch = e.originalEvent.touches[0];
        this.elX.scrollLeft = this.elX.scrollLeft - (touch.pageX - this.touchX)
        this.elY.scrollTop = this.elY.scrollTop - (touch.pageY - this.touchY)

        this.speedX = touch.pageX - this.touchX;
        this.speedY = touch.pageY - this.touchY;

        this.touchX = touch.pageX;
        this.touchY = touch.pageY;
      },

      onTouchEnd: function(e) {
        clearInterval(this.interval);
        if (!this.preventDefault) return;
        this.interval = setInterval(this.onTick, 15);
      },

      onTick: function() {
        this.elX.scrollLeft = this.elX.scrollLeft - this.speedX;
        this.elY.scrollTop = this.elY.scrollTop - this.speedY;

        this.speedX = this.speedX * 0.9;
        this.speedY = this.speedY * 0.9;

        var clear = this.speedX < 1 && this.speedX > -1 && this.speedY < 1 && this.speedY > -1;
        if (clear) {
          clearInterval(this.interval);
        }
      }
    });




    $.fn.scrollIntoView = function(alignWithTop, scrollable) {
        if(!this[0]) return this;
        if(scrollable && scrollable[0]) scrollable = scrollable[0];
        var el = scrollable || this[0].parentNode,
            item = this[0],
            scrollTop = el.scrollTop;
        if(!item)
            return;

        if(alignWithTop === null)
            alignWithTop = item.offsetTop < scrollTop

        // Only change scrollTop if the element is not showing
        if(alignWithTop) {
            if(item.offsetTop < scrollTop)
                el.scrollTop = item.offsetTop;
        }
        else {
            var height = $(this).outerHeight();
            if(item.offsetTop + height > el.clientHeight + scrollTop)
                el.scrollTop = item.offsetTop - el.clientHeight + height;
        }
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
            'keydown space .foo.bar': 'onFooBarSpaceDown'
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

    tools.UI = {
        bindUI: function() {
            var proto = Object.getPrototypeOf(this)
            if(!proto.ui) return;
            // Populate this.ui with the result of each selector
            this.ui = _.chain(proto.ui).map(function(v,k) {
                return [k, this.$(v)];
            }, this).object().value();
            return this;
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
            var id = model.id != null ? model.id : model;
            return this.$el.find(this.selector+'[data-id="'+id+'"]').filter(':first');
        }
    };



    /*
    A selection-api implementation, using model.attributes['selection']
    to store the selection state. */
    tools.AttributeBasedSelectable = {
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
            options || (options = {});
            var coll = this.collection;

            if(_.isEmpty(models))
                models = [];
            else
                models = Util.idArray(models);

            this.collection.each(function(model) {
                var isSelected = model.get('selected');
                if(isSelected && !~models.indexOf(model.id))
                    model.set('selected', false, {byreset: true});
                else if(!isSelected && ~models.indexOf(model.id))
                    model.set('selected', true, {byreset: true});
            });
            this.trigger('selectionreset', models, options);
        },
        getAllSelectedIDs: function() {
            return _.pluck(this.collection.filter(function(m) {return m.get('selected'); }), 'id');
        },
        selectFirst: function(options) {
            var first = this.collection.find(function(model) { return !model.get('disabled');});
            this.reset(first || [], options);
        },
        selectAll: function(options) {
            this.collection.each(function(m) { m.set('selected', true); });
            this.trigger('selectionreset', this.collection.models, options);
        },
        add: function(model, options) {
            model.set('selected', true, options);
            this.trigger('selectionadd', model, options);
        },
        remove: function(model, options) {
            model.set('selected', false, options);
            this.trigger('selectionremove', model, options);
        },
        toggle: function(model, options) {
            var method = model.get('selected') ? 'remove' : 'add';
            this[method](model, options)
        },
        isSelected: function(model) {
            return !!model.get('selected');
        }
    };



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
        constructor: function() {
            this.views = {};
            Backbone.View.apply(this, arguments);
        },
        initcls: function() {
            var proto = this.prototype,
                constr = this;

            // add "merge" support
            _.each(Util.arrayify(proto.merge), function(propname) {
                var parentval = constr.__super__[propname] || {};
                proto[propname] = _.extend({}, parentval, _.result(proto, propname));
            });
        },
        // Mixin support for `hotkeys` and `ui`
        delegateEvents: tools.Hotkeys.delegateEvents,
        bindUI: tools.UI.bindUI,
        remove: function() {
          // remove subviews if any
          this.empty();
          return tools.View.__super__.remove.call(this);
        },
        empty: function() {
          /*
          this.views = {
            foo: someView,
            bar: {baz: someOtherView, baz2: [view1, view2]}
          }
          */
          if (!_.isEmpty(this.views)) {
            iterateSubviews(this, function(subview) {
              subview.remove();
            });
            this.views = {};
          }
            return this;
        }
    },{
        extend: Util.extend
    });

    function iterateSubviews(view, visit) {
      /* iterate nested arrays and non-view objects,
      invoke `visit` for every Backbone.View passing the view
      as the only argument. */

      // Iterate subviews depth first
      function f(views) {
        if (!views) return;
        _.each(views, function(v) {
          var isView = v instanceof Backbone.View;
          if (!isView && (_.isArray(v) || _.isObject(v))) {
            f(v);
          }
          else if (isView) {
            visit(v);
          }
        });
      }

      f(view.views);
    }



    tools.ScrollbarWatcher = tools.View.extend('ScrollbarWatcher', {
        tagName: 'iframe',
        className: 'tiki-scrollbarwatcher',
        initialize: function(options) {
            options = options || {};
            _.bindAll(this, 'onLoad', 'onIframeResize');
            // Create an invisible iframe
            var css = {
                'background-color': 'transparent',
                margin: 0,
                padding: 0,
                overflow: 'hidden',
                'border-width': 0,
                position: 'fixed',
            };
            if (options.horizontal) {
                css.width = 0;
                css.height = '100%';
            } else {
                css.height = 0;
                css.width = '100%';
            }
            this.horizontal = !!options.horizontal;
            this.window = options.window || window;
            this.$el.css(css);
            this.el.addEventListener('load', this.onLoad);
        },
        onLoad: function() {
            this.el.contentWindow.addEventListener('resize', this.onIframeResize);
        },
        getScrollbarSize: function() {
          if (this.horizontal) {
            return this.window.innerHeight - this.el.scrollHeight
          }
          return this.window.innerWidth - this.el.scrollWidth;
        },
        onIframeResize: function() {
          try {
              var evt = this.window.document.createEvent('UIEvents');
              evt.initUIEvent('resize', true, false, this.window, 0);
              this.window.dispatchEvent(evt);

              // If the scrollbar size changes, trigger a custom
              // toggleverticalscrollbar or togglehorizontalscrollbar
              // event.
              var size = this.getScrollbarSize();
              if (size !== this._scrollbarSize) {
                this._scrollbarSize = size;
                var name = 'toggleverticalscrollbar';
                if (this.horizontal) {
                  name = 'togglehorizontalscrollbar';
                }
                var evt2 = this.window.document.createEvent('UIEvents');
                evt2.initUIEvent(name, true, false, this.window, 0);
                evt2.scrollbarSize = this.getScrollbarSize();
                this.window.dispatchEvent(evt2);
              }
          } catch(e) {}
        }
    });



    // legacy. Tools.Collection has moved to Util.Collection
    tools.Collection = Util.Collection;




    tools.Events = function() {
        if(this.initialize)
            this.initialize.apply(this, arguments);
    };
    _.extend(tools.Events.prototype, Backbone.Events);
    tools.Events.extend = Util.extend;


    /*
    Rearrange elements by dragging and dropping them within a
    container.

    Example
    -------
    [Put example here]
    */
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
            this.drag.spaceholder.remove();

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
            drag.allowDrop = true;
            drag.orgIndex = drag.element.index();
            drag.spaceholder = drag.element.clone();
            drag.spaceholder.addClass('tiki-spaceholder');
            drag.orgContainer = drag.element.parent();

            drag.ghostEl = drag.element.clone().addClass('tiki-ghost').appendTo(document.body);
            drag.ghostEl.css({position: 'absolute'});
            drag.index = drag.element.index();
            drag.element.hide();

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
            if(!drag.allowDrop)
                return;
            drag.currOver = {el: drop.element, part: null};
        },
        onDropMove: function(e, drop, drag) {
            if(!drag.allowDrop)
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
            if(afterSpaceholder) {
                drag.index -= 1;
            }

            drag.spaceholder.insertAfter(drop.element);
        },
        onDropOn: function(e, drop, drag) {
            if(!drag.allowDrop || drop.element[0] != drag.delegate)
                return;

            if (drag.index > drag.orgIndex) {
              drag.index -= 1;
            }
            if(this.collection) {
                this.collection.move(drag.model, drag.index);
            }
            drag.success = true;
        },
        onDragEnd: function(e, drag) {
            drag.element.show();
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
            else {
                this.abort();
            }
        },
        onEscKeyDown: function(e) {
            this.abort();
            e.preventDefault();
        }
    });


    tools.Dropdown = tools.View.extend('Tools.Dropdown', {
        /*
        This is a very common pattern consisting of two elements
        - target
        - dropdown

        The `dropdown` is shown below `target`.
        Pressing the tab key switches focus between the two. Also pressing down/up key
        might do the same.

        If either of the two loses focus to something else on the page,
        hide the dropdown.

        Use cases:
        - menu.js
        - The hypergene searchbox
        - My future textarea for tagging stuff, eg "Lalalal @carlpers.."  <-- now show a nice filtering dropdown of users
                                                                              Here the target is a <span class="user">carlpers</span>
        - Hypergene sheet, calculated column, eg "@mycol + 10" could show an auto-complete
          for the column name.


        When i write "@", then immediately create both the <span>@</span> and a new auto-complete
        view (using a Dropdown internally).

        Example
        =======
        this.dd = new Dropdown({
            el: this.el,
            target: targetEl,
            makeDropdown: this.makeDropdown
        });


        */
        initcls: function() {
            var proto = this.prototype,
                constr = this;

            Object.defineProperty(proto, 'dropdown', {
                get: function() {
                    if(!this._dropdown)
                        this._dropdown = this._makeDropdown();
                    return this._dropdown;
                },
                configurable: true,
                enumerable: true
            });
        },
        initialize: function(config) {
            _.bindAll(this, 'onDropdownTabKeyDown', 'onDropdownBlur', 'onTargetBlur',
                'onTargetTabKeyDown', 'onDropdownMouseDown', 'onTargetMouseDown', 'onEscKeyDown');
            this.target = $(config.target);
            this.target.on('keydown', null, 'tab shift+tab up down', this.onTargetTabKeyDown);
            this.target.on('keydown', null, 'esc', this.onEscKeyDown);
            this.target.on('blur', null, 'blur', this.onTargetBlur);
            this.target.on('mousedown', this.onTargetMouseDown);

            this.makeDropdown = config.makeDropdown;
        },
        _makeDropdown: function() {
            var dd = this.makeDropdown(this);

            dd.render();
            dd.$el.on('keydown', null, 'tab shift+tab', this.onDropdownTabKeyDown);
            dd.$el.on('blur', this.onDropdownBlur);
            dd.$el.on('mousedown', this.onDropdownMouseDown);
            dd.$el.on('keydown', null, 'esc', this.onEscKeyDown);
            return dd;
        },
        showDropdown: function() {
            var dd = this.dropdown,
                triggerEvent = false;
            if(!dd.el.parentNode) {
                document.body.appendChild(dd.el);
                triggerEvent = true;
            }
            dd.$el.show();
            this.fitDropdown();

            if(triggerEvent) {
                dd.trigger('dropdownshow');
                this.trigger('dropdownshow');
            }
        },
        hideDropdown: function(e) {
            this.dropdown.$el.hide();
            this.strategy = null;
            this.dropdown.trigger('dropdownhide', e);
            this.trigger('dropdownhide', e);
        },
        fitDropdown: function() {
            var dd = this.dropdown;
            var pos = Util.fitInViewport(this.target, dd.$el.outerWidth());
            // set max-height instead of height
            pos['max-height'] = pos.height;
            pos.height = '';
            this.dropdown.$el.css(pos);
            this.trigger('dropdownfit');
        },
        focusDropdown: function(e) {
            if(document.activeElement != this.dropdown.el) {
                this.dropdown.el.focus();
                this.trigger('dropdownfocus', e);
            }
        },
        focusTarget: function(e) {
            if(document.activeElement != this.target.ui) {
                this.target.focus();
                this.trigger('targetfocus', e);
            }
        },
        onEscKeyDown: function(e) {
            if(this.dropdown.$el.is(':visible')) {
                this.hideDropdown(e);
                this.focusTarget(e);
            }
        },
        onTargetTabKeyDown: function(e) {
            if(this.dropdown.$el.is(':visible')) {
                e.preventDefault();
                e.stopPropagation();
                this.focusDropdown(e);
            }
        },
        onDropdownTabKeyDown: function(e) {
            e.preventDefault();
            e.stopPropagation();
            this.focusTarget(e);
        },
        onTargetBlur: function(e) {
            setTimeout(_.bind(function(e) {
                if(document.activeElement != this.dropdown.el)
                    this.hideDropdown(e);
            }, this), 1);
        },
        onDropdownBlur: function(e) {
            setTimeout(_.bind(function(e) {
                if(document.activeElement != this.target[0])
                    this.hideDropdown(e);
            }, this), 1);
        },
        onTargetMouseDown: function(e) {
            this.focusTarget(e)
        },
        onDropdownMouseDown: function(e) {
            this.focusDropdown(e);
        }
    });



    /*
    Make elements navigable by keyboard.
    Todo: Add support for 2-dimensional navigation.
    */
    tools.Navigable = tools.View.extend('Tools.Navigable', {
        mixins: [tools.ModelToElement],
        initialize: function(config) {
            _.bindAll(this, 'onItemMouseDown', 'onKeyDown', 'onKeyPress');
            // Item selector, eg "> ul > li"
            // this.selector = config.selector + ':visible';
            this.selector = config.selector;

            // Poor-man's css selector splitter.
            var selector = this.selector.replace(/\s?>\s?=/g, '>');
            this.itemSelector = selector.split(/>|\s/).slice(-1)[0];

            // The element with overflow: auto|scroll
            this.scrollable = config.scrollable || this.$el;
            // Name of a model attribute to use when navigating by typing the
            // leading letter(s) of an item to jump to.
            this.textAttr = config.textAttr || 'text';
            this._typing = '';


            this.$el.on('mousedown', this.selector, this.onItemMouseDown);
            this.$el.on('keydown', this.onKeyDown);
            this.$el.on('keypress', this.onKeyPress);
        },
        onItemMouseDown: function(e) {
            var el = $(e.currentTarget),
                curr = this.$(this.selector+'.active');
            el.make('active');
            this.trigger('goto', e, el, this.getModel(el), curr);
        },
        goto: function(el, e, scrollIntoView) {
            var curr = this.$(this.selector+'.active');
            $(el).make('active');
            if(scrollIntoView != undefined) {
                $(el).scrollIntoView(scrollIntoView, this.scrollable);
            }
            this.trigger('goto', e, el[0] || el, this.getModel(el), curr);
        },
        getActiveModel: function() {
            var curr = this.$(this.selector+'.active');
            if(curr[0])
                return this.getModel(curr);
        },
        onKeyDown: function(e) {
            var sel = this.model,
                upOrDown = e.which == Util.keys.UP || e.which == Util.keys.DOWN;

            if(Util.isArrowKey(e) && upOrDown) {
                if(!e.ctrlKey && !e.metaKey && !e.altKey)
                    e.preventDefault();

                var up = e.which == Util.keys.UP,
                    down = e.which == Util.keys.DOWN;

                if(!this.$(this.selector+'.active').length) {
                    this.$(this.selector+':'+(down ? 'first':'last')).addClass('active');
                    return;
                }

                var el, active = this.$(this.selector+'.active'),
                    next = active.nextAll(this.itemSelector+':first');

                // Within visible viewport?
                // Todo: Add option to specify the element to scroll instead of
                // assuming parentNode of the selected element.
                if(up) {
                    el = active.prevAll(this.itemSelector+':first');
                    el.scrollIntoView(true, this.scrollable);
                    el.make('active');
                    this.trigger('goup', e, el, this.getModel(el), active);
                }
                else {

                    el = active.nextAll(this.itemSelector+':first');
                    el.scrollIntoView(false, this.scrollable);
                    el.make('active');
                    this.trigger('godown', e, el, this.getModel(el), active);
                }
            }
        },
        getModelByStartingWith: function(text) {
            if(!text.length) return;
            return Util.getClosestStartingWith(this.collection, text, this.textAttr);
        },
        onKeyPress: function(e) {
            if(e.which < 48)
                return;
            this._typing += String.fromCharCode(e.charCode);
            this._onKeyPressDeb();
            var model = this.getModelByStartingWith(this._typing);
            if(model) {
                var el = this.getEl(model);
                el.scrollIntoView(null, this.scrollable);
                el.make('active');
                this.trigger('goto', e, el, model);
            }
        },
        _onKeyPressDeb: _.debounce(function() {
            this._typing = '';
        }, 500)
    });


    /*
    Make elements selectable.
    */
    tools.Selectable = tools.View.extend('Tools.Selectable', {
        events: {
            'mouseup': 'onMouseUp'
        },
        hotkeys: {
            'keydown meta+a': 'onMetaAKeyDown'
        },
        mixins: [
            tools.ModelToElement,
            tools.AttributeBasedSelectable
        ],
        initialize: function(config) {
            this.dragselect = Util.pop(config, 'dragselect', true);
            this.keynav = new tools.Navigable({
                el: config.el,
                collection: config.collection,
                selector: config.selector
            });
            this.selector = config.selector;
            this.listenTo(this.keynav, 'goup', this.onGoUp, this);
            this.listenTo(this.keynav, 'godown', this.onGoDown, this);
            this.listenTo(this.keynav, 'goto', this.onGoTo, this);
            this.listenTo(this.collection, 'change:selected', this.onSelectedChange, this);
            this.$el.on('mouseover', this.selector, this.onSelectableMouseOver.bind(this));
        },
        onGoUp: function(e, el, model, prev) {
            if(!model) return;
            if(e.shiftKey) {
                if(el.index() < this.anchor.index()) // above anchor
                    this.add(model);
                else
                    this.remove(this.getModel(prev));
            }
            else {
                this.reset(model);
                this.anchor = el;
            }
        },
        onGoDown: function(e, el, model, prev) {
            if(!model) return;
            if(e.shiftKey) {
                if(el.index() > this.anchor.index()) // below anchor
                    this.add(model);
                else
                    this.remove(this.getModel(prev));
            }
            else {
                this.reset(model);
                this.anchor = el;
            }
        },
        onGoTo: function(e, el, model, prev) {
            if(!e.shiftKey)
                this.anchor = el;
            if(e.type == 'mousedown' && e.shiftKey) {
                var selector = this.$(this.selector),
                    // a = selector.index(this.anchor),
                    a = this.anchor.index(),
                    b = this.collection.indexOf(model),
                    slice = this.collection.slice(Math.min(a,b), Math.max(a,b)+1);

                this._isMouseDown = false;
                this.reset(slice);
                e.preventDefault();
            }
            else if(e.type == 'mousedown' && e.ctrlKey) {
                this.toggle(model);
            }
            else {
                if(e.type == 'mousedown' && this.dragselect) {
                    this._isMouseDown = true;
                    el.make('selected'); // fake it
                }
                else
                    this.reset(model);
            }
        },
        onSelectedChange: function(model, selected) {
            this.getEl(model).toggleClass('selected', selected);
        },
        onMetaAKeyDown: function(e) {
            this.selectAll();
            e.preventDefault();
        },
        onMouseUp: function(e) {
            if(this._isMouseDown) {
                this._isMouseDown = false;
                var models = this.$(this.selector+'.selected').map(function(i, el) {
                    return this.getModel(el);
                }.bind(this)).toArray();

                this.$el.css('user-select', 'text'); // restore text-selection
                this.reset(models);
            }
        },
        onSelectableMouseOver: function(e) {
            if(!this._isMouseDown) return;
            var el = $(e.target),
                selectables = this.$(this.selector),
                // a = this.anchor.index(),
                // b = el.index(),
                a = selectables.index(this.anchor),
                b = selectables.index(el),


                start = Math.min(a,b),
                end = Math.max(a,b);

            this.$(this.selector).removeClass('selected');
            this.$(this.selector).slice(start, end+1).addClass('selected');
            el.make('active');
            this.$el.css('user-select', 'none'); // no text-selection while drag-selecting
            e.preventDefault();
        }
    });




    tools.Filterable = tools.Events.extend({

      initialize: function(options) {
        this._filter = options.filter || '';
        this.textAttr = options.textAttr || 'text';
        this.collection = options.collection;
      },

      setFilter: function(q, options) {
        options = options || {};
        q = q.toLowerCase().replace(/\s/g, '');
        // leave early if the filter string is unchanged
        if(q === this._filter) {
          return q;
        }
        this._filter = q;

        if (!q) {
          this.collection.each(function(model) {
            if (model.get('hidden')) {
              model.set('hidden', false);
            }
          });
        }
        else {
          var chars = $.map(q.split(''), escapeRegexp);
          var re = new RegExp(chars.join('.*'), 'i');// "t.*e.*r.*m"
          this.collection.each(function(model) {
            var text = (model.get(this.textAttr) || '').toLowerCase();
            var visible = text.indexOf(q) > -1 || re.test(text);
            model.set('hidden', !visible);
          }.bind(this));
        }

        this.trigger('filterchange', {filter: this._filter}, options);
      },
      getFilter: function() {
        return this._filter;
      }
    });



    tools.Float = Backbone.View.extend({

        initialize: function(config) {
            _.bindAll(this, 'onScroll');
            this.atBottom = Util.pop(config, 'atBottom', false);
            this.atTop = Util.pop(config, 'atTop', true);
            this.doClone = config.doClone;
            this.recalcOffset = config.recalcOffset;

            if(config.scrollX) {
                this.scrollX = $(config.scrollX)[0];
                this.scrollXTopEl = this.scrollXTopEl;
            }
            else {
                this.scrollX = $(window.document)[0];
                this.scrollXTopEl = window.document;
            }
            if(config.scrollY) {
                this.scrollY = $(config.scrollY)[0];
                this.scrollYTopEl = this.scrollYTopEl;
            }
            else {
                this.scrollY = $(window.document)[0];
                this.scrollYTopEl = window.document;
            }


            this.pos = this.$el.offset();
            this.width = this.$el.width();
            this.height = this.$el.height();
            this.offsetTop = config.offsetTop || 0;


            // Add scroll listeners
            $(this.scrollX).on('scroll', this.onScroll);
            if(this.scrollX != this.scrollY)
                $(this.scrollY).on('scroll', this.onScroll);
            // Call onScroll once to kick things off, in case page happens
            // to be scrolled initially.
            this.onScroll();
        },
        createClone: function() {
            // $el.clone() does a deep clone.
            // Passing true clones events and data as well.
            if(this.doClone)
                return this.$el.clone(true).addClass('flying');
            else
                return this.$el.addClass('flying')
        },
        insertClone: function() {
            if(this.doClone)
                return this.clone.insertAfter(this.el)
        },
        flyTop: function() {
            this.clone = this.createClone();
            this.clone.css({
                position: 'fixed',
                top: this.offsetTop,
                left: this.pos.left + ($(this.scrollXTopEl).scrollLeft()*-1),
                width: this.width,
                height: this.height
            });
            this.insertClone();
            this.isFlying = true;
            this.trigger('fly');
            this.$el.trigger('fly', this);
        },
        flyBottom: function() {
            this.clone = this.createClone();
            this.clone.css({
                position: 'fixed',
                bottom: 0,
                left: this.pos.left + ($(this.scrollXTopEl).scrollLeft()*-1),
                width: this.width,
                height: this.height
            });
            this.insertClone();
            this.isFlying = true;
            this.trigger('fly');
            this.$el.trigger('land', this);
        },
        removeClone: function() {
            if(this.doClone) {
                this.clone.remove();
            }
            else {
                this.$el.css({
                    position: 'inherit',
                    left: 'inherit',
                    top: 'inherit',
                    bottom: 'inherit',
                    width: 'inherit',
                    height: 'inherit'
                });
            }
        },
        land: function() {
            this.removeClone();
            this.isFlying = false;
            this.clone = null;
            this.trigger('land');
        },
        onScroll: function(e) {
            if(!this.el.parentElement) return;
            this.width = this.$el.width();
            this.height = this.$el.height();
            this.position = this.$el.css('position');

            if(this.recalcOffset)
                this._recalcOffset();

            var scrollTop = $(this.scrollYTopEl).scrollTop(),
                viewportHeight = $(window).height(),
                above = this.pos.top < scrollTop+this.offsetTop,
                below = this.pos.top+this.height > scrollTop + viewportHeight;

            if(this.isFlying)
                this.clone.css('left', ($(this.scrollXTopEl).scrollLeft()*-1)+this.pos.left);

            if(this.atTop && above && !this.isFlying) {
                this.flyTop();
            }
            else if(this.atBottom && below && !this.isFlying) {
                this.flyBottom();
            }
            else if(!above && !below && this.isFlying) {
                this.land();
            }
        },
        _recalcOffset: _.throttle(function() {
            if(!this.isFlying)
                this.pos = this.$el.offset();
        }, 100)
    });


    return tools;
});