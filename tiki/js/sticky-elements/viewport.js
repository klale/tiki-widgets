// ES6
// import $ from 'jquery';
// import { ScrollEvent } from './util';
// import Events from 'events';



// ES5
define([
    'jquery',
    'tiki/tools',
    './util'
], function($, Tools, StickyUtils) {
    'use strict';

var ScrollEvent = StickyUtils.ScrollEvent;


var exp = {};
// class AbstractViewport extends Events.EventEmitter {

var AbstractViewport = Tools.View.extend({

  // ES6
  // constructor() {
  initialize: function() {
    // ES6
    // super();
    this.watchers = [];
  },

  triggerNewScrollEvent: function() {
    // Create and dispatch a new scroll event artificially
    // Reuse the same browser event
    this.onScroll(this.scrollEvent.e, {isArtificial: true});
  },

  recalculateAll: function() {
    // ES5
    this.watchers
      .filter(function(watcher) { return watcher.enabled; })
      .sort(function(a, b) { return b.stackPos - a.stackPos; })
      .forEach(function(watcher) { watcher.trigger('recalculate', this.scrollEvent); }.bind(this));
  },

  broadcastScrollEvent: function(scrollEvent) {
    var directions = scrollEvent.directions || [];
    var verticalDirection = directions[1];

    if (verticalDirection === 'up') {
      // ES6
      // this.watchers
      // .filter(watcher => watcher.enabled)
      // .sort((a, b) => b.stackPos - a.stackPos)
      // .forEach(watcher => this.triggerOne(watcher, scrollEvent));

      // ES5
      this.watchers
      .filter(function(watcher) { return watcher.enabled; })
      .sort(function(a, b) { return b.stackPos - a.stackPos; })
      .forEach(function(watcher) { this.triggerOne(watcher, scrollEvent); }.bind(this));
    }
    else { // Horizontal stacking is not yet supported
      // ES6
      // this.watchers
      // .filter(watcher => watcher.enabled)
      // .sort((a, b) => a.stackPos - b.stackPos)
      // .forEach(watcher => this.triggerOne(watcher, scrollEvent));

      // ES5
      this.watchers
      .filter(function(watcher) { return watcher.enabled; })
      .sort(function(a, b) { return a.stackPos - b.stackPos; })
      .forEach(function(watcher) { this.triggerOne(watcher, scrollEvent); }.bind(this));
    }
  },

  addWatcher: function(watcher) {
    if (watcher.stackPos === undefined) {
      watcher.stackPos = this.watchers.length;
    }
    this.watchers.push(watcher);
  },

  removeWatcher: function(watcher) {
    var index = this.watchers.indexOf(watcher);
    if (index !== -1) {
      this.watchers.splice(index, 1);
    }
  },

  triggerOne: function(watcher, scrollEvent) {

    if (!scrollEvent.hasMutated(watcher.id)) {
      scrollEvent.addMutated(watcher.id);

      var directions = scrollEvent.directions || [];
      var horizontalDirection = directions[0];
      var verticalDirection = directions[1];

      if (scrollEvent.isArtificial) {
        // For scroll events triggered manually by calling triggerNewScrollEvent,
        // fire a "verticalscroll" event to keep the original behavior.
        watcher._onVerticalScroll(scrollEvent);
        return;
      }

      if (horizontalDirection) {
        watcher._onHorizontalScroll(scrollEvent);
      }

      if (verticalDirection) {
        watcher._onVerticalScroll(scrollEvent);
      }
    }
  },

  retriggerScrollEvent: function() {
    // TODO: ..well, retrigger is only necessary if stackheight has changed

    // Update the scrollHeight and dispatch scrollEvent
    if (this.scrollEvent) {
      this.scrollEvent.stackHeight = this.barStack[0].getBoundingClientRect().height;
      this.broadcastScrollEvent(this.scrollEvent);
    }
  },

  refreshStackHeight: function(scrollEvent) {
    scrollEvent.stackHeight = this.barStack[0].getBoundingClientRect().height;
  },

  getScrollDirection: function(scrollLeft, scrollTop) {
    // Get scroll direction
    var direction = null;
    if (this.scrollEvent) {
      var prevScrollLeft = this.scrollEvent.scrollLeft;
      var prevScrollTop = this.scrollEvent.scrollTop;

      if (scrollLeft != prevScrollLeft) {
        direction = scrollLeft > prevScrollLeft ? 'right' : 'left';
      }
      else {
        direction = scrollTop > prevScrollTop ? 'down' : 'up';
      }
    }
    return direction;
  },

  getScrollDirections: function(scrollLeft, scrollTop) {
    // Get scroll direction
    var horizontalDirection = null;
    var verticalDirection = null;
    if (this.scrollEvent) {
      var prevScrollLeft = this.scrollEvent.scrollLeft;
      var prevScrollTop = this.scrollEvent.scrollTop;

      if (scrollLeft != prevScrollLeft) {
        horizontalDirection = scrollLeft > prevScrollLeft ? 'right' : 'left';
      }
      if (scrollTop != prevScrollTop) {
        verticalDirection = scrollTop > prevScrollTop ? 'down' : 'up';
      }
    }
    return [horizontalDirection, verticalDirection];
  },


  onScroll: function(e, options) {
    options = options || {};

    var scrollEvent = this.createScrollEvent(e, options);

    // Keep a reference to the most recent scroll event
    this.scrollEvent = scrollEvent;
    this.broadcastScrollEvent(scrollEvent);
  }
});  // ES5

// ES6
// export class DocumentViewport extends AbstractViewport {
var DocumentViewport = AbstractViewport.extend('DocumentViewport', {

  // constructor(config) {
  //   super();
  //   this.el = document;
  //   this.$el = $(document);

  initialize: function(config) {
    // ES5
    DocumentViewport.__super__.initialize.call(this, config);


    this.groups = {};
    this.stack = $('<div class="stickystack fixed"><div class="bar-stack"></div><div class="inline-stack"></div></div>');
    this.barStack = this.stack.find('>.bar-stack');
    this.inlineStack = this.stack.find('>.inline-stack');
    this.el.body.insertBefore(this.stack[0], this.el.body.firstChild);
    this.scrollEvent = this.createScrollEvent(null, {isArtificial: true});      // this.$el.on('scroll', _.throttle(this.onScroll, 5).bind(this));
    // this.$el.on('scroll', _.throttle(this.onScroll, 10).bind(this));
    this.$el.on('scroll', this.onScroll.bind(this));
  },

  createScrollEvent: function(e, options) {
    options = options || {};
    var scrollTop = this.el.body.scrollTop || this.el.documentElement.scrollTop || 0;
    var scrollLeft = this.el.body.scrollLeft || this.el.documentElement.scrollLeft || 0;

    return new ScrollEvent({

      direction: this.getScrollDirection(scrollLeft, scrollTop),
      directions: this.getScrollDirections(scrollLeft, scrollTop),
      isArtificial: !!options.isArtificial,
      viewportWidth: $(window).width(), //window.innerWidth,
      viewportHeight: $(window).height(), //window.innerHeight,
      viewportRect: {
          top: 0,
          left: 0
      },
      scrollWidth: this.el.body.scrollWidth,
      scrollHeight: this.el.body.scrollHeight,
      scrollTop: scrollTop,
      scrollLeft: scrollLeft,
      stackHeight: this.barStack[0].getBoundingClientRect().height,
      e: e
    });
  }
}); // ES5


// ES6
// export class ElementViewport extends AbstractViewport {
var ElementViewport = AbstractViewport.extend('ElementViewport', {
  // ES6
  // constructor(config) {
  initialize: function(config) {
    // ES5
    ElementViewport.__super__.initialize.call(this, config);

    // ES6
    // super();
    // this.$el = $(config.el);
    // this.el = this.$el[0];

    this.groups = {};
    this.stack = $('<div class="stickystack absolute"><div class="bar-stack"></div><div class="inline-stack"></div></div>');
    this.barStack = this.stack.find('>.bar-stack');
    this.inlineStack = this.stack.find('>.inline-stack');
    this.el.insertBefore(this.stack[0], this.el.firstChild);
    this.scrollEvent = this.createScrollEvent(null, {isArtificial: true});
    this.$el.on('scroll', this.onScroll.bind(this));
  },


  createScrollEvent: function(e, options) {
    options = options || {};
    var scrollTop = this.el.scrollTop;
    var scrollLeft = this.el.scrollLeft;
    var rect = this.el.getBoundingClientRect();


    return new ScrollEvent({
      direction: this.getScrollDirection(scrollLeft, scrollTop),
      directions: this.getScrollDirections(scrollLeft, scrollTop),
      isArtificial: !!options.isArtificial,
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
  },

  onScroll: function(e) {
    this.stack.css('top', this.el.scrollTop);
    // this.stack.css('left', this.el.scrollLeft);

    // ES6
    // super.onScroll(e);

    // ES5
    ElementViewport.__super__.onScroll.call(this, e);
  }
});

// ES5
return {
  ElementViewport: ElementViewport,
  DocumentViewport: DocumentViewport
}


});


