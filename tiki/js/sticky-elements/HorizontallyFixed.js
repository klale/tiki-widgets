// ES6
// import _ from 'underscore';
// import Watcher from './Watcher';


// ES5
define([
    'underscore',
    './Watcher',
], function(_, Watcher) {
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

    this.setViewport(options.viewport || document);

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
    this.orgStyles = {
      position: this.$el.css('position'),
      left: this.$el.css('left'),
      right: this.$el.css('right'),
      top: 'auto'
    };

    var left = this.$el.offset().left - scrollData.scrollEvent.scrollLeft;
    if (left < 10) {
      left = 0;
    }
    this.$el.css({
      position: 'fixed',
      left: left,
      width: rect.width,
      top: rect.top
    });
    this.spaceholder.insertAfter(this.el);
    this.isFixed = true;
  },
  unfix: function(scrollData) {
    this.$el.css(this.orgStyles);
    this.spaceholder.remove();

    var scrollEvent = scrollData.scrollEvent;
    var rect = this.getRect(scrollEvent);
    var maxLeftAllowed = scrollEvent.scrollWidth - rect.width;

    var left = Math.min(scrollEvent.scrollLeft, maxLeftAllowed);
    left = Math.max(0, left);
    this.$el.css('left', left);

    this.isFixed = false;
  },

  onVerticalScroll2: function(scrollData) {
    if (this.isFixed  && !this.$el.hasClass('is-cloned')) {
      this.unfix(scrollData);
    }
  },
  onHorizontalScroll: function(scrollData) {
    if (!this.isFixed && !this.$el.hasClass('is-cloned')) {
      this.fix(scrollData);
    }
  }
});


return HorizontallyFixed;



});