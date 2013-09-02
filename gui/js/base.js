define([
    'jquery',
    'underscore',
    'backbone',
    'jquery-hotkeys',
    'jquerypp'
], function($, _, Backbone) {
    


    
    // =============
    // = Namespace =
    // =============
    var gui = {};

    // ========
    // = Keys =
    // ========
    gui.keys = {
        LEFT: 37,
        UP: 38,
        RIGHT: 39,
        DOWN: 40, 
        ENTER: 13,
        ESCAPE: 27,
        ESC: 27,
        SPACE: 32,
        TAB: 9,
        BACKSPACE: 8,
        SHIFT: 15,
        CTRL: 17,
        ALT: 18
    };
    gui.modifierKeys = {
        16: 'shift',
        17: 'ctrl',
        18: 'alt'};






    $.browser.ltie8 = $.browser.msie && parseInt($.browser.version) < 8;
    $.browser.ltie9 = $.browser.msie && parseInt($.browser.version) < 9;
    $.browser.ltie10 = $.browser.msie && parseInt($.browser.version) < 10;

    if($.browser.ltie8) {
        $(document.body).addClass('gui-ie7');
    }



    // ================
    // = IE polyfills =
    // ================
    String.trim = String.trim || _.trim;

    if(!window.getComputedStyle)
        window.getComputedStyle = function(el, pseudo) {
            this.el = el;
            this.getPropertyValue = function(prop) {
                var re = /(\-([a-z]){1})/g;
                if (prop == 'float') prop = 'styleFloat';
                if (re.test(prop)) {
                    prop = prop.replace(re, function () {
                        return arguments[2].toUpperCase();
                    });
                }
                return el.currentStyle[prop] ? el.currentStyle[prop] : null;
            };
            return this;
        };

    
    $(function() {    
        $(document.body).bind('keydown', function(e) {
            var editable = $(e.target).attr('contenteditable');
            if(!(e.which in gui.modifierKeys) && !editable) {
                gui._keyDownEvent = e;
            }
        });
        $(document.body).bind('keyup', function(e) {
            // gui._keyDownEvent = null;
        });


        var newFocused,
            prevFocused, 
            justLostFocus;
        $(document.body).bind('focusout', function(e) {
            // Something that had focus, lost it, but we don't now to what yet
            justLostFocus = e.target;
        });
        $(document.body).bind('focusin', function(e) {
            // Now a new element has received the focus, and we can compare the two
            newFocused = e.target;

            if(!justLostFocus)
                return; // first ever focus, thus no focusleave

            $(justLostFocus).parents().andSelf().reverse().each(function(i, parent) {
                if($(parent).contains(newFocused) || parent === newFocused) {
                    return false; // break
                }
                else {
                    // fire a non-bubbling focusleave
                    $(parent).triggerHandler('focusleave', {newFocused: newFocused, justLostFocus: justLostFocus});                                    
                }
            });
        });
        $(document.body).attr('tabindex', '-1');
    });


    // ==============
    // = Observable =
    // ==============
    gui.Observable = function() {
        this.initialize.apply(this, arguments);
    };
    _.extend(gui.Observable.prototype, Backbone.Events, {
        initialize: function() {}
    });
    gui.Observable.extend = Backbone.Model.extend;


    // =====================
    // = jQuery extensions =
    // =====================
    // From jQuery UI 1.9.1
    function visible( element ) {
    	return $.expr.filters.visible( element ) &&
    		!$( element ).parents().andSelf().filter(function() {
    			return $.css( this, "visibility" ) === "hidden";
    		}).length;
    }    
    function focusable( element, isTabIndexNotNaN ) {
    	var map, mapName, img,
    		nodeName = element.nodeName.toLowerCase();
    	if ( "area" === nodeName ) {
    		map = element.parentNode;
    		mapName = map.name;
    		if ( !element.href || !mapName || map.nodeName.toLowerCase() !== "map" ) {
    			return false;
    		}
    		img = $( "img[usemap=#" + mapName + "]" )[0];
    		return !!img && visible( img );
    	}
    	return ( /input|select|textarea|button|object/.test( nodeName ) ?
    		!element.disabled :
    		"a" === nodeName ?
    			element.href || isTabIndexNotNaN :
    			isTabIndexNotNaN) &&
    		// the element and all of its ancestors must be visible
    		visible( element );
    }


    /* Normalize mouse wheel through a hand-crafted "wheel" event */
    (function () {
        var oldEvents = ['mousewheel', 'DomMouseScroll', 'MozMousePixelScroll'],
            allEvents =  ['wheel'].concat(oldEvents),
            hasWheel = "onwheel" in document.createElement("div"),
            bindEvents = hasWheel ? ['wheel'] : oldEvents;
    
        if($.event.fixHooks)
            for(var i=0, name; name = allEvents[i]; i++)
                $.event.fixHooks[name] = $.event.mouseHooks;
    
        $.event.special.wheel = {
            setup: function() {            
                if(this.addEventListener) 
                    for(var i=0,name; name=bindEvents[i]; i++)
                        this.addEventListener(name, handler, false);
                else
                    this.onmousewheel = handler;
            },
            teardown: function() {
                if(this.addEventListener) 
                    for(var i=0,name; name=bindEvents[i]; i++)
                        this.addEventListener(name, handler, false);
                else
                    this.onmousewheel = handler;
            }
        };
    
        function handler(e) {
            var orgEv = e || window.event,
                e = $.event.fix(orgEv);
            e.type = "wheel";    
            e.deltaMode = orgEv.type == "MozMousePixelScroll" ? 0 : 1;
    
            if(hasWheel) { // Moz
                e.deltaX = orgEv.deltaX;
                e.deltaY = orgEv.deltaY;
                // Speed up if not inertial scroll
                var s = e.deltaX+''+e.deltaY;
                if(s.indexOf('.') !== -1) {
                    e.deltaX *= 10;
                    e.deltaY *= 10;
                }
            }
            else {
                e.deltaY = - 1/4 * orgEv.wheelDelta; // IE + webkit
                e.deltaX = orgEv.wheelDeltaX ? - 1/40 * orgEv.wheelDeltaX : 0; // webkit
            }
            return ($.event.dispatch || $.event.handle).call(this, e);
        }
    })();


    
    
    // Todo: don't fiddle with the global jquery
    $.fn.jget = function() {
        if(this.length > 0) {
            return $(this);
        }
    };
    $.fn.contains = function(childEl) {
        return $(childEl).containedBy(this);
    };
    $.fn.disableSelection = function() { 
        return this.each(function() { 
            // this.onselectstart = function() { return false; }; 
            this.unselectable = "on"; 
            $(this).addClass('disableSelection'); 
        }); 
    };
    $.fn.screen = function() { 
        var pos = this.offset(),
            body = this[0].ownerDocument.body,
            top = pos.top - body.scrollTop,
            left = pos.left - body.scrollLeft;
        return {left: left, top: top};
    };
    $.fn.iefocus = function() {
        if($.browser.ltie10) {
            this.each(function() {
                $(this).on('mousedown', function(e) { 
                    window.setTimeout(_.bind(function() {
                        this.focus(); 
                    }, this), 1);
                    this.focus();
                    // e.stopPropagation();
                });
                if($.browser.ltie8) {
                    this.hideFocus = true;
                    $(this).bind('focus', function(e) { $(e.target).addClass('focus'); });
                    $(this).bind('blur', function(e) { $(e.target).removeClass('focus'); });
                }
            });
        }
        return this;
    };
    $.fn.ieunselectable = function() { 
        this.each(function() { 
            if($.browser.ltie10)
                $(this).find('*').each(function() { this.unselectable = "on"; });
        });
        return this;
    };
    gui.iepreventTextSelection = function(e) {
        // IE7-IE8 cannot abort text selection buy calling 
        // e.preventDefault() on the mousedown event.    
        if($.browser.ltie9) {
            e.srcElement.onselectstart = function () { return false; };
            window.setTimeout(function () { e.srcElement.onselectstart = null; }, 0);
        }
    };
    $.fn.blink = function(callback) {
        this.each(function() {
            var count = 0,
                el = this;
            $(el).toggleClass('selected');
            var timer = setInterval(function() {
                $(el).toggleClass('selected', (count+1) % 2 == 0);
                count++;
                if(count == 3) {
                    clearInterval(timer);
                    callback();
                }
            }, 60);        
        });
    };
    $.fn.selectAll = function() {
        this.each(function() {
            var sel, range;
            if (window.getSelection && document.createRange) {
                sel = window.getSelection();
                range = document.createRange();
                range.selectNodeContents(this);
                sel.removeAllRanges();
                sel.addRange(range);
            } else if (document.body.createTextRange) {
                range = document.body.createTextRange();
                range.moveToElementText(this);
                range.select();
            }
        });
    };
    $.fn.moveCursorToEnd = function(el) {
        this.each(function() {
            if(document.selection) { 
                range = document.body.createTextRange();
                range.moveToElementText(this);
                range.collapse(false);
                range.select();
            }  
            else {  
                var range = document.createRange();
                range.selectNodeContents(this);
                range.collapse(false); // collapse to end
                var sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
            }        
        });
        return this;
    };

    $.fn.insertAt = function(index, element) {
        var lastIndex = this.children().size();
        if(index < 0) {
            index = Math.max(0, lastIndex + 1 + index);
        }
        this.append(element);
        if(index < lastIndex) {
            this.children().eq(index).before(this.children().last());
        }
        return this;
    };

    $.fn.make = function(className) {
        this.each(function() {
            $(this).parent().children('.'+className).removeClass(className);
            $(this).addClass(className);
        });
        return this;
    };

    $.fn.containedBy = function(parent) {
        parent = $(parent)[0];
        var isContainedBy = false;
    
        this.parents().each(function(i, par) {
            if(par === parent) {
                isContainedBy = true;
                return false; // break
            }
        });
        return isContainedBy;
    };

    $.fn.center = function(args) {
        args = $.extend({
            // defaults
            top: null  // center horizontally, manually specify top
        }, args || {});

        this.each(function() {
            var self = $(this);
            coords = get_center(self.outerWidth(), self.outerHeight());
            var left = coords[0], top = coords[1];
		
            if(args.top !== null) {
                top = args.top;
            }
            self.css({top: top, left: left});
       });
    };
    var get_center = function(width, height) {        
        var winHeight = $(window).height();
        var winWidth = $(window).width();		
        var top = ((winHeight - height) / 2) + $(window).scrollTop();
        var left = ((winWidth - width) / 2) + $(window).scrollLeft();
        return [left, top];
    };

    $.fn.getAllAttributes = function() {
        var el = this[0];
        var attributes = {}; 
        if($.browser.ltie9) {
            // Todo: Temp, stupid ie
            var attrs = el.attributes,
                names = ['name', 'factory', 'class', 'style', 'value'];
            for(var i=0; i<names.length; i++) {
                if(attrs[names[i]])
                    attributes[names[i]] = attrs[names[i]].nodeValue;
            }
        } else {
            // w3c NamedNodeMap
            $.each(el.attributes, function(index, attr) {
                attributes[attr.name] = attr.value;
            });
        }
        return attributes;
    };
    $.fn.attrs = function(attrs) {
        if(arguments.length === 0) {
            return $(this).getAllAttributes();
        }
        _.each(attrs || {}, function(val, key) {
            $(this).attr(key, val);
        }, this);
        return this;
    };

    $.fn.focusWithoutScrolling = function(){
        var x = window.scrollX, 
            y = window.scrollY;
        this.focus();
        window.scrollTo(x, y);
    };
    
    $.fn.scrollMeOnly = function() {
        this.on('wheel', function(e) {
            e.preventDefault();
            e.currentTarget.scrollTop += e.deltaY;
        });
        return this;
    };
    
    $.fn.scrollIntoView = function(alignWithTop, scrollable) {
        var el = scrollable || this.offsetParent,
            item = this[0],
            scrollTop = el.scrollTop;
        if(!item) 
            return;

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

    $.fn.box = function() {
        return {
            left: $(this).offset().left,
            top: $(this).offset().top,
            width: $(this).outerWidth(),
            height: $(this).outerHeight()
        };
    };

    $.fn.fadeOutFast = function(options) {        
        options = options || {};
        this.each(function(i, el) {
            var method = options.detach ? 'detach':'remove';
            if($.browser.ltie9) 
                $(el)[method]();
            else
                $(el).fadeOut('fast', function() {
                    $(el)[method]().css({opacity: 1, display: 'block'});
                });
        });
    };


    function tabChainTabKeyDown(e) {
        if(e.altKey || e.ctrlKey || e.metaKey)
            return;
        var set = $(e.currentTarget).find('*:tabable'),
            index = set.index(e.target),
            next = set[index + (e.shiftKey ? -1 : 1)];        
        (next || set[e.shiftKey ? set.length-1 : 0]).focus();
        e.preventDefault();
    }

    $.fn.tabChain = function(options) {
        this.each(function() {
            $(this).on('keydown tab', null, tabChainTabKeyDown); 
        });        
    }


    /*
    Example
    -------
    $('.foo').align({
        my: 'lt',
        at: 'rt',
        of: $('.bar'),
        offset: [-5, 5]
    });

    Todo: Add "within" param

    */
    $.fn.align = function(options) {
        // defaults
        options = $.extend({
            offset: [0, 0]
        }, options);

        var offsets = {t: 0, l: 0, b: 1, r: 1},
            my = options.my,
            at = options.at,
            of = options.of;
    
        var source = $(this).box();
        var target = $(options.of).box();
        var left = target.left;
        var top = target.top;

        top -= offsets[my.charAt(0)] * source.height;
        left -= offsets[my.charAt(1)] * source.width;
        top += offsets[at.charAt(0)] * target.height;
        left += offsets[at.charAt(1)] * target.width;
        left += options.offset[0];
        top += options.offset[1];
        $(this).css({
            left: left + 'px',
            top: top + 'px'
        });
    };


    $.fn.reverse = [].reverse;





    if($.browser.ltie8) {
        var field = null;
        $(document).on('mousedown', function(e) {
            field = $(e.target).closest('.gui-radio, .gui-checkbox, .gui-btn');
            if(field[0] && !field.closest('.gui-disabled')[0]) {
                field.addClass('active');
            }
            field = field[0]
        });
        $(document.body).on('mouseup', function(e) {
            if(field)
                $(field).removeClass('active');
        });        
    }


    // ==============================
    // = jQuery selector extensions =
    // ==============================
	// Mark a function for use in filtering
	var markFunction = function(fn) {
		fn.sizzleFilter = true;
		return fn;
	};    
    $.extend($.expr[':'], {
        selectable: function(el) {
            // visible and not disabled
            return $(el).is(':visible') && !$(el).is('.gui-disabled');
        }, 
        floating: function(el) {
            // absolute or fixed positioned
            var pos = el.style.position.toLowerCase();
            var pos2 = $(el).css('position');
            return  pos2 == 'absolute' || pos2 == 'fixed';            
        },
        containsre: markFunction(function(text, context, xml) {
            return function(el) {
                var re = text.replace(/^\/+|\/+$/, '').split('/'); // strip slashes, then split
                return new RegExp(re[0], re[1]).test($(el).text());
            };
        }),
        tabable: function(el) {
            return el.tabIndex !== -1 && $(el).closest('.gui-disabled').length === 0;
        },
        inviewport: function(el) {
            var scrollTop = $(window).scrollTop(),
                elTop = $(el).offset().top,
                height = $(window).height();
        
            return (elTop > scrollTop) && (elTop < scrollTop+height);
        },
        inside: markFunction(function(selector, context, xml) {
            return function(el) {
                return $(el).closest(selector).length;
            };
        }),
    	focusable: function(el) {
    		return focusable(el, !isNaN($.attr(el, "tabindex")));
    	},
        scrollable: function(el) {
            var $el = $(el),
                scroll = {'scroll': true, 'auto': true},
                of = $el.css('overflow') in scroll,
                ofX = $el.css('overflow-x') in scroll,
                ofY = $el.css('overflow-y') in scroll;
                
            // HTML can scroll with overflow:visible
            if(el.tagName == 'HTML') {
                of = $el.css('overflow') != 'hidden';
                ofX = $el.css('overflow-x') != 'hidden';
                ofY = $el.css('overflow-y') != 'hidden';
            }
            if(!of && !ofX && !ofY) 
                return false;
            return (el.clientHeight < el.scrollHeight && (of || ofY)) || (el.clientWidth < el.scrollWidth && (of || ofX));
        }        


    });

    $.fn.ieshadow = function() {
        this.each(function() {
            var f = document.createDocumentFragment();
            _.each(['ds_l','ds_r','ds_t','ds_b','ds_tl','ds_tr','ds_bl','ds_br'], function(item) {
                f.appendChild($('<div class="ds '+item+'"></div>')[0]);
            }, this);
            $(this).addClass('gui-ie-dropshadow').append(f);
        });
        return this;
    };
    
    window.$ = $;





    // ==========================
    // = jQuery Ajax transports =
    // ==========================
    $.ajaxTransport("multipart", function( options, originalOptions, jqXHR ) {
        /* Will only be called for "multipart" requests */
        return {
            send: function(headers, completeCallback) {
            
                // Build a completely new body to post
                var jsonstr = originalOptions.data; // its already a json string
                var formdata = new FormData();            
            
                // Add _json
                try {
                    var blob = new Blob(jsonstr, {type: "application/json"});
                    formdata.append('_json', blob);
                } catch (e) {
                    formdata.append('_json', jsonstr);
                }
            
                // Add files
                _.each(originalOptions.files || [], function(f) {
                    var name = f.name,
                        file = f.file;
                    formdata.append(f.name, f.file);
                });

                // Add some ajax settings
                _.extend(options, {
                    cache: false,                
                    dataType: 'json',
                    data: formdata,
                    contentType: false,
                    processData: false
                });
            
                // Send request
                $.ajax(options);            
            },
            abort: function() {
            
            }
        };
    
    });




    // =====================================
    // = Backbone and Underscore extension =
    // =====================================
    /* 
    This adds support for mixins and a method called initcls 
    which is run once when a Function is created */
    (function(Backbone) {
    
        // A simple class supporting events and initialize
        Backbone.Class = function() {
            if(this.initialize)
                this.initialize.apply(this, arguments);
        };
        Backbone.Class.extend = Backbone.Model.extend;
        _.extend(Backbone.Class, Backbone.Events);
    

        Backbone.Collection.prototype.move = function(model, toIndex, options) {
            options = options || {};
            var fromIndex = this.indexOf(model);
            if(fromIndex == -1) {
                throw new Error("Can't move a model that's not in the collection");
            }
            if(fromIndex !== toIndex) {
                this.models.splice(toIndex, 0, this.models.splice(fromIndex, 1)[0]);
                if(!options.silent)
                    this.trigger('move', {model: model, toIndex: toIndex, fromIndex: fromIndex});
            }
        };
    
        var backboneset = Backbone.Model.prototype.set;
        Backbone.Model.prototype.set = function(key, value, options) {
            var attrs, attr, val;
            if(_.isObject(key) || key === null) {
                attrs = key;
                options = value;
            } else {
                attrs = {};
                attrs[key] = value;
            }            
            _.each(_.clone(attrs), function(value, key) {
                
                 var setter = 'set_' + key;                 
                 if(typeof this[setter] === 'function') {
                     this[setter](value, attrs, options, key); // var v = 
                     // if(v !== undefined)
                     //     attrs[key] = v;
                 }
                 else if(this.traits && this.traits[key]) {
                     attrs[key] = this.traits[key].parse(value);
                 }
            }, this);
            return backboneset.call(this, attrs, options);
        };

        Backbone.Model.prototype.sync = function(method, model, options) {
            if (this.toRemoteJSON && (method == 'update' || method == 'create')) {
                var newModel = this.clone();
                newModel.clear({ silent: true });
                newModel.set(this.toRemoteJSON(), { silent: true });
                return Backbone.sync.call(newModel, method, newModel, options);
            } else {
                return Backbone.sync.call(this, method, this, options);
            }
        };
        

    
        _.each(["Model", "Collection", "View", "Router"], function(klass) {
            var extend = Backbone[klass].extend;

            Backbone[klass].extend = function(protoProps, classProps){
                /**
                this = the Function object we're exteding
                child = the new Function object. I run initcls on child
                        just after it has been created.
                protoProps = stuff to extend `this` with. Could contain an initcls.
                protoProps.mixins = list of Objects (or Functions) to extend from
                                    also. These might contain initcls.
                */
                var child = this, // were starting of alike..
                    inits = [],
                    mixins = protoProps.mixins || [];

                _.each(mixins.slice(), function(mixin) {
                    if(mixin.beforeinitcls) // collect initcls functions to run later
                        mixin.beforeinitcls.call(child);
                });
                if(protoProps.beforeinitcls) 
                    protoProps.beforeinitcls.call(child);
                
                if(protoProps.initcls)
                    inits.push(protoProps.initcls);

                // add all keys from all mixins if not already declared
                // in protoProps. 
                _.each(mixins, function(mixin) {
                    _.defaults(protoProps, mixin);
                    if(mixin.initcls) // collect initcls functions to run later
                        inits.push(mixin.initcls);
                });


                if(klass == 'View') {
                    // protoProps.constructor = function(options) {
                    //     Backbone.View.call(this, options);
                    //     console.log('Fooooo!')
                    // 
                    // }
                    protoProps.delegateEvents = function(events) {
                        Backbone.View.prototype.delegateEvents.call(this, events);
                        this._delegateHotkeys();
                    };                
                }

                // Then exend as usual
                child = extend.call(child, protoProps, classProps);                    
            
                // Call initcls
                for(var i=0, l=inits.length; i<l; i++)
                    inits[i].call(child);
            
                return child;            
            };
        });
    
        /*
        hotkeys: {
            "keydown shift+a .sune": "myHandler"
        }
        */
        var delegateHotkeySplitter = /^(\S+)\s+(\S+)\s*(.*)$/;    
        Backbone.View.prototype._delegateHotkeys = function() {    
            if(!this.hotkeys) return;
        
            var events = this.hotkeys;
            for (var key in events) {
                var method = events[key];
                if (!_.isFunction(method)) method = this[events[key]];
                if (!method) throw new Error('Method "' + events[key] + '" does not exist');
                var match = key.match(delegateHotkeySplitter);
                var eventName = match[1], 
                    hotkey = match[2],
                    selector = match[3];
                
                method = _.bind(method, this);
                eventName += '.delegateEvents' + this.cid;
    
                this.$el.on(eventName, selector || null, hotkey, method);
            }      
        };
    })(Backbone);




    _.isinstance = function(obj, klass) {
        try {
            return _.indexOf(obj.mixins || [], klass) !== -1 || obj instanceof klass;
        } catch(e) {
            return false;
        }
    };
    _.isNumeric = function(n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    };
    _.listToDict = function(list, key) {
        return _.object(_.map(list, function(f) {
            return [f[key], f];
        }));
    };
    _.pop = function(obj, key) {
        var v = obj[key];
        delete obj[key];
        return v;
    };
    // 
    /*
    Fill in a given object with default properties.
    _.defs(options, {
        defaultvalue1: 'a',
        defaultvalue2: 'b'
    });
    */
    _.defs = function(obj, defaults) {
        if(!obj) 
            return _.clone(defaults);
        for(var key in defaults)
            if(defaults.hasOwnProperty(key) && obj[key] === undefined) 
                obj[key] = defaults[key];
        return obj;
    };
    _.arrayify = function(v) {
        if(!_.isArray(v)) 
            v = [v];
        return v;
    };


    /* 
    _.template2()
    -----------
    A modified copy of Underscore.template (v1.3.3), adding the `settings` 
    variable to the rendering scope, along with the usual 'obj' and '_'.
    */
    (function(_) {
        var noMatch = /.^/;

        var settings = {
          evaluate    : /\[\[([\s\S]+?)\]\]/g,
          interpolate : /\$\{([\s\S]+?)\}/g,
          escape      : /\$\{-([\s\S]+?)\}/g      
        };

        // Certain characters need to be escaped so that they can be put into a
        // string literal.
        var escapes = {
          '\\': '\\',
          "'": "'",
          'r': '\r',
          'n': '\n',
          't': '\t',
          'u2028': '\u2028',
          'u2029': '\u2029'
        };

        for (var p in escapes) escapes[escapes[p]] = p;
        var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;
        var unescaper = /\\(\\|'|r|n|t|u2028|u2029)/g;

        // Within an interpolation, evaluation, or escaping, remove HTML escaping
        // that had been previously added.
        var unescape = function(code) {
          return code.replace(unescaper, function(match, escape) {
            return escapes[escape];
          });
        };


        _.template2 = function(text, helpers) {
          // Compile the template source, taking care to escape characters that
          // cannot be included in a string literal and then unescape them in code
          // blocks.
      
          // Don't trust ordering of keys in `helpers` object
          helpers = _.map(helpers || {}, function(v,k) { return {k:k,v:v}; });
          var keys = _.map(helpers, function(v) { return v.k; });
          var helpersArgs = _.map(helpers, function(v) { return v.v; });
      
          var source = "__p+='" + text
            .replace(escaper, function(match) {
              return '\\' + escapes[match];
            })
            .replace(settings.escape || noMatch, function(match, code) {
              return "'+\n_.escape(" + unescape(code) + ")+\n'";
            })
            .replace(settings.interpolate || noMatch, function(match, code) {
              return "'+\n(" + unescape(code) + ")+\n'";
            })
            .replace(settings.evaluate || noMatch, function(match, code) {
              return "';\n" + unescape(code) + "\n;__p+='";
            }) + "';\n";

          // If a variable is not specified, place data values in local scope.
          if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

          source = "var __p='';" +
            "var print=function(){__p+=Array.prototype.join.call(arguments, '')};\n" +
            source + "return __p;\n";

          // build argument list
          var args = [settings.variable || 'obj', '_', 'settings'].concat(keys);
          var render = new Function(args, source);
      
          var template = function(data) {
            var args = [data, _, settings].concat(helpersArgs);
            return render.apply(this, args);
          };

          // Provide the compiled function source as a convenience for build time
          // precompilation.
          template.source = 'function(' + (settings.variable || 'obj') + '){\n' +
            source + '}';

          return template;
        };


    })(_);




    // ==========
    // = Mixins =
    // ==========
    /* A mixin for inheriting events declared on parent view classes. */
    gui.ChildView = {
        beforeinitcls: function() {
            var parentMixins = this.__super__.mixins;        
            this.prototype.mixins = _.extend([], parentMixins, this.prototype.mixins);        
        },
        initcls: function() {
            var parentEvents = this.__super__.events,
                parentHotkeys = this.__super__.hotkeys;
            this.prototype.events = _.extend({}, parentEvents, this.prototype.events);
            this.prototype.hotkeys = _.extend({}, parentHotkeys, this.prototype.hotkeys);        
        }
    };
    
    /* merge the "defaults" dict of the super class */
    gui.ChildModel = {
        initcls: function() {
            var parentDefaults = this.__super__.defaults || {};
            this.prototype.defaults = _.extend({}, parentDefaults, this.prototype.defaults);
        }
    };
    
    gui.Traits = {
        toRemoteJSON: function() {
            return _.object(_.map(this.traits, function(trait,k) {
                return [k, trait.toJSON(this.attributes[k])]
            }, this))
        }
    }
    



    // ===============
    // = Drag / drop =
    // ===============
    gui.Drag = gui.Observable.extend({
    
        initialize: function(conf) {
            // Pre-bind some handlers
            this._onbodymousemove = $.proxy(this.onBodyMouseMove, this);
            this._onbodymouseup = $.proxy(this.onBodyMouseUp, this);
            this._onbodymouseover = $.proxy(this.onBodyMouseOver, this);
            this._onbodymouseout = $.proxy(this.onBodyMouseOut, this);
            this._body = $(document);
            this.dragging = false;
        },
        start: function(conf) {        
            /* Optional: conf.distance, drag at least `distance` pixels to initate a drag 
            Todo: Finish docs
            */
            this._body.bind('mousemove', this._onbodymousemove);
            this._body.bind('mouseover', this._onbodymouseover);        
            this._body.bind('mouseout', this._onbodymouseout);              
            this._body.bind('mouseup', this._onbodymouseup);
        
            this.prefix = conf.prefix || '';

            // offset relative to first positioned parent (margins, borders, ..)
            var left = 0,
                top = 0,
                selector = $(conf.ev.target).parentsUntil('*:floating').andSelf();
            selector.each(function() {
                var pos = $(this).position();
                left += pos.left || 0;
                top += pos.top || 0;
            });

            // FF: ev.clientX === undefined, #8523
            var ev = conf.ev;
            var offsetX = (ev.offsetX || ev.clientX - $(ev.target).offset().left);
            var offsetY = (ev.offsetY || ev.clientY - $(ev.target).offset().top);        

            // Update the drag metadata object
            conf = _.extend(conf, {
                clientX: conf.ev.clientX, 
                clientY: conf.ev.clientY,
                offsetX: offsetX + left,
                offsetY: offsetY + top
            });
            this.conf = conf;

            this.dragging = true;

            // no text selection while dragging        
            conf.ev.preventDefault();        
        },
        onBodyMouseMove: function(e) {
            // Detect enough drag movement before starting the drag

            // var distance = this.conf.distance || 0;
            // var startDrag = !this.conf.distance || (this.dragging ? false : (Math.abs(e.clientX - this._init.clientX) > distance || Math.abs(e.clientY - this._init.y) > distance))
        
            var conf = this.conf,
                el = $(this.conf.el);
            if(el[0]) {
            
                el[0].style.left = (e.pageX - this.conf.offsetX) + 'px';
                el[0].style.top = (e.pageY - this.conf.offsetY) + 'px';        
            }
            else if(conf.ondrag) {
                conf.ondrag(e, conf);
            }
        
        },
        onBodyMouseOver: function(e) {
            if(this.dragging && this.prefix) {
                var data = {conf: this.conf, drag: this};
                $(e.target).trigger(this.prefix+'mouseover', [data]);  
            }
        },
        onBodyMouseOut: function(e) {
            if(this.dragging && this.prefix) {
                var data = {conf: this.conf, drag: this};
                $(e.target).trigger(this.prefix+'mouseout', [data]);
            }
        },    
        onBodyMouseUp: function(e) {
            // Detach drag-related listeners
            this._body.unbind('mousemove', this._onbodymousemove);
            this._body.unbind('mouseup', this._onbodymouseup);
        
            if(this.dragging) {
                e.drag = this;
                e.pageX = e.clientX + this.scrollLeft;
                e.pageY = e.clientY + this.scrollTop;
                e.conf = this.conf;
                if(this.conf.onend)
                    this.conf.onend(e, this.conf);
                this.dragging = false;
                // Fire `[prefix]drop` and `drop` events
                var data = {conf: this.conf, drag: this};
                $(e.target).trigger(this.prefix+'drop', [data]);
                $(e.target).trigger('drop', [data]);       
                this.trigger('dragend', data);
            }
            this.conf = {};
            this.el = undefined;        
        }
    });
    gui.drag = new gui.Drag();




    $.fn.getPreText = function (trim) {
        var ce = this.clone();
        if($.browser.webkit || $.browser.chrome)
            ce.find("div").replaceWith(function() { return "\n" + this.innerHTML; });
        else if($.browser.msie)
            ce.find("p").replaceWith(function() { return "\n" + this.innerHTML; });        
        else {
            ce.find("br").replaceWith("\n");
        }

        if(trim) {
            var lines = ce.text().split('\n');
            lines = _.compact(_.map(lines, function(line) {
                return $.trim(line);
            }));
            return lines.join('\n');
        }
        else
            return ce.text();
    
    };

    gui.makePreText = function(plaintext) {
        var html,
            plaintext = plaintext.trim();
        
        if($.browser.webkit || $.browser.chrome) {
            // Wrap each textline inside <div>line</div>
            html = plaintext.split('\n').map(function(item) { return '<div>'+(item || '&nbsp;')+'</div>'; }).join('');
        }
        else if($.browser.msie) {
            html = plaintext.split('\n').map(function(item) { return '<p>'+item+'</p>'; }).join('');
        }
        else {
            html = plaintext.replace('/\n/g', '<br>');
        }
        return html
        
    }

    $.fn.getOffsetPadding = function() {
        var el = this[0],
            x = 0,
            y = 0;
        do {
            el = $(el);
            x += el.outerWidth(true) - el.width();
            y += el.outerHeight(true) - el.height();
        } 
        while(el = el[0].offsetParent);
        return {x: x, y: y};
    };



    $.fn.reverse = [].reverse;



    gui.format = new function() {
        this.filesize = function(bytes) {
            var i = -1;
            var units = [' KB', ' MB', ' GB'];
            do {
                bytes = bytes / 1024;
                i++;
            } while (bytes > 1024);
            return Math.max(bytes, 0.1).toFixed(1) + units[i];
        };  
    };

    gui.isArrowOnlyKey = function(e) {
        if(e.shiftKey || e.altKey || e.metaKey)
            return false;
        return gui.isArrowKey(e)
    };
    gui.isArrowKey = function(e) {
        var keys = gui.keys,
            key = e.which,
            arrows = [keys.LEFT, keys.RIGHT, keys.UP, keys.DOWN];    
        return _.indexOf(arrows, e.which) !== -1;
    };



    gui.parseQueryString = function(url) {
        var vars = {};
        url = url || document.location.href;
        url.replace(
            new RegExp("([^?=&]+)(=([^&]*))?", "g"),
            function($0, $1, $2, $3) { vars[$1] = $3; });
        return vars;
    };

    gui.randhex = function(len) {
        var out = [],
            chars = "abcdef0123456789";
            len = len || 32;
        for(var i=0; i<len; i++)
            out.push(chars.charAt(Math.floor(Math.random() * chars.length)));
        return out.join('');
    };

    gui.pasteHtmlAtCaret = function(html) {
        var sel, range;
        if(window.getSelection) {
            sel = window.getSelection();
            if(sel.getRangeAt && sel.rangeCount) {
                range = sel.getRangeAt(0);
                range.deleteContents();

                var el = document.createElement("div");
                el.innerHTML = html;
                var frag = document.createDocumentFragment(), node, lastNode;
                while((node = el.firstChild)) {
                    lastNode = frag.appendChild(node);
                }
                range.insertNode(frag);

                // Preserve the selection
                if(lastNode) {
                    range = range.cloneRange();
                    range.setStartAfter(lastNode);
                    range.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(range);
                }
            }
        } 
        else if(document.selection && document.selection.type != "Control") {
            // ie<9
            document.selection.createRange().pasteHTML(html);
        }
    };


    gui.addcss = function(stylesheets, win) {
        if(!_.isArray(stylesheets)) stylesheets = [stylesheets];
        win = win || window;
        var head = $(win.document).find('head');
    
        _.each(stylesheets, function(url) {
            if(!head.find('link[href="'+url+'"]').length) {
                if (win.document.createStyleSheet) // IE
                    win.document.createStyleSheet(url);
                else 
                    $('<link rel="stylesheet" type="text/css"></link>').attr('href', url).appendTo(head);
            }
        });
    };
    
    gui.preventDefault = function(e) {
        e.preventDefault();
    };

    gui.mouseOffset = function(e, el) { 
        var offset = $(el || e.target.offsetParent).offset(); 
        return {
            left: e.pageX - offset.left,
            top: e.pageY - offset.top
        };
    };


    return gui;
});