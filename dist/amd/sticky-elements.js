(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define(["jquery","underscore","events"],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.StickyElements = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _util = require('./util');

var ContextMixin = (function () {
  function ContextMixin() {
    _classCallCheck(this, ContextMixin);
  }

  _createClass(ContextMixin, [{
    key: 'initialize',
    value: function initialize(options) {
      _underscore2['default'].bindAll(this, 'onVerticalScroll');
      this.context = options.context;
      this.watcher.on('verticalscroll', this.onVerticalScroll);
    }
  }, {
    key: 'getDistanceToStack',
    value: function getDistanceToStack(scrollData) {
      var contextBottom = (0, _util.getRelativeRect)(this.context, scrollData.scrollEvent).bottom;
      var distance = contextBottom - (this.frozenStackHeight || scrollData.stackHeight) + scrollData.rect.height;
      return distance;
    }
  }, {
    key: 'getContextRect',
    value: function getContextRect(scrollEvent) {
      return (0, _util.getRelativeRect)(this.context, scrollEvent);
    }
  }, {
    key: 'onScrollOut',
    value: function onScrollOut(scrollData) {
      var scrollEvent = scrollData.scrollEvent;
      var distance = this.getDistanceToStack(scrollData);
      var rowHeight = scrollData.rect.height;

      var marginTop = distance - rowHeight;
      marginTop = Math.min(rowHeight, marginTop * -1);
      this.row.css('margin-top', marginTop * -1);

      if (marginTop === rowHeight) {
        this.rowStatus = 'above';
      }
    }
  }, {
    key: 'onScrollIn',
    value: function onScrollIn(scrollData) {
      var distance = this.getDistanceToStack(scrollData);
      var marginTop = scrollData.rect.height - distance;
      marginTop = Math.max(0, marginTop);
      this.row.css('margin-top', marginTop * -1);

      if (marginTop === 0) {
        this.rowStatus = null;
        this.frozenStackHeight = null;
      }
    }
  }, {
    key: 'onVerticalScroll',
    value: function onVerticalScroll(scrollData) {
      if (!this.context || !this.row) {
        return;
      }
      var direction = scrollData.scrollEvent.direction;
      if (this.rowStatus !== 'scrolling') {
        var distance = this.getDistanceToStack(scrollData);

        if (distance > 0 && distance < scrollData.rect.height) {
          // freeze the stack height now, before adding any negative margin-top
          // that affects the stack height.
          this.frozenStackHeight = scrollData.stackHeight;
          this.rowStatus = 'scrolling';
          this.onVerticalScroll(scrollData);
        } else if (distance < 0 && this.rowStatus !== 'above') {
          this.onScrollOut(scrollData);
        }
      }

      if (this.rowStatus == 'scrolling') {
        if (direction == 'down') {
          this.onScrollOut(scrollData);
        } else {
          this.onScrollIn(scrollData);
        }
      }
    }
  }]);

  return ContextMixin;
})();

exports['default'] = ContextMixin;
module.exports = exports['default'];

},{"./util":5,"underscore":undefined}],2:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _Watcher2 = require('./Watcher');

var _Watcher3 = _interopRequireDefault(_Watcher2);

var HorizontallyFixed = (function (_Watcher) {
  _inherits(HorizontallyFixed, _Watcher);

  function HorizontallyFixed(options) {
    _classCallCheck(this, HorizontallyFixed);

    _get(Object.getPrototypeOf(HorizontallyFixed.prototype), 'constructor', this).call(this, options);
    _underscore2['default'].bindAll(this, 'onHorizontalScroll');

    this.setViewport(options.viewport || document);

    this.on('horizontalscroll', this.onHorizontalScroll);
  }

  _createClass(HorizontallyFixed, [{
    key: 'onHorizontalScroll',
    value: function onHorizontalScroll(scrollData) {
      var scrollEvent = scrollData.scrollEvent;
      var rect = this.getRect(scrollEvent);
      var maxLeftAllowed = scrollEvent.scrollWidth - rect.width;

      var left = Math.min(scrollEvent.scrollLeft, maxLeftAllowed);
      left = Math.max(0, left);
      this.$el.css('left', left);
    }
  }]);

  return HorizontallyFixed;
})(_Watcher3['default']);

exports['default'] = HorizontallyFixed;
module.exports = exports['default'];

},{"./Watcher":4,"underscore":undefined}],3:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _jquery = require('jquery');

