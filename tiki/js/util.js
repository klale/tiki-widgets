define([
    'jquery',
    'underscore',
    'backbone',
    'moment',
    './base'
], function($, _, Backbone, moment) {
    // Todo: Make Util.extend compatible with strict mode.
    // 'use strict'; 

    var util = {};

    // caretRangeFromPoint for IE
    util.caretRangeFromPoint = function(x, y, document) {
      document = document || window.document;

      function contains(range, x, y) {
        var rects = range.getClientRects();
        for (var i = 0, l = rects.length; i < l; i++) {
          var r = rects[i];
          if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
            return true;
          }
        }
      }

      function selectNode(node) {
        var range = document.createRange();
        range.selectNode(node);
        return range
      }

      var iter = document.createNodeIterator(
        document.elementFromPoint(x, y),
        NodeFilter.SHOW_TEXT, null, false);

      while (node = iter.nextNode()) {
        if (contains(selectNode(node), x, y)) {
          var r = document.createRange();
          for (var i = 0, l = node.nodeValue.length; i < l; i++) {
            r.setStart(node, i);
            r.setEnd(node, i + 1);
            if (contains(r, x, y)) {
              r.setStart(node, i + 1);
              r.setEnd(node, i + 1);
              iter.detach();
              return r;
            }
          }
        }
      }
    }


    util.initControlModel = function(view, config, modelOptions) {

      if (!view.model) {
        // Get model factory
        var Type = util.pop(config, 'modeltype', null) || view.defaultmodel;
        var isModelType = Type.prototype instanceof Backbone.Model || Type === Backbone.Model;

        // Instantiate a model and set view.model
        if (isModelType) {
          view.model = new Type(config, modelOptions);
        }
        else {
          view.model = Type(config, modelOptions);
        }
      }
    }



    
    util.fitInViewport = function(target, elementWidth) {
      /*
      Given an element `target` to align to, return position
      {left: N, top: N, bottom: N, height: N} to best fit
      something `elementWidth` wide;

      Todo: Add support for viewport other than window.
      */
      var scrollTop = document.body.scrollTop || document.documentElement.scrollTop; // documentElement in IE
      var scrollLeft = document.body.scrollLeft || document.documentElement.scrollLeft;

      // Remove scrollTop/scrollLeft, add them again when done measuring.
      var targetTop = $(target).offset().top - scrollTop;
      var targetLeft = $(target).offset().left - scrollLeft;
      var targetWidth = $(target).outerWidth();
      var targetHeight = $(target).outerHeight();

      var viewportWidth = $(window).width();
      var viewportHeight = $(window).height();

      var spaceAbove = targetTop;
      var spaceBelow = viewportHeight - (targetTop + targetHeight);

      var height, top, left, bottom;
      if (spaceBelow > spaceAbove) {
        height = spaceBelow;
        top = targetTop + targetHeight;
        left = targetLeft;
        bottom = '';
      }
      else {
        height = spaceAbove;
        top = '';
        bottom = viewportHeight - targetTop - scrollTop;
        left = targetLeft;
      }

      if ($.browser.msie) {
        // Page scrolls a tiny bit if a dropdown is lined exactly at the bottom
        // of the viewport. Occurs in all versions of IE. Add space as a workaround.
        height -= 3;
      }


      // Make sure element will be fully visible horizontally
      left = Math.max(left, 0);
      var overflow = (targetLeft + elementWidth) - viewportWidth;
      if (overflow > 0) {
        left = targetLeft - overflow;
        if ($.browser.msie) {
          left -= 1;
      }
      }


      var ret = {
        left: left + scrollLeft,
        top: top === '' ? '' : top + scrollTop,
        bottom: bottom,
        height: height,
      };

      return ret;
    };



    util.retriggerAll = function(source, target, prefix) {        
        target.listenTo(source, 'all', function() {
            var eventName = arguments[0],
                args = Array.prototype.slice.call(arguments, 1);
            if(prefix)
                eventName = prefix + '.' + eventName;
            
            target.trigger.apply(target, [eventName].concat(args));
        });
    };


    util.isModelSubclass = function(f) {
        // Has idAttribute && not an instance of Model
        return f && f.prototype && f.prototype.idAttribute && !f.attributes;
    };

    
    /* `Util.withModule` currently requires the Q promise library */
    util.withModule = function(path, callback) {
        var deferred, result;
        return function() {
            if(result) return result;
            else if(deferred) return deferred.promise;
            
            var args = Array.prototype.slice.call(arguments),
                deferred = Q.defer();
            
            require([path], function(Module) {
                // prepend the module to the list of arguments
                args.splice(0,0, Module);
                result = callback.apply(this, args)
                deferred.resolve(result);
            }.bind(this));
            return deferred.promise;
        }
    };

    util.merge = function() {
        /* A variant if Underscore's `extend` that does not mutate the first object. */
        Array.prototype.splice.call(arguments, 0, 1, _.clone(arguments[0]))
        _.extend.apply(this, arguments);
        return arguments[0];
    };


    util.getkey = function(obj, desc) {
        /*
        >>> var foo = {a: {b: {c: 'd'}}}
        >>> util.getkey(foo, 'a.b.c')
        'd'
        >>> util.getkey(foo, 'bar')
        undefined
        */
        var arr = desc.split(".");
        while(arr.length && (obj = obj[arr.shift()]));
        return obj;
    };
        
    
    util.setattr = function(model, key, value, options) {
        // Example: setkey(model, 'nestedmodel.myprop', 123);
        var arr = key.split(".");
        var propName = arr.pop();

        while(arr.length && (model = model.get(arr.shift())));
        model.set(propName, value, options);
    }

    util.getattr = function(model, key, value) {
        var arr = key.split(".");
        while(arr.length && (model = model.get(arr.shift())));
        return model;
    };


    util.arrayToObject = function(array, key) {
        return _.object(_.map(array, function(item) {
            return [item[key], item];
        }));
    };

    util.idArray = function(models) {
        if(models.models)
            models = models.models;
        return _.map(util.arrayify(models), function(m) {
            if(m.id) return m.id;
            return m;
        });
    };

    util.pasteHtmlAtCaret = function(html) {
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
    util.pasteTextAtCaret = function(text) {
        var el = document.createTextNode(text);
        util.pasteHtmlAtCaret(el.data);
    };



    util.getClosestStartingWith = function(collection, text, textAttr) {
            if(!text.length)
                return;
            textAttr = textAttr || 'text';
            /* Convert "apa" to a regex like /(^apa.*)|(^ap.*)|(^a.*)/i
            This return a sets like:
            >>> 'apa'.match(re).slice(1)
            ["apa", undefined, undefined]
            >>> 'ap'.match(re).slice(1)
            [undefined, "ap", undefined]
            */
            for(var re=[text], i=1; i < text.length; i++)
                re.push(text.slice(0, i*-1));
            var restr = _.map(re, function(s) {
                return '(^'+s+'.*)';
            }).join('|');
            re = new RegExp(restr, 'i');
            
            // Find the model with the longest match
            var match = _.sortBy(_.compact(collection.map(function(model) {
                var match = (model.get(textAttr) || '').match(re);
                if(!match) return;
                match = match.slice(1);
                var score = match.length - _.indexOf(match, model.get(textAttr));
                return [score, model];
            })), function(tup) { return tup[0]*-1; })[0];
            if(match)
                return match[1];        
    };

    util.reverseSortBy = function(sortByFunction) {
        return function(left, right) {
            var l = sortByFunction(left);
            var r = sortByFunction(right);
            if (l === void 0) return -1;
            if (r === void 0) return 1;
            return l < r ? 1 : l > r ? -1 : 0;
        };
    };


    util.center = function(el, args) {
        el = $(el);
        var winHeight = $(window).height(),
            winWidth = $(window).width(),
            top = ((winHeight - el.outerWidth()) / 2) + $(window).scrollTop(),
            left = ((winWidth - el.outerHeight()) / 2) + $(window).scrollLeft();
        el.css({top: args.top || 0, left: left});
    };

    util.getEditDistance = function(a, b){
      if(a.length == 0) return b.length; 
      if(b.length == 0) return a.length; 

      var matrix = [];

      // increment along the first column of each row
      var i;
      for(i = 0; i <= b.length; i++){
        matrix[i] = [i];
      }

      // increment each column in the first row
      var j;
      for(j = 0; j <= a.length; j++){
        matrix[0][j] = j;
      }

      // Fill in the rest of the matrix
      for(i = 1; i <= b.length; i++){
        for(j = 1; j <= a.length; j++){
          if(b.charAt(i-1) == a.charAt(j-1)){
            matrix[i][j] = matrix[i-1][j-1];
          } else {
            matrix[i][j] = Math.min(matrix[i-1][j-1] + 1, // substitution
                                    Math.min(matrix[i][j-1] + 1, // insertion
                                             matrix[i-1][j] + 1)); // deletion
          }
        }
      }

      return matrix[b.length][a.length];
    };

    util.extend = function(name, protoProps, staticProps) {
        /**
        this = the Function object we're exteding
        child = the new Function object. I run initcls on child
                just after it has been created.
        protoProps = stuff to extend `this` with. Could contain an initcls.
        protoProps.mixins = list of Objects (or Functions) to extend from
                            also. These might contain initcls.
        */
        if(!_.isString(name)) {
            staticProps = protoProps;
            protoProps = name;
            name = 'child';
        }
        protoProps = protoProps || {};
        
        var inits = [],
            mixins = protoProps.mixins || [];
    
    
        // Apply defaultOptions
        if(protoProps.defaultOptions) {
            var constr = (protoProps.constructor === Object) ? this : protoProps.constructor;
            protoProps.constructor = function(attributes, options) {
                // Inject the default options
                options = _.extend(options || {}, protoProps.defaultOptions);
                // Call the hijacked constructor                        
                constr.call(this, attributes, options);
            };
        }
        
        // Add initcls to inits
        if(protoProps.initcls)
            inits.push(protoProps.initcls);
        else if(this.prototype.initcls)
            inits.push(this.prototype.initcls);
    
        // Apply mixins
        _.each(mixins, function(mixin) {
            _.defaults(protoProps, mixin);
            if(mixin.initcls) // collect initcls functions to run later
                inits.push(mixin.initcls);
        });
    
        
        var parent = this;
        var child;
    
        if(name.indexOf('.') !== -1) {
            var ns = name.split('.').slice(0,-1),
                len = ns.length;
            if(len == 0)
                // var A;
                eval('var '+name);
            else if(len == 1)
                // var A = {}
                eval('var '+ns[0]+'={}');
            else
                // var A = {B: {C: {D: {}}}}  etc
                eval('var '+ns[0]+'={'+ns.slice(1).join(': {') + ': {}' + new Array(len).join('}'));
        }
    
        // The constructor function for the new subclass is either defined by you
        // (the "constructor" property in your `extend` definition), or defaulted
        // by us to simply call the parent's constructor.
        if (protoProps && _.has(protoProps, 'constructor')) {
            var c = protoProps.constructor;
            child = eval(name+'=function() { // '+name+'\nreturn c.apply(this, arguments); }');
        } else {
            child = eval(name+'=function() { // '+name+'\nreturn parent.apply(this, arguments); }');
        }
        
        // Add static properties to the constructor function, if supplied.
        _.extend(child, parent, staticProps);
    
        // Set the prototype chain to inherit from `parent`, without calling
        // `parent`'s constructor function.
        var Surrogate = function(){ this.constructor = child; };
        Surrogate.prototype = parent.prototype;
        child.prototype = new Surrogate;
    
        // Add prototype properties (instance properties) to the subclass,
        // if supplied.
        if (protoProps) _.extend(child.prototype, protoProps);
    
        // Set a convenience property in case the parent's prototype is needed
        // later.
        child.__super__ = parent.prototype;

        // Define `util.prop` properties
        for(var k in protoProps) 
            if(protoProps[k] instanceof util.prop)
                Object.defineProperty(child.prototype, k, protoProps[k]);
        
        // Call all initcls
        for(var i=0, l=inits.length; i<l; i++)
            inits[i].call(child);
    
        return child;
    };
    
    

    util.prop = function(config) {
        /*
        Helper for defining ECMAScript 5 properties. 
        The `extend` must be `Util.extend`.

        Example
        -------
        var MyClass = Tools.Events.extend({

            // Explicit syntax
            title: Util.prop({
                get: function() {
                    return this._title;
                },
                set: function(v) {
                    this._title = v;
                },
                configurable: true,
                enumerable: true
            }),

            // Short syntax, defining a getter
            firstName: Util.prop(function() {
                return this._firstName;
            })
        })
        */
        if(_.isFunction(config))
            config = {get: config};

        if(this instanceof util.prop)
            _.extend(this, config);
        else
            return new util.prop(config);
    };
    
    
    

    /*
    A vanilla collection, using Tiki's Util.extend. */
    util.Collection = Backbone.Collection.extend();
    util.Collection.extend = util.extend;

    
    var tests = {
        dateManip: /^([\+\-])?(\d{0,3})(\w)?$/,
        iscompactdate: /^(\d{2,4})(\d{2})(\d{2})$/,
        yyyymmdd: /^(\d{4})(\d{2})(\d{2})$/,
        yymmdd: /^(\d{2})(\d{2})(\d{2})$/
    };    
    util.interpretdate = function(value, basedate) {
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
    
    // ===================
    // = Keyboard events =
    // ===================
    // http://stackoverflow.com/questions/1465374/javascript-event-keycode-constants
    // http://www.w3.org/TR/2001/WD-DOM-Level-3-Events-20010410/DOM3-Events.html#events-Events-KeyEvent
    // https://developer.mozilla.org/en/DOM/Event/UIEvent/KeyEvent
    // if (window.KeyEvent == "undefined")
        // window.KeyEvent = {
    util.KeyEvent = {
        DOM_VK_CANCEL: 3, DOM_VK_HELP: 6, DOM_VK_BACK_SPACE: 8, DOM_VK_TAB: 9, 
        DOM_VK_CLEAR: 12, DOM_VK_RETURN: 13, DOM_VK_ENTER: 14, DOM_VK_SHIFT: 16, 
        DOM_VK_CONTROL: 17, DOM_VK_ALT: 18, DOM_VK_PAUSE: 19, DOM_VK_CAPS_LOCK: 20, 
        DOM_VK_ESCAPE: 27, DOM_VK_SPACE: 32, DOM_VK_PAGE_UP: 33, DOM_VK_PAGE_DOWN: 34, 
        DOM_VK_END: 35, DOM_VK_HOME: 36, DOM_VK_LEFT: 37, DOM_VK_UP: 38, 
        DOM_VK_RIGHT: 39, DOM_VK_DOWN: 40, DOM_VK_PRINTSCREEN: 44, DOM_VK_INSERT: 45, 
        DOM_VK_DELETE: 46, DOM_VK_0: 48, DOM_VK_1: 49, DOM_VK_2: 50, DOM_VK_3: 51, 
        DOM_VK_4: 52, DOM_VK_5: 53, DOM_VK_6: 54, DOM_VK_7: 55, DOM_VK_8: 56, DOM_VK_9: 57, 
        DOM_VK_SEMICOLON: 59, DOM_VK_EQUALS: 61, DOM_VK_A: 65, DOM_VK_B: 66, DOM_VK_C: 67, 
        DOM_VK_D: 68, DOM_VK_E: 69, DOM_VK_F: 70, DOM_VK_G: 71, DOM_VK_H: 72, DOM_VK_I: 73, 
        DOM_VK_J: 74, DOM_VK_K: 75, DOM_VK_L: 76, DOM_VK_M: 77, DOM_VK_N: 78, DOM_VK_O: 79, 
        DOM_VK_P: 80, DOM_VK_Q: 81, DOM_VK_R: 82, DOM_VK_S: 83, DOM_VK_T: 84, DOM_VK_U: 85, 
        DOM_VK_V: 86, DOM_VK_W: 87, DOM_VK_X: 88, DOM_VK_Y: 89, DOM_VK_Z: 90, 
        DOM_VK_CONTEXT_MENU: 93, DOM_VK_NUMPAD0: 96, DOM_VK_NUMPAD1: 97, DOM_VK_NUMPAD2: 98, 
        DOM_VK_NUMPAD3: 99, DOM_VK_NUMPAD4: 100, DOM_VK_NUMPAD5: 101, DOM_VK_NUMPAD6: 102, 
        DOM_VK_NUMPAD7: 103, DOM_VK_NUMPAD8: 104, DOM_VK_NUMPAD9: 105, DOM_VK_MULTIPLY: 106, 
        DOM_VK_ADD: 107, DOM_VK_SEPARATOR: 108, DOM_VK_SUBTRACT: 109, DOM_VK_DECIMAL: 110, 
        DOM_VK_DIVIDE: 111, DOM_VK_F1: 112, DOM_VK_F2: 113, DOM_VK_F3: 114, DOM_VK_F4: 115, 
        DOM_VK_F5: 116, DOM_VK_F6: 117, DOM_VK_F7: 118, DOM_VK_F8: 119, DOM_VK_F9: 120, 
        DOM_VK_F10: 121, DOM_VK_F11: 122, DOM_VK_F12: 123, DOM_VK_F13: 124, DOM_VK_F14: 125, 
        DOM_VK_F15: 126, DOM_VK_F16: 127, DOM_VK_F17: 128, DOM_VK_F18: 129, DOM_VK_F19: 130, 
        DOM_VK_F20: 131, DOM_VK_F21: 132, DOM_VK_F22: 133, DOM_VK_F23: 134, DOM_VK_F24: 135, 
        DOM_VK_NUM_LOCK: 144, DOM_VK_SCROLL_LOCK: 145, DOM_VK_COMMA: 188, DOM_VK_PERIOD: 190, 
        DOM_VK_SLASH: 191, DOM_VK_BACK_QUOTE: 192, DOM_VK_OPEN_BRACKET: 219, DOM_VK_BACK_SLASH: 220, 
        DOM_VK_CLOSE_BRACKET: 221, DOM_VK_QUOTE: 222, DOM_VK_META: 224
    };

    util.keys = {
        LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, RETURN: 13, ENTER: 13, ESCAPE: 27, ESC: 27, SPACE: 32,
        TAB: 9, BACKSPACE: 8, SHIFT: 15, CTRL: 17, ALT: 18
    };

    util.modifierKeys = {
        16: 'shift',
        17: 'ctrl',
        91: 'meta',
        18: 'alt'
    };
      

    util.repr = function(o, depth, max) {
        depth = depth || 0;
        max = max || 3;

        if(depth >= max)
            return '...';
        else if(o === null)
            return 'null';
            
        switch(typeof(o)) {
            case 'string': return '"'+o+'"';
            case 'function': return 'function';
            case 'undefined': return 'undefined';
            case 'object': 
                if(_.isArray(o))
                    return '[' + _.map(o, function(item) { 
                        return util.repr(item, depth+1, max); 
                    }).join(', ') + ']';
                else if(_.isObject(o))
                    return '{' + _.map(o, function(item, key) { 
                        return key+': '+util.repr(item, depth+1, max); 
                    }).join(', ') + '}';
                else
                    return o.toString();
            default:
                return o;
        }
    };


    util.modelToStr = function(obj /*, keys*/) {
        var keys = Array.prototype.slice.call(arguments, 1),
            s = _.map(keys, function(k) { return k+'='+util.repr(obj.get(k)); }).join(', ');
        return obj.constructor.name +'('+s+')';
    };


    util.isinstance = function(obj, klass) {
        try {
            return _.indexOf(obj.mixins || [], klass) !== -1 || obj instanceof klass;
        } catch(e) {
            return false;
        }
    };
    util.isNumeric = function(n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    };
    util.arrayToObj = function(list, key) {
        return _.object(_.map(list, function(f) {
            return [f[key], f];
        }));
    };
    util.pop = function(obj, key, def) {
        if(!(key in obj)) {
            if(_.isUndefined(def))
                throw new Error(key + ' not found in ' + obj);
            return def;
        }
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
    util.defs = function(obj, defaults) {
        if(!obj) 
            return _.clone(defaults);
        for(var key in defaults)
            if(defaults.hasOwnProperty(key) && obj[key] === undefined) 
                obj[key] = defaults[key];
        return obj;
    };
    util.arrayify = function(v) {
        /*
        An alternative Array constructor.
        >>> new Array()
        []
        >>> arrayify()
        []
        >>> new Array()
        [null]
        >>> arrayify(null)
        [null]
        >>> new Array([1, 2, 3])
        [[1, 2, 3]]                
        >>> arrayify([1, 2, 3])
        [1, 2, 3]        
        */
        if(v === undefined)
            return [];
        else if(_.isArray(v))
            return v;
        return [v];
    };

    util.dateToYMD = function(date) {
        var y = date.getFullYear(),
            m = date.getMonth() + 1,
            d = date.getDate();
        return y + '-' + (m<10 ? '0' + m : m) + '-' + (d<10 ? '0' + d : d);
    };




    /* 
    Util.template()
    ---------------
    A modified copy of Underscore.template (v1.3.3), adding the `settings` 
    variable to the rendering scope, along with the usual 'obj' and '_'.
    
    Example:
    Util.template('<div>${foo.bar}</div>', {foo: 'bar'})
    
    */
    (function(Util) {
        var noMatch = /.^/;

        var settings = {
          evaluate    : /\[\[([\s\S]+?)\]\]/g,
          interpolate : /\$\{([\s\S]+?)\}/g,
          escape      : /\$\{-([\s\S]+?)\}/g,
          variable: 'obj'
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

        var makeFunction = function(text, keys) {
            if(text && !_.isString(text))
                text = $(text).text(); // Assume dom node (commonly a script element)
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
            return [new Function(args, source), source];
        }

        Util.template = function(text, helpers) {
          // Compile the template source, taking care to escape characters that
          // cannot be included in a string literal and then unescape them in code
          // blocks.
                
          // Don't trust ordering of keys in `helpers` object
          helpers = _.map(helpers || {}, function(v,k) { return {k:k,v:v}; });
          var keys = _.map(helpers, function(v) { return v.k; });
          var helpersArgs = _.map(helpers, function(v) { return v.v; });
          var render;
      
          var template = function(data) {
            if(!render) {
                var ret = makeFunction(text, keys);
                render = ret[0];
                // Provide the compiled function source as a convenience for build time
                // precompilation.
                this.source = 'function(' + (settings.variable || 'obj') + '){\n' +
                    ret[1] + '}';                
            }
            var args = [data, _, settings].concat(helpersArgs);
            return render.apply(this, args);
          };

          return template;
        };

    })(util);


    
    util.Events = function() {
        this.initialize.apply(this, arguments);
    };
    _.extend(util.Events.prototype, Backbone.Events, {
        initialize: function() {}
    });
    util.Events.extend = util.extend;    


    
    util.makePreText = function(plaintext) {
        plaintext = (plaintext || '');
        var html;
        
        if($.browser.webkit || $.browser.chrome) {
            // Wrap each textline inside <div>line</div>
            html = plaintext.split('\n').map(function(item) { return '<div>'+item+'</div>'; }).join('');
        }
        else if($.browser.msie) {
            html = plaintext.split('\n').map(function(item) { return '<p>'+item+'</p>'; }).join('');
        }
        else {
            html = plaintext.replace(/\n/g, '<br>');
        }
        return html;
    };
    
    util.isArrowOnlyKey = function(e) {
        if(e.shiftKey || e.altKey || e.metaKey)
            return false;
        return util.isArrowKey(e);
    };
    
    util.isArrowKey = function(e) {
        var keys = util.keys,
            key = e.which,
            arrows = [keys.LEFT, keys.RIGHT, keys.UP, keys.DOWN];    
        return _.indexOf(arrows, e.which) !== -1;
    };

    util.mouseOffset = function(e, el) { 
        var offset = $(el || e.target.offsetParent).offset(); 
        return {
            left: e.pageX - offset.left,
            top: e.pageY - offset.top
        };
    };

    util.modelify = function(obj, klass) {
        if(obj instanceof Backbone.Model)
            return obj;
        if(_.isString(obj) || _.isNumber(obj))
            obj = {id: obj}
        return new (klass || Backbone.Model)(obj || {});
    };

    util.arrayify = function(obj, klass) {
        if(!(_.isArray(obj)))
            return [obj];
        return obj;
    };    
    
    util.collectionify = function(obj, klass) {
        if(obj instanceof Backbone.Collection)
            return obj;
        return new (klass || Backbone.Collection)(obj);        
    };

    util.pad = function(value, padlen, padchar) {
        var pad = new Array(1 + padlen).join(padchar);
        return (pad + value).slice(-pad.length);
    };

    util.iepreventTextSelection = function(e) {
        // IE7-IE8 cannot abort text selection by calling 
        // e.preventDefault() on the mousedown event.    
        if($.browser.ltie9) {
            e.srcElement.onselectstart = function () { return false; };
            window.setTimeout(function () { e.srcElement.onselectstart = null; }, 0);
        }
    };


    // ======================
    // = Backbone extension =
    // ======================
    /* 
    This adds support for mixins and a method called initcls 
    which is run once when a Function is created */
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
    
    
    util.Subset = Backbone.Collection.extend({
        initialize: function(models, options) {
            // Source is another Collection
            this.source = options.source;
            
            this._prepareModel = _.bind(this._prepareModel, this);
        },
        _prepareModel: function(item, options) {

            if(item) {
                var model = this.source.get(item.id || item);
                if(!model) 
                    throw new Error('Unknown item: ' + item);
                return model;
            }
        },
        toString: function() {
            return 'Util.Subset(source='+this.source+')';
        }
    });
    
    
    util.SubsetMulti = Backbone.Collection.extend({
        /*
        Just like Backbone.Subset, but it has multiple source collections
        and each model of a SubsetMulti has an attribute "collection" 
        indicating wich collection it should go into.
        
        var coll = new Backbone.SubsetMulti({
            sources: {
                mycoll: {
                    collection: mycollection
                },
                othercoll: {
                    collection: othercollection
                }
            }})
        coll.add({id: 'foo', source: 'mycoll', sourceId: 123, text: 'Foo'})
        coll.add({id: 'bar', source: 'othercoll', sourceId: 456, text: 'Bar'})            
        */
        initialize: function(models, options) {
            this.sources = options.sources;
            this.Model = options.Model || Backbone.Model;
        },
        _prepareModel: function(item, options) {
            // console.log('item.id', item.id)
            if(!item)
                return item;
            
            if(item.attributes)
                item = item.attributes;
            
            if(!item.source) 
                throw new Error('Item has no "source" property');                
            if(!item.sourceId) 
                throw new Error('Item has no "sourceId" property');
            if(!this.sources[item.source]) 
                throw new Error('Unknown coll "'+item.source+'".');                
            
            
            // Just return the stupid model from this collection as
            // usual, but add a client-side property <model>.ref
            // referring the original model holding all the interesting properties.
            // This stupid model only holds an id and some optional metadata.
            
            var ref = this.sources[item.source].collection.get(item.sourceId);
            
            var model = new this.Model(item);
            model.ref = ref;
            return model;
        }
    });

    


    
    return util;

});