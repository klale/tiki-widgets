define([
    'jquery',
    'underscore',
    'backbone',
    './base'
], function($, _, Backbone) {
    'use strict';

    var util = {};

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
                var match = (model.get('text') || '').match(re);
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



    function namedConstructor(name, constructor) {
        var f = new Function('constructor', 'return function ' + name + '() { '+
                              'constructor.apply(this, arguments); };')
        return f(constructor);
    }
    util.extend = function (constructorName, protoProps, classProps) {
        if(!_.isString(constructorName)) {
            classProps = protoProps,
            protoProps = constructorName,
            constructorName = null;
        }    
        if(constructorName) {
            var constr = protoProps.hasOwnProperty('constructor') ? protoProps.constructor : this;
            protoProps.constructor = namedConstructor(constructorName, constr);
        }
        return Backbone.Model.extend.call(this, protoProps, classProps);
    };
    




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
            s = _.map(keys, function(k) { return k+'='+util.repr(obj.get(k)); }).join(', ')
        return obj.constructor.name +'('+s+')';
    }


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
    -----------
    A modified copy of Underscore.template (v1.3.3), adding the `settings` 
    variable to the rendering scope, along with the usual 'obj' and '_'.
    */
    (function(Util) {
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


        Util.template = function(text, helpers) {
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


    })(util);


    
    util.Events = function() {
        this.initialize.apply(this, arguments);
    };
    _.extend(util.Events.prototype, Backbone.Events, {
        initialize: function() {}
    });
    util.Events.extend = Backbone.Model.extend;


    
    util.makePreText = function(plaintext) {
        plaintext = (plaintext || '').trim();
        var html;
        
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
        return new (klass || Backbone.Model)(obj || {});
    };

    util.arrayify = function(obj, klass) {
        if(!(_.isArray(obj)))
            return [obj];
        return obj;
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
            protoProps = protoProps || {};
            var child = this, // were starting of alike..
                inits = [],
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

            // Exend as usual
            child = extend.call(child, protoProps, classProps);                    
        
            // Then call all initcls
            for(var i=0, l=inits.length; i<l; i++)
                inits[i].call(child);
        
            return child;            
        };
    });


    
    return util;

});