var _jquery2 = _interopRequireDefault(_jquery);

var _events = require('events');

var _events2 = _interopRequireDefault(_events);

var _ContextMixin = require('./ContextMixin');

var _ContextMixin2 = _interopRequireDefault(_ContextMixin);

var _Watcher = require('./Watcher');

var _Watcher2 = _interopRequireDefault(_Watcher);

var _util = require('./util');

var Sticky = (function (_mixin) {
  _inherits(Sticky, _mixin);

  function Sticky(options) {
    _classCallCheck(this, Sticky);

    _get(Object.getPrototypeOf(Sticky.prototype), 'constructor', this).call(this);
    _underscore2['default'].bindAll(this, 'onVerticalScroll', 'getStackHeight', 'onAbove', 'onBelow');
    this.setElement(options.el);

    this.watcher = new _Watcher2['default']({
      el: options.el,
      viewport: options.viewport,
      getStackHeight: this.getStackHeight,
      stackPos: options.stackPos
    });

    this.watcher.on('partiallyabove', this.onAbove);
    this.watcher.on('fullyabove', this.onAbove);
    this.watcher.on('fullyvisible', this.onBelow);
    this.watcher.on('fullybelow', this.onBelow);
    this.watcher.on('partiallybelow', this.onBelow);

    if (options.context) {
      _ContextMixin2['default'].prototype.initialize.call(this, options);
    }
  }

  // ES5 extend function

  _createClass(Sticky, [{
    key: 'remove',
    value: function remove() {
      this.watcher.remove();
      this.removeAllListeners();
      if (this.row) {
        this.endStick();
      }
      this.$el.remove();
    }
  }, {
    key: 'setElement',
    value: function setElement(el) {
      this.$el = (0, _jquery2['default'])(el);
      this.el = this.$el[0];
    }
  }, {
    key: 'getStackHeight',
    value: function getStackHeight(scrollEvent) {
      if (this.row) {
        return scrollEvent.stackHeight - this.row.height();
      }
      return scrollEvent.stackHeight;
    }
  }, {
    key: 'createRow',
    value: function createRow(scrollData) {
      this.spaceholder = this.makeSpaceholder(scrollData);
      this.spaceholder.insertAfter(this.el);

      this.$el.detach();
      var row = (0, _jquery2['default'])('<div class="row"></div>');
      row.append(this.el);

      this.orgEl = this.el;
      this.watcher.setElement(this.spaceholder);

      return row;
    }
  }, {
    key: 'makeSpaceholder',
    value: function makeSpaceholder(scrollData) {
      var rect = scrollData.rect;
      var spaceholder = (0, _jquery2['default'])('<div class="sticky-spaceholder"></div>');
      spaceholder.css({
        width: rect.width,
        height: rect.height,
        margin: (0, _jquery2['default'])(this.el).css('margin')
      });
      return spaceholder;
    }
  }, {
    key: 'removeRow',
    value: function removeRow() {
      this.watcher.setElement(this.orgEl);
      this.spaceholder.replaceWith(this.el);
      this.orgEl = null;
      this.row.remove();
    }
  }, {
    key: 'insertRow',
    value: function insertRow(scrollData) {
      this.watcher.viewport.barStack.append(this.row);
    }
  }, {
    key: 'beginStick',
    value: function beginStick(scrollData) {
      var viewport = this.watcher.viewport;
      this.row = this.createRow(scrollData);
      this.insertRow(scrollData);
      viewport.refreshStackHeight(scrollData.scrollEvent);

      viewport.retriggerScrollEvent();
    }
  }, {
    key: 'endStick',
    value: function endStick(scrollData) {
      this.removeRow();
      this.row = null;
      this.stackPos = null;
      this.rowStatus = null;
      this.watcher.viewport.retriggerScrollEvent();
    }
  }, {
    key: 'onAbove',
    value: function onAbove(scrollData, oldPos) {
      if (!this.row) {
        this.beginStick(scrollData);
      }
    }
  }, {
    key: 'onBelow',
    value: function onBelow(scrollData, oldPos) {
      if (this.row) {
        this.endStick(scrollData);
      }
    }
  }]);

  return Sticky;
})((0, _util.mixin)(_events2['default'].EventEmitter, _ContextMixin2['default']));

