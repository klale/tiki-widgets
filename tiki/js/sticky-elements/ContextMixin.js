import _ from 'underscore';
import { getRelativeRect } from './util';


export default class ContextMixin {

  initialize(options) {
    _.bindAll(this, 'onVerticalScroll');
    this.context = options.context;
    this.watcher.on('verticalscroll', this.onVerticalScroll);
  }

  getDistanceToStack(scrollData) {
    var contextBottom = getRelativeRect(this.context, scrollData.scrollEvent).bottom;
    var distance = (contextBottom - (this.frozenStackHeight || scrollData.stackHeight)) + scrollData.rect.height;
    return distance;
  }

  getContextRect(scrollEvent) {
    return getRelativeRect(this.context, scrollEvent);
  }

  onScrollOut(scrollData) {
    var scrollEvent = scrollData.scrollEvent;
    var distance = this.getDistanceToStack(scrollData);
    var rowHeight = scrollData.rect.height

    var marginTop = distance - rowHeight;
    marginTop = Math.min(rowHeight, marginTop*-1);
    this.row.css('margin-top', marginTop*-1);

    if (marginTop === rowHeight) {
      this.rowStatus = 'above';
    }
  }
  onScrollIn(scrollData) {
    var distance = this.getDistanceToStack(scrollData);
    var marginTop = scrollData.rect.height - distance;
    marginTop = Math.max(0, marginTop);
    this.row.css('margin-top', marginTop*-1);

    if (marginTop === 0) {
      this.rowStatus = null;
      this.frozenStackHeight = null;
    }
  }

  onVerticalScroll(scrollData) {
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
      }
      else if (distance < 0 && this.rowStatus !== 'above') {
        this.onScrollOut(scrollData);
      }
    }

    if (this.rowStatus == 'scrolling') {
      if (direction == 'down') {
        this.onScrollOut(scrollData);
      }
      else {
        this.onScrollIn(scrollData);
      }
    }
  }
}

