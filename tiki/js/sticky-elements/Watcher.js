// ES6
// import _ from 'underscore';
// import $ from 'jquery';
// import Events from 'events';
// import { ElementViewport, DocumentViewport }  from './viewport';
// import { getRelativeRect, extend } from './util';



// ES5
define([
    'jquery',
    'underscore',
    'backbone',
    'tiki/tools',
    './viewport',
    './util'
], function($, _, Backbone, Tools, Viewport, StickyUtils) {
    'use strict';

var idCounter = 0;

// ES5
var ElementViewport = Viewport.ElementViewport;
var DocumentViewport = Viewport.DocumentViewport;
var getRelativeRect = StickyUtils.getRelativeRect;
var extend = StickyUtils.extend;


/// export default class Watcher extends Events.EventEmitter {
var Watcher = Tools.View.extend('Watcher', {

  /// constructor(options) {
  initialize: function(options) {
    // ES6
    /// super();

    this.id = idCounter;
    idCounter += 1;

    // ES6
    // this.$el = $(options.el);
    // this.el = this.$el[0];

    this.onVerticalScroll = options.onVerticalScroll;
    if (options.getStackHeight) {
      this.getStackHeight = options.getStackHeight;
    }
    this.setViewport(options.viewport || document);

    if (options.stackPos) {
      this.stackPos = options.stackPos;
    }

    _.bindAll(this, '_onVerticalScroll');
    this.enabled = options.enabled === undefined ? true : options.enabled;
  },

  remove: function() {
    // Stop receiveng events from the viewport
    this.viewport.removeWatcher(this);

    // ES6 removed
    // // Remove all listeners attached to this watcher
    // this.removeAllListeners();

    // ES5 added
    Watcher.__super__.remove.call(this);
  },

  setViewport: function(viewportEl) {
    viewportEl = $(viewportEl);
    if (this.viewport) {
      this.viewport.removeWatcher(this);
    }
    var viewport = viewportEl.data('viewport');
    if (!viewport) {
      var isDocument = viewportEl[0].nodeType === 9;
      var Viewport = isDocument ? DocumentViewport : ElementViewport;
      viewport = new Viewport({el: viewportEl});
      viewportEl.data('viewport', viewport);
    }
    viewport.addWatcher(this);
    this.viewport = viewport;
  },

  // ES6 removed
  // setElement(el) {
  //   this.$el = $(el);
  //   this.el = this.$el[0];
  // }

  getRect: function(scrollEvent) {
    return getRelativeRect(this.el, scrollEvent);
  },

  getStackHeight: function(scrollEvent) {
    return scrollEvent.stackHeight;
  },

  _onHorizontalScroll: function(scrollEvent) {
    var scrollData = {
      scrollEvent: scrollEvent
    }
    // ES6
    // this.emit('horizontalscroll', scrollData);

    // ES5
    this.trigger('horizontalscroll', scrollData);
  },


  _onVerticalScroll: function(scrollEvent) {
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
    }
    else if (bottomToFloor >= 0 && topToStack >= 0 && bottomToStack >= 0) {
      position = 'fullyvisible';
    }
    else if (bottomToStack <= 0) {
      position = 'fullyabove';
    }
    else if (bottomToFloor < 0 && topToStack >= 0) {
      position = 'partiallybelow';
    }
    else if (bottomToFloor >= 0 && topToStack < 0) {
      position = 'partiallyabove';
    }
    else if (bottomToFloor < 0 && topToStack < 0) {
      position = 'aboveandbelow';
    }
    else {
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
      // ES6
      // this.emit(position, scrollData, oldPosition);

      // ES5
      this.trigger(position, scrollData, oldPosition);
    }

    // ES6
    // this.emit('verticalscroll', scrollData);

    // ES5
    this.trigger('verticalscroll', scrollData);
  }

});

// ES5
return Watcher;

});

// ES6
// // ES5 extend function
// Watcher.extend = extend;