exports['default'] = Sticky;
Sticky.extend = _util.extend;
module.exports = exports['default'];

},{"./ContextMixin":1,"./Watcher":4,"./util":5,"events":undefined,"jquery":undefined,"underscore":undefined}],4:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _jquery = require('jquery');

var _jquery2 = _interopRequireDefault(_jquery);

var _events = require('events');

var _events2 = _interopRequireDefault(_events);

var _viewport = require('./viewport');

var _util = require('./util');

var idCounter = 0;

var Watcher = (function (_Events$EventEmitter) {
  _inherits(Watcher, _Events$EventEmitter);

  function Watcher(options) {
    _classCallCheck(this, Watcher);

    _get(Object.getPrototypeOf(Watcher.prototype), 'constructor', this).call(this);
    this.id = idCounter;
    idCounter += 1;

    this.$el = (0, _jquery2['default'])(options.el);
    this.el = this.$el[0];
    this.onVerticalScroll = options.onVerticalScroll;
    if (options.getStackHeight) {
      this.getStackHeight = options.getStackHeight;
    }
    this.setViewport(options.viewport || document);

    if (options.stackPos) {
      this.stackPos = options.stackPos;
    }

    _underscore2['default'].bindAll(this, '_onVerticalScroll');
    this.enabled = options.enabled === undefined ? true : options.enabled;
  }

  // ES5 extend function

  _createClass(Watcher, [{
    key: 'remove',
    value: function remove() {
      // Stop receiveng events from the viewport
      this.viewport.removeWatcher(this);
      // Remove all listeners attached to this watcher
      this.removeAllListeners();
    }
  }, {
    key: 'setViewport',
    value: function setViewport(viewportEl) {
      viewportEl = (0, _jquery2['default'])(viewportEl);
      if (this.viewport) {
        this.viewport.removeWatcher(this);
      }
      var viewport = viewportEl.data('viewport');
      if (!viewport) {
        var isDocument = viewportEl[0].nodeType === 9;
        var Viewport = isDocument ? _viewport.DocumentViewport : _viewport.ElementViewport;
        viewport = new Viewport({ el: viewportEl });
        viewportEl.data('viewport', viewport);
      }
      viewport.addWatcher(this);
      this.viewport = viewport;
    }
  }, {
    key: 'setElement',
    value: function setElement(el) {
      this.$el = (0, _jquery2['default'])(el);
      this.el = this.$el[0];
    }
  }, {
    key: 'getRect',
    value: function getRect(scrollEvent) {
      return (0, _util.getRelativeRect)(this.el, scrollEvent);
    }
  }, {
    key: 'getStackHeight',
    value: function getStackHeight(scrollEvent) {
      return scrollEvent.stackHeight;
    }
  }, {
    key: '_onHorizontalScroll',
    value: function _onHorizontalScroll(scrollEvent) {
      var scrollData = {
        scrollEvent: scrollEvent
      };
      this.emit('horizontalscroll', scrollData);
    }
  }, {
    key: '_onVerticalScroll',
    value: function _onVerticalScroll(scrollEvent) {
      if (!this.enabled) {
        return;
      }

      // Make "rect" of this.el relative to viewport
      var rect = this.getRect(scrollEvent);

      var fakeStackHeight = this.getStackHeight(scrollEvent, rect);
      var bottomToFloor = scrollEvent.viewportHeight - rect.bottom;
      var bottomToStack = rect.bottom - scrollEvent.stackHeight;
      var topToStack = rect.top - fakeStackHeight;
      var viewportHeight = scrollEvent.viewportHeight - fakeStackHeight;

      var position;
      if (rect.top > scrollEvent.viewportHeight) {
        position = 'fullybelow';
      } else if (bottomToFloor >= 0 && topToStack >= 0 && bottomToStack >= 0) {
        position = 'fullyvisible';
      } else if (bottomToStack <= 0) {
        position = 'fullyabove';
      } else if (bottomToFloor < 0 && topToStack >= 0) {
        position = 'partiallybelow';
      } else if (bottomToFloor >= 0 && topToStack < 0) {
        position = 'partiallyabove';
      } else if (bottomToFloor < 0 && topToStack < 0) {
        position = 'aboveandbelow';
      } else {
        throw new Error('Invalid sticky scroll position');
      }

      var oldPosition = this.position;

      var scrollData = {
        scrollEvent: scrollEvent,
        stackHeight: scrollEvent.stackHeight,
        viewportHeight: viewportHeight,
        rect: rect,
        topToStack: topToStack,
        bottomToStack: bottomToStack,
        bottomToFloor: bottomToFloor,
        position: position
      };
      this.position = position;

      if (oldPosition != position) {
        // Trigger an event when the position changes
        this.emit(position, scrollData, oldPosition);
      }

      this.emit('verticalscroll', scrollData);
    }
  }]);

  return Watcher;
})(_events2['default'].EventEmitter);

