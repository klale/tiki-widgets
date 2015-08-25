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
    _.bindAll(this, 'onHorizontalScroll');

    this.setViewport(options.viewport || document);

    this.on('horizontalscroll', this.onHorizontalScroll);
  },


  onHorizontalScroll: function(scrollData) {
    var scrollEvent = scrollData.scrollEvent;
    var rect = this.getRect(scrollEvent);
    var maxLeftAllowed = scrollEvent.scrollWidth - rect.width;

    var left = Math.min(scrollEvent.scrollLeft, maxLeftAllowed);
    left = Math.max(0, left);
    this.$el.css('left', left);
  }
});


return HorizontallyFixed;



});