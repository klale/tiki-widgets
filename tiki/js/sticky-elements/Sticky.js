import _ from 'underscore';
import $ from 'jquery';
import Events from 'events';

import ContextMixin from './ContextMixin'
import Watcher from './Watcher';
import { mixin, extend } from './util';



export default class Sticky extends mixin(Events.EventEmitter, ContextMixin) {

  constructor(options) {
    super();
    _.bindAll(this, 'onVerticalScroll', 'getStackHeight', 'onAbove', 'onBelow');
    this.setElement(options.el);

    this.watcher = new Watcher({
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
      ContextMixin.prototype.initialize.call(this, options);
    }
  }

  remove() {
    this.watcher.remove();
    this.removeAllListeners();
    if (this.row) {
      this.endStick();
    }
    this.$el.remove();
  }

  setElement(el) {
    this.$el = $(el);
    this.el = this.$el[0];
  }

  getStackHeight(scrollEvent) {
    if (this.row) {
      return scrollEvent.stackHeight - this.row.height();
    }
    return scrollEvent.stackHeight;
  }


  createRow(scrollData) {
    this.spaceholder = this.makeSpaceholder(scrollData);
    this.spaceholder.insertAfter(this.el);

    this.$el.detach();
    var row = $('<div class="row"></div>');
    row.append(this.el);

    this.orgEl = this.el;
    this.watcher.setElement(this.spaceholder);

    return row;
  }

  makeSpaceholder(scrollData) {
    var rect = scrollData.rect;
    var spaceholder = $('<div class="sticky-spaceholder"></div>');
    spaceholder.css({
        width: rect.width,
        height: rect.height,
        margin: $(this.el).css('margin'),
    });
    return spaceholder;
  }

  removeRow() {
    this.watcher.setElement(this.orgEl);
    this.spaceholder.replaceWith(this.el);
    this.orgEl = null;
    this.row.remove();
  }

  insertRow(scrollData) {
    this.watcher.viewport.barStack.append(this.row);
  }

  beginStick(scrollData) {
    var viewport = this.watcher.viewport;
    this.row = this.createRow(scrollData);
    this.insertRow(scrollData);
    viewport.refreshStackHeight(scrollData.scrollEvent);

    viewport.retriggerScrollEvent();
  }

  endStick(scrollData) {
    this.removeRow();
    this.row = null;
    this.stackPos = null;
    this.rowStatus = null;
    this.watcher.viewport.retriggerScrollEvent();
  }

  onAbove(scrollData, oldPos) {
    if (!this.row) {
      this.beginStick(scrollData);
    }
  }

  onBelow(scrollData, oldPos) {
    if (this.row) {
      this.endStick(scrollData);
    }
  }
}

// ES5 extend function
Sticky.extend = extend;



