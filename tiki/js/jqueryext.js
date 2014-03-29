define([
    'jquery'
], function($) {
    'use strict';

    // ==============
    // = IE helpers =
    // ==============
    $.fn.disableSelection = function() { 
        return this.each(function() { 
            // this.onselectstart = function() { return false; }; 
            this.unselectable = "on"; 
            $(this).addClass('disableSelection'); 
        }); 
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



    // =====================
    // = Browser detection =
    // =====================
    /* Put back $.browser which was dropped in jQuery 1.9 */
    $.uaMatch = function( ua ) {
     ua = ua.toLowerCase();
    
     var match = /(chrome)[ \/]([\w.]+)/.exec( ua ) ||
         /(webkit)[ \/]([\w.]+)/.exec( ua ) ||
         /(opera)(?:.*version|)[ \/]([\w.]+)/.exec( ua ) ||
         /(msie) ([\w.]+)/.exec( ua ) ||
         ua.indexOf("compatible") < 0 && /(mozilla)(?:.*? rv:([\w.]+)|)/.exec( ua ) ||
         [];
    
     return {
         browser: match[ 1 ] || "",
         version: match[ 2 ] || "0"
     };
    };

    // Don't clobber any existing $.browser in case it's different
    if ( !$.browser ) {
        var matched = $.uaMatch( navigator.userAgent );
        var browser = {};

        if ( matched.browser ) {
            browser[ matched.browser ] = true;
            browser.version = matched.version;
        }

        // Chrome is Webkit, but Webkit is also Safari.
        if ( browser.chrome ) {
            browser.webkit = true;
        } else if ( browser.webkit ) {
            browser.safari = true;
        }

        $.browser = browser;
    }
    $.browser.ltie8 = $.browser.msie && parseInt($.browser.version, 10) < 8;
    $.browser.ltie9 = $.browser.msie && parseInt($.browser.version, 10) < 9;
    $.browser.ltie10 = $.browser.msie && parseInt($.browser.version, 10) < 10;





    /* Normalize mouse wheel through a hand-crafted "wheel" event */
    (function () {
        var oldEvents = ['mousewheel', 'DomMouseScroll', 'MozMousePixelScroll'],
            allEvents =  ['wheel'].concat(oldEvents),
            hasWheel = "onwheel" in document.createElement("div"),
            bindEvents = hasWheel ? ['wheel'] : oldEvents;

        function handler(e) {
            var orgEv = e || window.event;
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
        
    })();





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

    $.fn.contains = function(childEl) {
        return $(childEl).containedBy(this);
    };
    $.fn.screen = function() { 
        var pos = this.offset(),
            body = this[0].ownerDocument.body,
            top = pos.top - body.scrollTop,
            left = pos.left - body.scrollLeft;
        return {left: left, top: top};
    };
    $.fn.ieunselectable = function() { 
        this.each(function() { 
            if($.browser.ltie10)
                $(this).find('*').each(function() { this.unselectable = "on"; });
        });
        return this;
    };
    $.fn.blink = function(callback) {
        this.each(function() {
            var count = 0,
                el = this;
            $(el).toggleClass('selected');
            var timer = window.setInterval(function() {
                $(el).toggleClass('selected', (count+1) % 2 === 0);
                count++;
                if(count == 3) {
                    window.clearInterval(timer);
                    $(el).toggleClass('selected', true)
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
            var range;
            if(document.selection) { 
                range = document.body.createTextRange();
                range.moveToElementText(this);
                range.collapse(false);
                range.select();
            }  
            else {  
                range = document.createRange();
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


    var get_center = function(width, height) {        
        var winHeight = $(window).height();
        var winWidth = $(window).width();        
        var top = ((winHeight - height) / 2) + $(window).scrollTop();
        var left = ((winWidth - width) / 2) + $(window).scrollLeft();
        return [left, top];
    };
    $.fn.center = function(args) {
        args = $.extend({
            // defaults
            top: null  // center horizontally, manually specify top
        }, args || {});

        this.each(function() {
            var self = $(this),
                coords = get_center(self.outerWidth(), self.outerHeight()),
                left = coords[0], top = coords[1];
        
            if(args.top !== null) {
                top = args.top;
            }
            self.css({top: top, left: left});
       });
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
        $.each(attrs || {}, function(key, val) {
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
            $(this).on('keydown', null, 'tab', tabChainTabKeyDown); 
        });        
    };

    $.fn.reverse = [].reverse;



    // ==============================
    // = jQuery selector extensions =
    // ==============================
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
    
    // Mark a function for use in filtering
    var markFunction = function(fn) {
        fn.sizzleFilter = true;
        return fn;
    };    
    $.extend($.expr[':'], {
        selectable: function(el) {
            // visible and not disabled
            return $(el).is(':visible') && !$(el).is('.tiki-disabled');
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
            return el.tabIndex !== -1 && $(el).closest('.tiki-disabled').length === 0;
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




});


