import _ from 'underscore';
import Watcher from './Watcher';


export default class HorizontallyFixed extends Watcher {

  constructor(options) {
    super(options);
    _.bindAll(this, 'onHorizontalScroll');

    this.setViewport(options.viewport || document);

    this.on('horizontalscroll', this.onHorizontalScroll);
  }


  onHorizontalScroll(scrollData) {
    var scrollEvent = scrollData.scrollEvent;
    var rect = this.getRect(scrollEvent);
    var maxLeftAllowed = scrollEvent.scrollWidth - rect.width;

    var left = Math.min(scrollEvent.scrollLeft, maxLeftAllowed);
    left = Math.max(0, left);
    this.$el.css('left', left);
  }
}
