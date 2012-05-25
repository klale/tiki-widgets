

// =========
// = Class =
// =========
/*
 Class
 ------------------------------------
 - Base for object inheritance
 
 
var Person = Class.extend({
  init: function(isDancing){
    this.dancing = isDancing;
  },
  dance: function(){
    return this.dancing;
  }
});
var Ninja = Person.extend({
  init: function(){
    this._super( false );
  },
  dance: function(){
    // Call the inherited version of dance()
    return this._super();
  },
  swingSword: function(){
    return true;
  }
});

var p = new Person(true);
p.dance(); // => true

var n = new Ninja();
n.dance(); // => false
n.swingSword(); // => true

// Should all be true
p instanceof Person && p instanceof Class &&
n instanceof Ninja && n instanceof Person && n instanceof Class

*/

// snagged from john's blog: http://ejohn.org/blog/simple-javascript-inheritance/
// Inspired by base2 and Prototype
(function(){
    var initializing = false, fnTest = /xyz/.test(function(){xyz;}) ? /\b_super\b/ : /.*/;
    // The base Class implementation (does nothing)
    this.Class = function(){};
    
    // Create a new Class that inherits from this class
    Class.extend = function(prop) {
        var _super = this.prototype;
        
        // Instantiate a base class (but only create the instance,
        // don't run the init constructor)
        initializing = true;
        var prototype = new this();
        initializing = false;
        
        // Copy the properties over onto the new prototype
        for (var name in prop) {
            // Check if we're overwriting an existing function
            prototype[name] = typeof prop[name] == "function" && 
                typeof _super[name] == "function" && fnTest.test(prop[name]) ?
                (function(name, fn){
                    return function() {
                        var tmp = this._super;
                    
                        // Add a new ._super() method that is the same method
                        // but on the super-class
                        this._super = _super[name];
                    
                        // The method only need to be bound temporarily, so we
                        // remove it when we're done executing
                        var ret = fn.apply(this, arguments);                
                        this._super = tmp;
                    
                        return ret;
                    };
                })(name, prop[name]) :
                prop[name];
        }
        
        // The dummy class constructor
        function Class() {
            // All construction is actually done in the init method
            if(initializing && this.initcls) {
                this.initcls.apply(this, arguments);
            }
            else if ( !initializing && (this.init || this.initialize) ) {
                (this.init || this.initialize).apply(this, arguments);
            }
        }
        
        // Populate our constructed prototype object
        Class.prototype = prototype;
        
        // Enforce the constructor to be what we expect
        Class.constructor = Class;

        // And make this class extendable
        Class.extend = arguments.callee;

        Class.prototype._mixin = function(obj, args) {
            // Todo: QD. Hook this into Class to support _super etc in mixins
            var f = obj.prototype || obj;
            var init = f.init || function(){};
            delete f.init;
            // console.log('EXTENDING: ', this, this.constructor.prototype, " with ", dict);
            $.extend(prototype, f);
            init.call(this);
        };
        
        
        return Class;
    };
})();



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
}

// =====================
// = jQuery extensions =
// =====================

// TODO: don't fiddle with the global jquery, let "gui" package use its own
// copy of jquery.

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

jQuery.extend($.expr[':'], {
    selectable: function(el) {
        // visible and not disabled
        return $(el).is(':visible') && !$(el).is('.disabled');
    }
});


// ==============
// = Observable =
// ==============
gui.Observable = Class.extend({
    /*
    * Does not support adding the same eventtype+handler multiple 
    * times, even if scope differs.
    */
    on: function(type, handler, scope) {
        if(handler === undefined) {
            this.log_error('Trying to bind a non-existing handler to "'+type+'".');
            // throw new Error('Trying to bind a non-existing handler to "'+type+'".' + scope)
        }
        if(!handler._guid) {
            handler._guid = 'g'+gui.Observable.counter++;
        }
        if(!this.handlers) {
            this.handlers = {};
        } 
        if(!this.handlers[type]) {
            this.handlers[type] = {};
        }
        if(scope) {        
            handler = gui.Observable.bind(handler, scope);
        }
        this.handlers[type][handler._guid] = handler;
    },
    un: function(type, handler, scope) {
        var hasHandlers = this.handlers && this.handlers[type];
        if(hasHandlers) {
            if(handler) {
                delete this.handlers[type][handler._guid];
            } else {
                delete this.handlers[type];
            }
        }
    },
    fire: function(type) { /*, arg0, arg1, argN */
        var hasHandlers = this.handlers && (this.handlers[type] || this.handlers['all']),
            retval;
            
        if(hasHandlers) {
            var args = Array.prototype.slice.call(arguments, 1);
            $.each(this.handlers[type] || {}, function(key, handler) {            
                if(retval === false) {
                    handler.apply(null, args);
                } else {
                    retval = handler.apply(null, args);
                }
            });            
            $.each(this.handlers['all'] || {}, function(key, handler) {
                if(retval === false) {
                    handler.apply(null, [type].concat(args));
                } else {
                    retval = handler.apply(null, [type].concat(args));
                }
            });            
            
        }
        return retval;
    },
    // Todo: move log_error elsewhere
    log_error: function() {
        if(window.console) {
            var args = Array.prototype.slice.call(arguments); // create a copy
            var msg = args.length == 1 ? '[%s %o] ERROR: %s' : '[%s %o] ERROR: %o';
            
            if(args.length == 1) {
                console.log('[%s %o] ERROR: %s', this._classname, this, args[0]);
            } else {
                console.log('[%s %o] ERROR: %o', this._classname, this, args);
            }
            // var msg =  ? args[0] : arguments;
            // console.log('['+this._classname,this,'] ERROR: ', msg);
        }
    }
});