exports['default'] = Watcher;
Watcher.extend = _util.extend;
module.exports = exports['default'];

},{"./util":5,"./viewport":6,"events":undefined,"jquery":undefined,"underscore":undefined}],5:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

exports.extend = extend;
exports.mixin = mixin;
exports.getRelativeRect = getRelativeRect;
exports.cloneRect = cloneRect;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _jquery = require('jquery');

var _jquery2 = _interopRequireDefault(_jquery);

function extend(protoProps) {
  var parent = this;
  var child;

  // The constructor function for the new subclass is either defined by you
  // (the "constructor" property in your `extend` definition), or defaulted
  // by us to simply call the parent's constructor.
  if (protoProps && _.has(protoProps, 'constructor')) {
    child = protoProps.constructor;
  } else {
    child = function () {
      return parent.apply(this, arguments);
    };
  }

  // Set the prototype chain to inherit from `parent`, without calling
  // `parent`'s constructor function.
  child.prototype = Object.create(parent.prototype);

  // Add prototype properties (instance properties) to the subclass,
  // if supplied.
  if (protoProps) _.extend(child.prototype, protoProps);

  return child;
}

function mixin(Parent, Mixin) {
  Mixin = Mixin.prototype;

  var Mixed = (function (_Parent) {
    _inherits(Mixed, _Parent);

    function Mixed() {
      _classCallCheck(this, Mixed);

      _get(Object.getPrototypeOf(Mixed.prototype), 'constructor', this).apply(this, arguments);
    }

    return Mixed;
  })(Parent);

  Object.getOwnPropertyNames(Mixin).forEach(function (name) {
    if (name !== "constructor") {
      Object.defineProperty(Mixed.prototype, name, Object.getOwnPropertyDescriptor(Mixin, name));
    }
  });

  return Mixed;
}

function getRelativeRect(el, scrollEvent) {
  var rect = cloneRect(el.getBoundingClientRect());
  rect.top -= scrollEvent.viewportRect.top;
  rect.bottom = rect.top + rect.height;
  rect.left -= scrollEvent.viewportRect.left;
  return rect;
}

function cloneRect(rect) {
  return {
    bottom: rect.bottom,
    height: rect.height,
    left: rect.left,
    right: rect.right,
    top: rect.top,
    width: rect.width
  };
}

var ScrollEvent = (function () {
  function ScrollEvent(config) {
    _classCallCheck(this, ScrollEvent);

    this._mutated = [];

    this.direction = config.direction;
    this.viewportWidth = config.viewportWidth;
    this.viewportHeight = config.viewportHeight;
    this.viewportRect = config.viewportRect;
    this.stackHeight = config.stackHeight;
    this.scrollTop = config.scrollTop;
    this.scrollLeft = config.scrollLeft;
    this.scrollWidth = config.scrollWidth;
    this.e = config.e;
  }

  _createClass(ScrollEvent, [{
    key: 'hasMutated',
    value: function hasMutated(cid) {
      return this._mutated.indexOf(cid) !== -1;
    }
  }, {
    key: 'addMutated',
    value: function addMutated(cid) {
      this._mutated.push(cid);
    }
  }]);

  return ScrollEvent;
})();

exports.ScrollEvent = ScrollEvent;

},{"jquery":undefined}],6:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _jquery = require('jquery');

var _jquery2 = _interopRequireDefault(_jquery);

var _util = require('./util');

var _events = require('events');

var _events2 = _interopRequireDefault(_events);

function skipDisabled(watcher) {
  return watcher.enabled;
}

