define([
    'jquery',
    'underscore',
    'backbone',
    'jquery-hotkeys'
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





// ==================
// = IE "polyfills" =
// ==================
String.trim = String.trim || _.trim;
    

    
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
    var newFocused,
        prevFocused, 
        justLostFocus;
    $(document.body).bind('focusout', function(e) {
        // something that had focus, lost it, but we don't now to what yet


        justLostFocus = e.target;
        
        // // andSelf() reverses parents for some reason, restore order 
        // // with another reverse()
        // $(justLostFocus).parents().andSelf().reverse().each(function(i, parent) {
        //     if(newFocused && ($(parent).contains(newFocused) || parent === newFocused)) {
        //         // we have traversed up to a common ancestor
        //         return false; // break
        //     }
        //     else {
        //         // fire a non-bubbling focusleave
        //         // $(parent).triggerHandler('focusleave');
        //         $(parent).trigger('focusleave', {newFocused: newFocused});                
        //     }
        // });        
        
    });
    $(document.body).bind('focusin', function(e) {
        // console.log('FOCUS IN: ', e.target)
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
                // justLostFocus = newFocused;
                // console.log('im here2')                
                return false; // break
            }
            else {
                // fire a non-bubbling focusleave
                // console.log('focusleave: ', parent, 'newFocused: ', newFocused)
                // $(parent).triggerHandler('focusleave');
                $(parent).trigger('focusleave', {newFocused: newFocused, justLostFocus: justLostFocus});                
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
                e.stopPropagation();
            });
            if($.browser.ltie8) {
                this.hideFocus = true;                                    
                $(this).bind('focus', function(e) { $(e.target).addClass('focus'); });
                $(this).bind('blur', function(e) { $(e.target).removeClass('focus'); });
            }
        });
    }
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
            $(el).toggleClass('selected');
            count++;
            if(count == 2) {
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
$.fn.insertAt = function(i, el) {
    this.each(function() {
        if(i === 0)
            $(this).prepend(el);
        else if(i === -1)
            $(this).append(el);
        else
            $(this).children(':nth-child('+i+')').after(el);
    });
};
$.fn.make = function(className) {
    this.each(function() {
        $(this).parent().children('.'+className).removeClass(className);
        $(this).addClass(className);
    });
    return this;
}

$.fn.containedBy = function(parent) {
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

$.fn.center = function(args) {
    var args = $.extend({
        // defaults
        top: null  // center horizontally, manually specify top
    }, args || {})

    this.each(function() {
		var self = $(this);
        coords = get_center(self.outerWidth(), self.outerHeight())
        var left = coords[0], top = coords[1]
		
		if(args.top !== null) {
		    top = args.top
		}
    	self.css({top: top, left: left});
   });
};
var get_center = function(width, height) {        
    var winHeight = $(window).height()
    var winWidth = $(window).width()		
    var top = ((winHeight - height) / 2) + $(window).scrollTop()
    var left = ((winWidth - width) / 2) + $(window).scrollLeft()
    return [left, top]
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
    if(arguments.length == 0) {
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

$.fn.reverse = [].reverse;

$.browser.ltie8 = $.browser.msie && parseInt($.browser.version) < 8;
$.browser.ltie9 = $.browser.msie && parseInt($.browser.version) < 9;
$.browser.ltie10 = $.browser.msie && parseInt($.browser.version) < 10;

// ==============================
// = jQuery selector extensions =
// ==============================
$.extend($.expr[':'], {
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
    },
    inviewport: function(el) {
        var scrollTop = $(window).scrollTop(),
            elTop = $(el).offset().top,
            height = $(window).height();
        
        return (elTop > scrollTop) && (elTop < scrollTop+height);
    }    
});


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
                formdata.append(f.name, f.file)
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

            _.each(mixins.slice(), function(mixin) {
                if(mixin.beforeinitcls) // collect initcls functions to run later
                    mixin.beforeinitcls.call(child);
            });
            if(protoProps.beforeinitcls) 
                protoProps.beforeinitcls.call(child);
                
            if(protoProps.initcls)
                inits.push(protoProps.initcls)

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
                    this._delegateHotkeys(this.hotkeys);
                }                
            }

            // Then exend as usual
            child = extend.call(child, protoProps, classProps);                    
            
            // Call initcls
            for(var i=0, l=inits.length; i<l; i++)
                inits[i].call(child);
            
            return child;            
        }
    });
    
    /*
    hotkeys: {
        "keydown shift+a .sune": "myHandler"
    }
    */
    var delegateHotkeySplitter = /^(\S+)\s+(\S+)\s*(.*)$/;    
    Backbone.View.prototype._delegateHotkeys = function(events) {    
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
    }

    

})(Backbone);