$.extend(gui.Observable, {
    counter: 0,
    bind: function(f, scope) {
        var proxy = function() {
            return f.apply(scope, arguments);
        };
        proxy._guid = f._guid;
        return proxy;
    }
});




// ===============
// = Drag / drop =
// ===============
gui.Drag = gui.Observable.extend({
    distance: 5, // drag at least `distance` pixels to initate a drag
    
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
        // Attach drag-related listeners
        this._body.bind('mousemove', this._onbodymousemove);
        this._body.bind('mouseover', this._onbodymouseover);        
        this._body.bind('mouseout', this._onbodymouseout);              
        this._body.bind('mouseup', this._onbodymouseup);
        this._init = {x: conf.ev.clientX, y: conf.ev.clientY}

        this.conf = conf;
        this.el = conf.el;
        this.prefix = conf.prefix || '';
        // if(conf.clone) {
        //     this._mixin(jkit.DragClone);
        //     this.conf.ondrag = 
        // }
        
        // no text selection while dragging        
        conf.ev.preventDefault();        
    },
    onBodyMouseMove: function(e) {
        // Detect enough drag movement before starting the drag
        var startDrag = this.dragging ? false : (Math.abs(e.clientX - this._init.x) > this.distance || Math.abs(e.clientY - this._init.y) > this.distance)
            
        if(startDrag || this.dragging) {
            if(startDrag) {
                this.scrollLeft = $(window).scrollLeft()
                this.scrollTop = $(window).scrollTop()
                // `conf.ev` is the mousedown event
                var e = this.conf.ev;
            }
            // Add some extra drag-related attributes to the `mousemove` event
            e.pageX = e.clientX + this.scrollLeft;
            e.pageY = e.clientY + this.scrollTop;
            e.conf = this.conf;
            
            
            
            if(startDrag) {
                var conf = this.conf;
                if(conf.onstart)
                    conf.onstart(e, this.conf);
                this.dragging = true;
                
                if(this.conf.el) {
                    // move the proxy el
                    this.conf.el.css({
                        left: e.pageX + 10, 
                        top: e.pageY + 10
                    });
                    this.conf.el.show();                
                }
                
            }
            else if(this.dragging) {
                if(this.conf.el) {
                    // move the proxy el
                    this.conf.el.css({
                        left: e.pageX + 10, 
                        top: e.pageY + 10
                    });
                }
                if(this.conf.ondrag)
                    this.conf.ondrag(e, this.conf);
            }            
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
            
            if(this.conf.el) 
                this.conf.el.remove();
            
            this.fire('dragend', data);
        }

        this.conf = {};
        if(this.el) {
            this.el.remove();
        }
        this.el = undefined;        
    }
    // onBodyMouseMoveImpl: null,
    // onBodyMouseUpImpl: null
});
gui.drag = new gui.Drag();



// ==============
// = Scrollable =
// ==============
gui.Scrollable = Class.extend({
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
        if(!this.content.outerHeight()) {
            return
        }
        // ie7 must cache container height here (neg. margin impacts when 
        // scrolling to bottom)
        this._containerHeight = this.container.height(); 
        this._contentHeight = this.content.outerHeight()
        
        if(this.isOverflowing()) {
            // this.scrollbar.fadeIn();
            this.scrollbar.show();
            var h = this._containerHeight / this._contentHeight;
            this.vhandle.css('height', h*100 + '%');
            this.vhandle_height = h            

            // if a strip of white is showing in the bottom,
            // do a scrollToBottom.            
            if(this.getStripOfWhite()) {
                this.scrollToBottom();
            }
        }
        else {
            // this.scrollbar.fadeOut();
            this.scrollbar.hide();
        }
    },
    scrollToBottom:function() {
        var diff = this._contentHeight - this._containerHeight;
        this.scrollTo(diff*-1);
    },    
    getScrollTop: function() {
        return parseInt(this.content.css('margin-top'));
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
            var d =  this._contentHeight / this._contentHeight;
            this.scrollTo(this.getScrollTop() + delta*8*d)
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
}