var AbstractViewport = (function (_Events$EventEmitter) {
  _inherits(AbstractViewport, _Events$EventEmitter);

  function AbstractViewport() {
    _classCallCheck(this, AbstractViewport);

    _get(Object.getPrototypeOf(AbstractViewport.prototype), 'constructor', this).call(this);
    this.watchers = [];
  }

  _createClass(AbstractViewport, [{
    key: 'triggerNewScrollEvent',
    value: function triggerNewScrollEvent() {
      // Create and dispatch a new scroll event artificially
      // Reuse the same browser event
      this.onScroll(this.scrollEvent.e);
    }
  }, {
    key: 'broadcastScrollEvent',
    value: function broadcastScrollEvent(scrollEvent) {
      var _this = this;

      if (scrollEvent.direction === 'up') {
        this.watchers.filter(function (watcher) {
          return watcher.enabled;
        }).sort(function (a, b) {
          return b.stackPos - a.stackPos;
        }).forEach(function (watcher) {
          return _this.triggerOne(watcher, scrollEvent);
        });
      } else {
        this.watchers.filter(function (watcher) {
          return watcher.enabled;
        }).sort(function (a, b) {
          return a.stackPos - b.stackPos;
        }).forEach(function (watcher) {
          return _this.triggerOne(watcher, scrollEvent);
        });
      }
    }
  }, {
    key: 'addWatcher',
    value: function addWatcher(watcher) {
      // console.log('Adding a new watcher: ', watcher);
      if (watcher.stackPos === undefined) {
        watcher.stackPos = this.watchers.length;
      }
      this.watchers.push(watcher);
    }
  }, {
    key: 'removeWatcher',
    value: function removeWatcher(watcher) {
      var index = this.watchers.indexOf(watcher);
      if (index !== -1) {
        this.watchers.splice(index, 1);
      }
    }
  }, {
    key: 'triggerOne',
    value: function triggerOne(watcher, scrollEvent) {

      if (!scrollEvent.hasMutated(watcher.id)) {
        scrollEvent.addMutated(watcher.id);

        var direction = scrollEvent.direction;
        if (direction == 'up' || direction == 'down') {
          watcher._onVerticalScroll(scrollEvent);
        } else {
          watcher._onHorizontalScroll(scrollEvent);
        }
      }
    }
  }, {
    key: 'retriggerScrollEvent',
    value: function retriggerScrollEvent() {
      // TODO: ..well, retrigger is only necessary if stackheight has changed

      // Update the scrollHeight and dispatch scrollEvent
      if (this.scrollEvent) {
        this.scrollEvent.stackHeight = this.barStack[0].getBoundingClientRect().height;
        this.broadcastScrollEvent(this.scrollEvent);
      }
    }
  }, {
    key: 'refreshStackHeight',
    value: function refreshStackHeight(scrollEvent) {
      scrollEvent.stackHeight = this.barStack[0].getBoundingClientRect().height;
    }
  }, {
    key: 'getScrollDirection',
    value: function getScrollDirection(scrollLeft, scrollTop) {
      // Get scroll direction
      var direction = null;
      if (this.scrollEvent) {
        var prevScrollLeft = this.scrollEvent.scrollLeft;
        var prevScrollTop = this.scrollEvent.scrollTop;

        if (scrollLeft != prevScrollLeft) {
          direction = scrollLeft > prevScrollLeft ? 'right' : 'left';
        } else {
          direction = scrollTop > prevScrollTop ? 'down' : 'up';
        }
      }
      return direction;
    }
  }, {
    key: 'onScroll',
    value: function onScroll(e) {
      var scrollEvent = this.createScrollEvent(e);

      // Keep a reference to the most recent scroll event
      this.scrollEvent = scrollEvent;
      this.broadcastScrollEvent(scrollEvent);
    }
  }]);

  return AbstractViewport;
})(_events2['default'].EventEmitter);

var DocumentViewport = (function (_AbstractViewport) {
  _inherits(DocumentViewport, _AbstractViewport);

  function DocumentViewport(config) {
    _classCallCheck(this, DocumentViewport);

    _get(Object.getPrototypeOf(DocumentViewport.prototype), 'constructor', this).call(this);
    this.el = document;
    this.$el = (0, _jquery2['default'])(document);

    this.groups = {};
    this.stack = (0, _jquery2['default'])('<div class="stickystack fixed"><div class="bar-stack"></div><div class="inline-stack"></div></div>');
    this.barStack = this.stack.find('>.bar-stack');
    this.inlineStack = this.stack.find('>.inline-stack');
    this.el.body.insertBefore(this.stack[0], this.el.body.firstChild);
    this.scrollEvent = this.createScrollEvent(); // this.$el.on('scroll', _.throttle(this.onScroll, 5).bind(this));
    this.$el.on('scroll', this.onScroll.bind(this));
  }

  _createClass(DocumentViewport, [{
    key: 'createScrollEvent',
    value: function createScrollEvent(e) {
      var scrollTop = this.el.body.scrollTop || this.el.documentElement.scrollTop || 0;
      var scrollLeft = this.el.body.scrollLeft || this.el.documentElement.scrollLeft || 0;

      return new _util.ScrollEvent({
        direction: this.getScrollDirection(scrollLeft, scrollTop),
        viewportWidth: (0, _jquery2['default'])(window).width(), //window.innerWidth,
        viewportHeight: (0, _jquery2['default'])(window).height(), //window.innerHeight,
        viewportRect: {
          top: 0,
          left: 0
        },
        scrollWidth: this.el.body.scrollWidth,
        scrollTop: scrollTop,
        scrollLeft: scrollLeft,
        stackHeight: this.barStack[0].getBoundingClientRect().height,
        e: e
      });
    }
  }]);

  return DocumentViewport;
})(AbstractViewport);