// https://github.com/amccloud/backbone-safesync
(function(_, Backbone) {
    var sync = Backbone.sync;

    Backbone.sync = function(method, model, options) {
        var lastXHR = model._lastXHR && model._lastXHR[method];

        if ((lastXHR && lastXHR.readyState != 4) && (options && options.safe !== false))
            lastXHR.abort('stale');

        if (!model._lastXHR)
            model._lastXHR = {};

        return model._lastXHR[method] = sync.apply(this, arguments);
    };
})(_, Backbone);


_.instanceof = function(obj, klass) {
    try {
        return _.indexOf(obj.mixins || [], klass) !== -1 || obj instanceof klass;
    } catch(e) {
        return false;
    }
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
      var helpers = _.map(helpers || {}, function(v,k) { return {k:k,v:v}});
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








    _.template3 = function(text, helpers) {      
      // Don't trust ordering of keys in `helpers` object
      var helpers = _.map(helpers || {}, function(v,k) { return {k:k,v:v}});
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

      source = "var __p='',cache={},i=0;" +
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
        var parentEvents = this.__super__.events;        
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
$.fn.scrollable = function() {
    $(this).each(function() {
        var a = new gui.Scrollable({
            container: $(this),
            content: $(this).children()[0]
        });
    })
};


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
        var lines = _.compact(_.map(lines, function(line) {
            return $.trim(line);
        }));
        return lines.join('\n');
    }
    else
        return ce.text();
    
};

(function($) {
    function getNumericStyleProperty(style, prop){
        return parseInt(style.getPropertyValue(prop),10) ;
    }

    $.fn.getOffsetPadding = function() {
        var el = this[0]

        var x = 0, y = 0;
        var inner = true ;
        do {
            var style = getComputedStyle(el, null);
            var borderTop = getNumericStyleProperty(style,"border-top-width");
            var borderLeft = getNumericStyleProperty(style,"border-left-width");
            y += borderTop;
            x += borderLeft;
            if (inner) {
                var paddingTop = getNumericStyleProperty(style,"padding-top");
                var paddingLeft = getNumericStyleProperty(style,"padding-left");
                y += paddingTop;
                x += paddingLeft;
            }
            inner = false;
        } while (el = el.offsetParent);
        return {x: x, y: y};

    }


})($);


$.fn.reverse = [].reverse;


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

gui.isArrowKey = function(e) {
    if(e.shiftKey || e.altKey || e.metaKey)
        return false;
    var keys = gui.keys,
        key = e.which,
        arrows = [keys.LEFT, keys.RIGHT, keys.UP, keys.DOWN]    
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
        chars = "abcdef0123456789"
        len = len || 32;
    for(var i=0; i<len; i++)
        out.push(chars.charAt(Math.floor(Math.random() * chars.length)));
    return out.join('');
}

gui.pasteHtmlAtCaret = function(html) {
    var sel, range;
    if (window.getSelection) {
        // IE9 and non-IE
        sel = window.getSelection();
        if (sel.getRangeAt && sel.rangeCount) {
            range = sel.getRangeAt(0);
            range.deleteContents();

            // Range.createContextualFragment() would be useful here but is
            // non-standard and not supported in all browsers (IE9, for one)
            var el = document.createElement("div");
            el.innerHTML = html;
            var frag = document.createDocumentFragment(), node, lastNode;
            while ( (node = el.firstChild) ) {
                lastNode = frag.appendChild(node);
            }
            range.insertNode(frag);

            // Preserve the selection
            if (lastNode) {
                range = range.cloneRange();
                range.setStartAfter(lastNode);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
            }
        }
    } else if (document.selection && document.selection.type != "Control") {
        // IE < 9
        document.selection.createRange().pasteHTML(html);
    }
}


gui.addcss = function(stylesheets) {
    if(!_.isArray(stylesheets)) stylesheets = [stylesheets];
    var head = $(window.document).find('head');
    
    _.each(stylesheets, function(url) {
        if(!head.find('link[href="'+url+'"]').length) {
            console.log('Add css: ', url);
            var link = $('<link rel="stylesheet"></link>').attr('href', url);
            $(window.document).find('head').append(link);
        }
    });
}


return gui;
});