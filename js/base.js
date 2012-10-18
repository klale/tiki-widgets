define([
    'jquery',
    'underscore',
    'backbone'
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
    BACKSPACE: 8
};


$(function() {
    $(document.body).bind('keydown', function(e) {
        gui._keyDownEvent = e;
    });
    $(document.body).bind('keyup', function(e) {
        gui._keyDownEvent = null;
    })    
    /*
    $("li:has(ul.popUpMenu)").focusin(function(e) {
        $(this).children().fadeIn('slow');
    });
    
    $('body').focusin(function(e) {
        if (!$(e.target).parent().is('ul.popUpMenu li')) {
          $('ul.popUpMenu').fadeOut('slow');
        }
      });
    */
    var prevFocused, 
        justLostFocus;
    $(document.body).bind('focusout', function(e) {
        // something that had focus, lost it, but we don't now to what yet
        // console.log('FOCUS lost', e.target)
        justLostFocus = e.target;
        // console.log('TARGET (focusout): ', e.target, ', hepp: ', document.activeElement);
    });
    $(document.body).bind('focusin', function(e) {
        newFocused = e.target;
        // Now the new thing has received the focus, and we can compare the two
        
        // a focusleave should be triggered starting at justLostFocus, 
        // continuing up to the common ancestor shared with newFocus. 
        // (or one level above the common ancestor to be correct)
        // Maybe add: any element with tabindex=0 along the way will have
        // a focusin class toggled accoringly
        if(!justLostFocus)
            return // first ever focus, thus no focusleave

        // var commonAncestor; 
        // andSelf() reverses parents for some reason, restore order 
        // with another reverse()
        // console.log('focusleave: ', justLostFocus);        
        // $(justLostFocus).triggerHandler('focusleave');
        $(justLostFocus).parents().andSelf().reverse().each(function(i, parent) {
            // if($(newFocused).attr('name') == 'start_at') {
            //     debugger;
            // }
            if($(parent).contains(newFocused) || parent === newFocused) {
                // we have traversed up to a common ancestor
                // commonAncestor = parent;
                // console.log('COMMON ancestor', parent)
                return false; // break
            }
            else {
                // fire a non-bubbling focusleave
                // console.log('focusleave: ', parent, 'newFocused: ', newFocused)
                // $(parent).triggerHandler('focusleave');
                $(parent).trigger('focusleave');                
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
// Todo: don't fiddle with the global jquery
jQuery.fn.jget = function() {
    if(this.length > 0) {
        return $(this);
    }
};
jQuery.fn.contains = function(childEl) {
    if(this.length > 0) {
        var parentEl = $(this)[0];
        childEl = $(childEl)[0];
        return $.contains(parentEl, childEl);
    }
    return null;
};
jQuery.fn.disableSelection = function() { 
    return this.each(function() { 
        // this.onselectstart = function() { return false; }; 
        this.unselectable = "on"; 
        $(this).addClass('disableSelection'); 
    }); 
};
jQuery.fn.screen = function() { 
    var pos = this.offset(),
        body = this[0].ownerDocument.body,
        top = pos.top - body.scrollTop,
        left = pos.left - body.scrollLeft;
    return {left: left, top: top};
};
jQuery.fn.iefocus = function() {
    this.each(function() {
        $(this).bind('focus', function(e) { $(e.target).addClass('focus')});
        $(this).bind('blur', function(e) { $(e.target).removeClass('focus')});
        this.hideFocus = true;
    });
};
jQuery.fn.blink = function(callback) {
    this.each(function() {
        var count = 0,
            el = this;
        $(el).toggleClass('selected');
        var timer = setInterval(function() {
            $(el).toggleClass('selected');
            count++;
            if(count == 2) {
                clearInterval(timer);
                callback();
            }
        }, 60);        
    });
};
jQuery.fn.selectAll = function() {
    this.each(function() {
        var range = document.createRange();
        range.selectNodeContents(this);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    });
};
jQuery.fn.moveCursorToEnd = function(el) {
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
jQuery.fn.insertAt = function(i, el) {
    this.each(function() {
        if(i === 0)
            $(this).prepend(el);
        else if(i === -1)
            $(this).append(el);
        else
            $(this).children(':nth-child('+i+')').after(el);
    });
};
jQuery.fn.containedBy = function(parent) {
    var isContainedBy = false;
    var parent = $(parent)[0];
    
    this.parents().each(function(i, par) {
        if(par === parent) {
            isContainedBy = true
            return false; // break
        }
    });
    return isContainedBy;
};


jQuery.browser.ltie9 = jQuery.browser.msie && parseInt(jQuery.browser.version) < 9;
jQuery.browser.ltie10 = jQuery.browser.msie && parseInt(jQuery.browser.version) < 10;

// ==============================
// = jQuery selector extensions =
// ==============================
jQuery.extend($.expr[':'], {
    selectable: function(el) {
        // visible and not disabled
        return $(el).is(':visible') && !$(el).is('.disabled');
    }, 
    floating: function(el) {
        // absolute or fixed positioned
        var pos = el.style.position.toLowerCase();
        var pos2 = $(el).css('position');
        return  pos2 == 'absolute' || pos2 == 'fixed';            
    },
    containsre: function(el, index, meta, stack) {
        var re = meta[3].replace(/^\/+|\/+$/, '').split('/'); // strip slashes, then split
        return new RegExp(re[0], re[1]).test($(el).text());
    },
    focusable: function(el) {
        return el.tabIndex !== -1;
    }
});



// =====================================
// = Backbone and Underscore extension =
// =====================================
/* 
This adds support for mixins and a method called initcls 
which is run once when a Function is created */
(function(Backbone) {
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
            if(protoProps.initcls)
                inits.push(protoProps.initcls)
                        
            _.each(protoProps.mixins, function(mixin, name) {
                child = extend.call(child, mixin); // ..then create a copy of `child`, extend and return it
                if(mixin.initcls) // collect initcls functions to run later
                    inits.push(mixin.initcls);
            });
            child = extend.call(child, protoProps, classProps);
            
            // Restore Backbone's __super__, which currently equals the last applied mixin
            // from the iteration above
            child.__super__ = this;
            
            // Call initcls
            for(var i=0, l=inits.length; i<l; i++)
                inits[i].call(child);
            return child;
        }
    });
})(Backbone);



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
      var helpers = _.map(helpers, function(v,k) { return {k:k,v:v}});
      var keys = _.map(helpers, function(v) { return v.k});
      var helpersArgs = _.map(helpers, function(v) { return v.v});
      
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
    initcls: function() {
        var parentEvents = this.__super__.prototype.events;        
        this.prototype.events = _.extend({}, parentEvents, this.prototype.events);
    }
};



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
        
        // if(startDrag || this.dragging) {
        //     if(startDrag) {
        //         this.scrollLeft = $(window).scrollLeft()
        //         this.scrollTop = $(window).scrollTop()
        //         // `conf.ev` is the mousedown event
        //         var e = this.conf.ev;
        //     }
        //     // Add some extra drag-related attributes to the `mousemove` event
        //     e.pageX = e.clientX + this.scrollLeft;
        //     e.pageY = e.clientY + this.scrollTop;
        // 
        //     console.log('aa:', e.clientX + this.scrollLeft, e.pageX)
        //     e.conf = this.conf;
        //     if(startDrag) {
        //         var conf = this.conf;
        //         if(conf.onstart)
        //             conf.onstart(e, this.conf);
        //         this.dragging = true;
        //         
        //         if(this.conf.el) {
        //             // move the proxy el
        //             console.log('MOVE!', e.clientX, this._init.offsetX)
        //             this.conf.el.css({
        //                 left: e.pageX - this._init.offsetX, 
        //                 top: e.pageY - this._init.offsetY
        //             });
        //             this.conf.el.show();                
        //         }  
        //     } else if(this.dragging) {
        //         if(this.conf.el) {
        //             // move the proxy el
        //             this.conf.el.css({
        //                 left: e.pageX - this._init.offsetX, 
        //                 top: e.pageY - this._init.offsetY
        //             });
        //         }
        //         if(this.conf.ondrag)
        //             this.conf.ondrag(e, this.conf);
        //     }            
        // }
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






// ==============
// = Scrollable =
// ==============
gui.Scrollable = gui.Observable.extend({
    initialize: function(conf) {
        this.container = $(conf.container);
        this.content = $(conf.content);        
        this.scrollbar = $('<div class="miniscrollbar"></div>').appendTo(this.container);
        this.vhandle = $('<div class="vhandle"></div>').appendTo(this.scrollbar);
        
        this.content.mousewheel($.proxy(this.onMouseWheel, this));
        this.refresh();
    },
    isOverflowing: function() {
        return this._containerHeight < this._contentHeight;
    },
    getStripOfWhite: function() {
        var scrolltop = this.getScrollTop();
        var white = ((scrolltop*-1) + this._containerHeight) - this._contentHeight;
        return Math.max(0, white);
    },
    refresh: function() {
        if(!this.content || !this.content.outerHeight()) {
            return
        }
        // ie7 must cache container height here (neg. margin impacts when 
        // scrolling to bottom)
        this._containerHeight = this.container.height(); 
        this._contentHeight = this.content.outerHeight()
        
        if(this.isOverflowing()) {
            this.scrollbar.show();
            var h = this._containerHeight / this._contentHeight;
            this.vhandle.css('height', h*100 + '%');
            this.vhandle_height = h            

            // if a strip of white is showing in the bottom,
            // do a scrollToBottom.            
            if(this.getStripOfWhite())
                this.scrollToBottom();
        }
        else {
            this.scrollbar.hide();
        }
    },
    scrollToBottom:function() {
        var diff = this._contentHeight - this._containerHeight;
        this.scrollTo(diff*-1);
    },    
    getScrollTop: function() {
        return parseInt(this.content.css('margin-top')) || 0;
    },
    scrollTo: function(top) {
        // top is less than or equal to 0
        if(this.getScrollTop() == top) {
            return
        }        
        // Respect boundaries                
        if(this.content) {
            top = Math.min(top, 0);
            if(this._contentHeight) {
                top = Math.max(top, (this._containerHeight - this._contentHeight))
            }
            this.content.css('margin-top', top + 'px');        
            this.vhandle.css('top', (top*-1)*this.vhandle_height + 'px');
            // Fire scroll event
            this.container.trigger('scroll', top);
        }
    },
    onMouseWheel: function(e, delta) {
        if(this.isOverflowing()) {
            this.scrollTo(this.getScrollTop() + delta*8)            
        }   
        e.preventDefault();
    }
});
jQuery.fn.scrollable = function() {
    $(this).each(function() {
        var a = new gui.Scrollable({
            container: $(this),
            content: $(this).children()[0]
        });
    })
};

jQuery.fn.getPreText = function () {
    var ce = $("<pre />").html(this.html());
    if($.browser.webkit)
        ce.find("div").replaceWith(function() { return "\n" + this.innerHTML; });
    if($.browser.msie)
        ce.find("p").replaceWith(function() { return this.innerHTML + "<br>"; });
    if($.browser.mozilla || $.browser.opera || $.browser.msie)
        ce.find("br").replaceWith("\n");
    return ce.text();
};
jQuery.fn.reverse = [].reverse;


// ==========
// = Colors =
// ==========

gui.color = new function() {

    function rgbToHsl(r, g, b){
        r /= 255, g /= 255, b /= 255;
        var max = Math.max(r, g, b), min = Math.min(r, g, b);
        var h, s, l = (max + min) / 2;

        if(max == min) {
            h = s = 0; // achromatic
        } else {
            var d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch(max){
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return [h, s, l];
    }

    function hslToRgb(h, s, l) {
        var r, g, b;
        if(s == 0) {
            r = g = b = l; // achromatic
        } else {
            function hue2rgb(p, q, t) {
                if(t < 0) t += 1;
                if(t > 1) t -= 1;
                if(t < 1/6) return p + (q - p) * 6 * t;
                if(t < 1/2) return q;
                if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            }
            var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            var p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        return [r * 255, g * 255, b * 255];
    }

    function lpad(str, padString, length) {
        while (str.length < length)
            str = padString + str;
        return str;
    }
    
    function hex(num) {
        return lpad(parseInt(num).toString(16), '0', 2);
    }
    
    this.brightness = function(color, amount) {
        var r = parseInt(color.substr(1, 2), 16);
        var g = parseInt(color.substr(3, 2), 16);
        var b = parseInt(color.substr(5, 2), 16);
        hsl = rgbToHsl(r, g, b);
        // ensure lightness+amount is between 0 and 1 
        l = Math.max(Math.min(hsl[2] + amount, 1), 0)

        rgb = hslToRgb(hsl[0], hsl[1], l);
        
        return '#' + hex(rgb[0]) + hex(rgb[1]) + hex(rgb[2]);
    };
    
    
};


gui.stylesheet = new function() {
    
    this.addClass = function(selector, style) {
        if(!document.styleSheets)
            return;
        if(document.getElementsByTagName("head").length == 0) 
            return;
 
        var stylesheet;
        var mediaType;
        if(document.styleSheets.length > 0) {
            for(i = 0; i < document.styleSheets.length; i++) {
                if(document.styleSheets[i].disabled) {
                    continue;
                }
                var media = document.styleSheets[i].media;
                mediaType = typeof media;
 
                if(mediaType == "string") {
                    if (media == "" || (media.indexOf("screen") != -1))
                        styleSheet = document.styleSheets[i];
                } else if (mediaType == "object") {
                    if (media.mediaText == "" || (media.mediaText.indexOf("screen") != -1)) 
                        styleSheet = document.styleSheets[i];
                }
 
                if(typeof styleSheet != "undefined")
                    break;
            }
        }
        if(typeof styleSheet == "undefined") {
            var styleSheetElement = document.createElement("style");
            styleSheetElement.type = "text/css";
 
            document.getElementsByTagName("head")[0].appendChild(styleSheetElement);
 
            for (i = 0; i < document.styleSheets.length; i++) {
                if (document.styleSheets[i].disabled)
                    continue;
                styleSheet = document.styleSheets[i];
            }
            var media = styleSheet.media;
            mediaType = typeof media;
        }
 
        if (mediaType == "string") {
            for (i = 0; i < styleSheet.rules.length; i++) {
                if (styleSheet.rules[i].selectorText.toLowerCase() == selector.toLowerCase()) {
                    styleSheet.rules[i].style.cssText = style;
                    return;
                }
            }
 
            styleSheet.addRule(selector, style);
        } else if (mediaType == "object") {
            for (i = 0; i < styleSheet.cssRules.length; i++) {
                if (styleSheet.cssRules[i].selectorText.toLowerCase() == selector.toLowerCase()) {
                    styleSheet.cssRules[i].style.cssText = style;
                    return;
                }
            }
 
            styleSheet.insertRule(selector + "{" + style + "}", 0);
        }
    };    
};


return gui;
});