exports.DocumentViewport = DocumentViewport;

var ElementViewport = (function (_AbstractViewport2) {
  _inherits(ElementViewport, _AbstractViewport2);

  function ElementViewport(config) {
    _classCallCheck(this, ElementViewport);

    _get(Object.getPrototypeOf(ElementViewport.prototype), 'constructor', this).call(this);
    this.$el = (0, _jquery2['default'])(config.el);
    this.el = this.$el[0];

    this.groups = {};
    this.stack = (0, _jquery2['default'])('<div class="stickystack absolute"><div class="bar-stack"></div><div class="inline-stack"></div></div>');
    this.barStack = this.stack.find('>.bar-stack');
    this.inlineStack = this.stack.find('>.inline-stack');
    this.el.insertBefore(this.stack[0], this.el.firstChild);
    this.scrollEvent = this.createScrollEvent();
    this.$el.on('scroll', this.onScroll.bind(this));
  }

  _createClass(ElementViewport, [{
    key: 'createScrollEvent',
    value: function createScrollEvent(e) {
      var scrollTop = this.el.scrollTop;
      var scrollLeft = this.el.scrollLeft;
      var rect = this.el.getBoundingClientRect();

      return new _util.ScrollEvent({
        direction: this.getScrollDirection(scrollLeft, scrollTop),
        viewportWidth: rect.width,
        viewportHeight: rect.height,
        viewportRect: rect,
        scrollWidth: this.el.scrollWidth,
        scrollHeight: this.el.scrollHeight,
        scrollTop: scrollTop,
        scrollLeft: scrollLeft,
        stackHeight: this.barStack[0].getBoundingClientRect().height,
        e: e
      });
    }
  }, {
    key: 'onScroll',
    value: function onScroll(e) {
      this.stack.css('top', this.el.scrollTop);
      // this.stack.css('left', this.el.scrollLeft);
      _get(Object.getPrototypeOf(ElementViewport.prototype), 'onScroll', this).call(this, e);
    }
  }]);

  return ElementViewport;
})(AbstractViewport);

exports.ElementViewport = ElementViewport;

},{"./util":5,"events":undefined,"jquery":undefined}],7:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _stickyElementsSticky = require('./sticky-elements/Sticky');

var _stickyElementsSticky2 = _interopRequireDefault(_stickyElementsSticky);

var _stickyElementsHorizontallyFixed = require('./sticky-elements/HorizontallyFixed');

var _stickyElementsHorizontallyFixed2 = _interopRequireDefault(_stickyElementsHorizontallyFixed);

var _stickyElementsContextMixin = require('./sticky-elements/ContextMixin');

var _stickyElementsContextMixin2 = _interopRequireDefault(_stickyElementsContextMixin);

var _stickyElementsWatcher = require('./sticky-elements/Watcher');

var _stickyElementsWatcher2 = _interopRequireDefault(_stickyElementsWatcher);

exports['default'] = {
  Sticky: _stickyElementsSticky2['default'],
  HorizontallyFixed: _stickyElementsHorizontallyFixed2['default'],
  ContextMixin: _stickyElementsContextMixin2['default'],
  Watcher: _stickyElementsWatcher2['default']
};
module.exports = exports['default'];

},{"./sticky-elements/ContextMixin":1,"./sticky-elements/HorizontallyFixed":2,"./sticky-elements/Sticky":3,"./sticky-elements/Watcher":4}]},{},[7])(7)
});