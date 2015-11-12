// ES6
// import _ from 'underscore';
// import $ from 'jquery';
// import Events from 'events';

// import ContextMixin from './ContextMixin'
// import Watcher from './Watcher';
// import { mixin, extend } from './util';



// ES5
define([
    'jquery',
    'underscore',
    'tiki/tools',
    './ContextMixin',
    './Watcher',
], function($, _, Tools, ContextMixin, Watcher) {
'use strict';


// ES6
// export default class Sticky extends mixin(Events.EventEmitter, ContextMixin) {

// ES5
var Sticky = Tools.View.extend('Sticky', {
  // ES5
  mixins: [ContextMixin],

  // ES6
  // constructor(options) {
  //   super();

  // ES5
  initialize: function(options) {

    _.bindAll(this, 'getStackHeight', 'onAbove', 'onBelow', 'onFixedHorizontalScroll', 'onFixedVerticalScroll');

    // ES6
    // this.setElement(options.el);

    this.fixLeftAt = options.fixLeftAt || 0;

    this.watcher = new Watcher({
      el: options.el,
      viewport: options.viewport,
      getStackHeight: this.getStackHeight,
      stackPos: options.stackPos,
      enabled: options.enabled === undefined ? true : options.enabled
    });

    this.horizontallyFixed = options.horizontallyFixed;

    this.watcher.on('partiallyabove', this.onAbove);
    this.watcher.on('fullyabove', this.onAbove);
    this.watcher.on('fullyvisible', this.onBelow);
    this.watcher.on('fullybelow', this.onBelow);
    this.watcher.on('partiallybelow', this.onBelow);

    if (options.context) {
      // ES6
      // ContextMixin.prototype.initialize.call(this, options);
      ContextMixin.initialize.call(this, options);
    }

    if (this.horizontallyFixed) {
      this.unfixDebounce = _.debounce(function() {
        this.unfix(this.prevScrollData);
      }.bind(this), 1000);

      this.watcher.on('horizontalscroll', this.onFixedHorizontalScroll);
      this.watcher.on('verticalscroll', this.onFixedVerticalScroll);
    }
  },

  remove: function() {
    this.watcher.remove();

    // ES6
    // this.removeAllListeners();

    if (this.row) {
      this.endStick();
    }

    // ES5
    Sticky.__super__.remove.call(this);

    // ES6
    // this.$el.remove();
  },

  // ES5
  // setElement(el) {
  //   this.$el = $(el);
  //   this.el = this.$el[0];
  // }

  getStackHeight: function(scrollEvent) {
    if (this.row) {
      return scrollEvent.stackHeight - this.row.height();
    }
    return scrollEvent.stackHeight;
  },


  createRow: function(scrollData) {
    this.spaceholder = this.makeSpaceholder(scrollData);
    this.spaceholder.insertAfter(this.el);

    this.$el.detach();
    var row = $('<div class="row"></div>');
    row.append(this.el);

    this.orgEl = this.el;
    this.watcher.setElement(this.spaceholder);

    return row;
  },

  makeSpaceholder: function(scrollData) {
    var rect = scrollData.rect;
    var spaceholder = $('<div class="sticky-spaceholder"></div>');
    spaceholder.css({
        width: rect.width,
        height: rect.height,
        margin: $(this.el).css('margin'),
    });
    return spaceholder;
  },

  removeRow: function(scrollData) {
    this.watcher.setElement(this.orgEl);
    this.spaceholder.replaceWith(this.el);
    this.orgEl = null;
    this.row.remove();

    if (this.horizontallyFixed && scrollData && scrollData.scrollEvent) {
      this.$el.css('left', scrollData.scrollEvent.scrollLeft);
    }

  },

  insertRow: function(scrollData) {
    this.watcher.viewport.barStack.append(this.row);
  },

  beginStick: function(scrollData) {
    var viewport = this.watcher.viewport;
    this.row = this.createRow(scrollData);
    this.insertRow(scrollData);
    viewport.refreshStackHeight(scrollData.scrollEvent);

    viewport.retriggerScrollEvent();
    this.trigger('beginstick', {scrollData: scrollData});
  },

  endStick: function(scrollData) {
    this.removeRow(scrollData);
    this.row = null;
    this.stackPos = null;
    this.rowStatus = null;
    this.watcher.viewport.retriggerScrollEvent();
    this.trigger('endstick', {scrollData: scrollData});
  },

  enable: function() {
    this.watcher.enabled = true;
  },

  disable: function() {
    this.watcher.enabled = false;
    if (this.row) {
      this.endStick();
    }
  },

  onAbove: function(scrollData, oldPos) {
    if (!this.row) {
      this.beginStick(scrollData);
    }
  },

  onBelow: function(scrollData, oldPos) {
    if (this.row) {
      this.endStick(scrollData);
    }
  },


  // ----------------- Horizontally sticky --------------------
  getFixStyles: function() {
    var rect = this.el.getBoundingClientRect();
    return {
      position: 'fixed',
      left: this.fixLeftAt,
      width: rect.width,
      top: rect.top
    }
  },
  fix: function(scrollData) {
    // create a spaceholder
    this.spaceholder2 = $('<div></div>');
    this.spaceholder2.css({
      width: this.$el.outerWidth(true),
      height: this.$el.outerHeight(true)
    });

    this.orgStyles = this.$el.attr('style') || '';

    this.$el.css(this.getFixStyles());
    this.$el.addClass('fixed');
    this.spaceholder2.insertAfter(this.el);

    this.isFixed = true;
  },
  unfix: function(scrollData) {
    this.$el.attr('style', this.orgStyles);
    this.spaceholder2.remove();

    var scrollEvent = scrollData.scrollEvent;
    var rect = this.watcher.getRect(scrollEvent);
    var maxLeftAllowed = scrollEvent.scrollWidth - rect.width;

    var left = Math.min(scrollEvent.scrollLeft, maxLeftAllowed);
    left = Math.max(0, left);
    this.$el.css('left', left);
    this.$el.removeClass('fixed');

    this.isFixed = false;
  },
  onFixedHorizontalScroll: function(scrollData) {
    this.prevScrollData = scrollData;
    if (!this.isFixed && !this.row && !scrollData.scrollEvent.isArtificial) {
      this.fix(scrollData);
    }

    if (this.isFixed) {
      this.unfixDebounce();
    }
  },
  onFixedVerticalScroll: function(scrollData) {
    this.prevScrollData = scrollData;
    if (this.isFixed && !scrollData.scrollEvent.isArtificial) {
      this.unfix(scrollData);
    }
  },
});

// ES6
// // ES5 extend function
// Sticky.extend = extend;

// ES5
return Sticky;


});
