// ES6
// import _ from 'underscore';
// import Watcher from './Watcher';


// ES5
define([
    'jquery',
    'underscore',
    './Watcher',
], function($, _, Watcher) {
'use strict';


// ES6
// export default class HorizontallyFixed extends Watcher {
var HorizontallyFixed = Watcher.extend('HorizontallyFixed', {

  // ES6
  // constructor(options) {
  //   super(options);
  initialize: function(options) {
    HorizontallyFixed.__super__.initialize.call(this, options);
    _.bindAll(this, 'onHorizontalScroll', 'onVerticalScroll2');

    this.fixLeftAt = options.fixLeftAt || 0;
    this.setViewport(options.viewport || document);

    this.unfixDebounce = _.debounce(function() {
      this.unfix(this.prevScrollData);
    }.bind(this), 1000);

    this.on('horizontalscroll', this.onHorizontalScroll);
    this.on('verticalscroll', this.onVerticalScroll2);
  },

  fix: function(scrollData) {
    // create a spaceholder
    var rect = this.el.getBoundingClientRect();
    this.spaceholder = $('<div></div>');
    this.spaceholder.css({
      width: rect.width,
      height: rect.height,
      margin: this.$el.css('margin')
    });
    // this.$el.replaceWith(this.spaceholder);
    // Get all inline styles
    this.orgStyles = this.$el.attr('style') || '';

    this.$el.css({
      position: 'fixed',
      left: this.fixLeftAt,
      width: rect.width,
      top: rect.top
    });
    this.$el.addClass('fixed');
    this.spaceholder.insertAfter(this.el);
    this.isFixed = true;
  },
  unfix: function(scrollData) {
    // this.$el.css(this.orgStyles);
    this.$el.attr('style', this.orgStyles);

    this.spaceholder.remove();

    var scrollEvent = scrollData.scrollEvent;
    var rect = this.getRect(scrollEvent);
    var maxLeftAllowed = scrollEvent.scrollWidth - rect.width;

    var left = Math.min(scrollEvent.scrollLeft, maxLeftAllowed);
    left = Math.max(0, left);
    this.$el.css('left', left);
    this.$el.removeClass('fixed');

    this.isFixed = false;
  },

  onVerticalScroll2: function(scrollData) {
    this.prevScrollData = scrollData;
    if (this.isFixed) {
      this.unfix(scrollData);
    }
  },
  onHorizontalScroll: function(scrollData) {
    this.prevScrollData = scrollData;
    if (!this.isFixed && !this.$el.hasClass('is-cloned')) {
      this.fix(scrollData);
    }

    if (this.isFixed) {
      this.unfixDebounce();
    }
  }
});


return HorizontallyFixed;



});