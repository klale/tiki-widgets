define([
    'jquery',
    'underscore',
    'backbone',
    './tools'
], function($, _, Backbone, Tools) {
    'use strict';



var makeSpaceholder = function(el) {
    var spaceholder = $('<div class="tiki-sticky-spaceholder"></div>');
    spaceholder.css({
        width: $(el).outerWidth(),
        height: $(el).outerHeight(),
        margin: $(el).css('margin')
    });
    return spaceholder;
}



var ScrollEvent = function(config) {
    this.mutated = [];
    this.direction = config.direction;
    this.viewportHeight = config.viewportHeight;
    this.stackHeight = config.stackHeight;
    this.scrollTop = config.scrollTop;
    this.scrollLeft = config.scrollLeft;
    this.e = config.e;
}
ScrollEvent.prototype.hasMutated = function(cid) {
    return this.mutated.indexOf(cid) !== -1;
};
ScrollEvent.prototype.addMutated = function(cid) {
    this.mutated.push(cid);
};



var Viewport = Tools.View.extend('Viewport', {
    initialize: function() {
        this.isDocument = this.el.nodeType === 9;
        // this.stack = $('<div class="stickystack"></div>').appendTo(this.isDocument ? this.el.body : this.el);
        this.stack = $('<div class="tiki-stickystack"></div>');
        $(this.isDocument ? this.el.body : this.el).insertAt(0, this.stack);
        this.prevScrollTop = this.getScrollTop();
        this.prevScrollLeft = this.getScrollLeft();

        // this.$el.on('scroll', _.throttle(this.onScroll, 5).bind(this));
        //
        this.$el.on('scroll', this.onScroll.bind(this));
    },
    getHeight: function() {
        if (this.isDocument) {
            return window.innerHeight;
        }
        return this.el.getBoundingClientRect().height;
    },
    getScrollTop: function() {
        var el = this.el;
        return this.isDocument ? el.body.scrollTop : el.scrollTop;
    },
    getScrollLeft: function() {
        var el = this.el;
        return this.isDocument ? el.body.scrollLeft : el.scrollLeft;
    },
    /* Manually trigger a scroll event */
    triggerScrollEvent: function(scrollEvent) {
        // Update the scrollHeight and trigger the scrollEvent manually.
        scrollEvent.stackHeight = this.stack[0].scrollHeight;
        this.trigger('scroll', scrollEvent);
    },
    onScroll: function(e) {
        var scrollTop = this.getScrollTop();
        var scrollLeft = this.getScrollLeft();
        var direction;

        if (scrollLeft != this.prevScrollLeft) {
            direction = scrollLeft > this.prevScrollLeft ? 'right' : 'left';
        }
        else {
            direction = scrollTop > this.prevScrollTop ? 'down' : 'up'
        }
        this.prevScrollTop = scrollTop;
        this.prevScrollLeft = scrollLeft;

        var scrollEvent = new ScrollEvent({
            direction: direction,
            viewportHeight: this.getHeight(),
            stackHeight: this.stack[0].scrollHeight,
            scrollTop: scrollTop,
            scrollLeft: this.getScrollLeft(),
            e: e
        });

        if (direction == 'left' || direction == 'right') {
            this.trigger('horizontalscroll', scrollEvent);
        }
        else {
            this.trigger('scroll', scrollEvent);
        }
    }
});


var StickyBase = Tools.View.extend('Sticky', {

    initialize: function(options) {
        // Set scrollable, default to document
        this.setViewport($(options.viewport || document));
        this.state = {};
    },
    setViewport: function(viewportEl) {
        if (this.viewport) {
            this.viewport.off('scroll', this.onViewportScroll);
        }
        var viewport = viewportEl.data('viewport');
        if (!viewport) {
            var viewport = new Viewport({el: viewportEl});
            viewportEl.data('viewport', viewport);
        }

        this.viewport = viewport;
        this.listenTo(viewport, 'scroll', this.onViewportScroll);
    },
    getStackHeight: function(scrollEvent) {
        return scrollEvent.stackHeight;
    },
    setState: function() {
        var scrollEvent = this.scrollEvent;
        var rect = this.el.getBoundingClientRect();
        var stackHeight = this.getStackHeight(scrollEvent);
        var bottomToFloor = scrollEvent.viewportHeight - rect.bottom;
        var bottomToStack = rect.bottom - scrollEvent.stackHeight;
        var topToStack = rect.top - stackHeight;
        var viewportHeight = scrollEvent.viewportHeight - stackHeight;

        var position;

        if (rect.top > scrollEvent.viewportHeight) {
            position = 'fullybelow';
        }
        else if (bottomToStack <= 0) {
            position = 'fullyabove';
        }
        else if (bottomToFloor >= 0 && topToStack >= 0) {
            position = 'fullyvisible';
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


        var oldPosition = this.state.position;
        this.state = {
            stackHeight: stackHeight,
            viewportHeight: viewportHeight,
            rect: rect,
            topToStack: topToStack,
            bottomToStack: bottomToStack,
            bottomToFloor: bottomToFloor,
            position: position
        };

        if (oldPosition != position) {
            // Trigger an event when the position changes
            this.trigger(position, oldPosition);
        }
    },
    onViewportScroll: function(scrollEvent) {
        if (scrollEvent.hasMutated(this.cid)) {
            return;
        }

        this.scrollEvent = scrollEvent;
        this.setState();
    }
});



/*
A full-width, non-groupable, non-contextual sticky
*/
var SimpleSticky = StickyBase.extend('Sticky', {
    initialize: function(options) {
        Sticky.__super__.initialize.call(this, options);
        this.on('partiallyabove fullyabove', this.onAbove, this);
        this.on('partiallybelow fullybelow fullyvisible', this.onBelow, this);
        if (options.createRow) this.createRow = options.createRow;
    },
    getStackHeight: function(scrollEvent) {
        if (this.row) {
            return scrollEvent.stackHeight - this.row.height();
        }
        return scrollEvent.stackHeight;
    },
    beginStick: function() {
        // Create a row
        this.row = this.createRow();

        // Position the clone before inserting it
        var rect = this.state.rect;
        this.row.css({
            width: rect.width,
            height: rect.height,
            left: rect.left + this.scrollEvent.scrollLeft,
            marginRight: rect.width * -1
        });

        // Finally insert it
        this.insertRow();
        this.scrollEvent.addMutated(this.cid)
        this.viewport.triggerScrollEvent(this.scrollEvent);
    },
    endStick: function() {
        this.removeRow();
        this.row = null;

        this.scrollEvent.addMutated(this.cid)
        this.viewport.triggerScrollEvent(this.scrollEvent);
    },
    createRow: function() {
        this.spaceholder = makeSpaceholder(this.el);
        this.spaceholder.insertAfter(this.el);

        this.$el.detach();
        var row = $('<div class="row"></div>');
        row.append(this.el);

        this.orgEl = this.el;
        this.setElement(this.spaceholder);

        return row;
    },
    removeRow: function() {
        this.setElement(this.orgEl);
        this.spaceholder.replaceWith(this.el);
        this.orgEl = null;
        this.row.remove();
    },
    insertRow: function() {
        this.viewport.stack.append(this.row);
    },
    onAbove: function() {
        if (!this.row) this.beginStick();
    },
    onBelow: function() {
        if (this.row) this.endStick();
    }
});


var StickyGroup = Tools.View.extend('StickyGroup', {
    className: 'group',
    initialize: function(options) {
        options = options || {};
        if (!options.name) throw new Error('A StickyGroup must have a name');
        this.name = options.name;
        this.$el.addClass(this.name);
    }
});


var Sticky = StickyBase.extend('Sticky', {
    initialize: function(options) {
        Sticky.__super__.initialize.call(this, options);

        this.context = options.context;

        if (options.group) {
            this.group = options.group;
        }
        this.doClone = !!options.doClone;
        this.on('partiallyabove fullyabove', this.onAbove, this);
        this.on('partiallybelow fullybelow fullyvisible', this.onBelow, this);
    },
    setViewport: function(viewportEl) {
        Sticky.__super__.setViewport.call(this, viewportEl);
        this.listenTo(this.viewport, 'horizontalscroll', this.onHorizontalViewportScroll);
    },
    getStackHeight: function(scrollEvent) {
        var height = scrollEvent.stackHeight;

        if (this.row && scrollEvent.direction == 'up') {
            height -= this.row.height();
        }
        if (this.group) {
            // height -= this.getGroupEl().height();
            height -= this.group.el.scrollHeight;
        }
        return height;
    },
    createRowClone: function() {
        return $('<div class="row"></div>').append(this.$el.clone(true));
    },
    createRow: function() {
        this.spaceholder = makeSpaceholder(this.el);
        this.spaceholder.insertAfter(this.el);

        this.$el.detach();
        var row = $('<div class="row"></div>');
        row.append(this.el);

        this.orgEl = this.el;
        this.setElement(this.spaceholder);

        return row;
    },
    insertRow: function() {
        if (this.group) {
            if (!this.group.el.parentNode) {
                this.viewport.stack.append(this.group.el);
                this.group.$el.css('left', this.scrollEvent.scrollLeft * -1);
            }
            this.group.$el.append(this.row);
        }
        else {
            this.viewport.stack.append(this.row);
        }
    },
    removeRowClone: function() {
        this.row.remove();
    },
    removeRow: function() {
        this.setElement(this.orgEl); // restore this.el
        this.spaceholder.replaceWith(this.el);  // replace the spaceholder with this.el
        this.orgEl = null;
        this.row.remove(); // remove the empty <div class="row">
    },
    beginStick: function() {
        this.row = this.doClone ? this.createRowClone() : this.createRow();
        this.insertRow();

        // Position the clone before inserting it
        var rect = this.state.rect;
        this.row.css({
            width: rect.width,
            height: rect.height,
            left: rect.left + this.scrollEvent.scrollLeft,
            marginRight: rect.width * -1
        });

        // console.log('beginSttick manual onScroll', document.body.scrollTop, this.orgEl)
        this.scrollEvent.addMutated(this.cid)
        this.viewport.triggerScrollEvent(this.scrollEvent);
    },
    endStick: function(newpos, oldpos) {
        this.doClone ? this.removeRowClone() : this.removeRow();
        this.row = false;

        if (this.group && this.group.$el.is(':empty')) {
            this.group.remove();
        }

        // console.log('endStick manual onScroll', document.body.scrollTop, this.el)
        this.scrollEvent.addMutated(this.cid)
        this.viewport.triggerScrollEvent(this.scrollEvent);
    },
    onViewportScroll: function(scrollEvent) {
        Sticky.__super__.onViewportScroll.call(this, scrollEvent);

        if (this.rowStatus == 'scrollingOut') {
            this.onScrollOut(scrollEvent);
        }
        else if(this.rowStatus == 'scrollingIn') {
            this.onScrollIn(scrollEvent);
        }
        else if(this.rowStatus == 'above') {
            if (scrollEvent.direction == 'up') {
                var rect = this.context[0].getBoundingClientRect();

                if (rect.bottom > this.state.stackHeight) {
                    this.rowStatus = 'scrollingIn'
                    this.stackHeight = this.state.stackHeight;
                    this.onScrollIn(scrollEvent);
                }
            }
        }
        else if (this.row) {
            // When scrolling with a clone, i might need to scrollOut or scrollIn.
            var rect = this.context[0].getBoundingClientRect();
            var distanceToStack = rect.bottom - this.state.stackHeight;
            this.stackHeight = this.state.stackHeight;
            this.rowHeight = this.row.height();

            if (distanceToStack < this.rowHeight) {
                // Begin scrollout
                this.rowStatus = 'scrollingOut';
            }
        }
    },
    onHorizontalViewportScroll: function(scrollEvent) {
        if (!this.row) return;

        var left = scrollEvent.scrollLeft * -1;
        if (this.group) {
            // move the entire group
            // Todo: optimize. Introduce a StickyGroup view.
            this.group.$el.css('left', left);
        } else {
            // just move this row
            this.$el.css('left', left);
        }

    },
    onScrollOut: function(scrollEvent) {
        if (scrollEvent.direction == 'up') {
            this.stackHeight -= this.rowHeight;
            this.rowStatus = 'scrollingIn';
            this.onScrollIn(scrollEvent);
            return;
        }
        var rect = this.context[0].getBoundingClientRect();
        var top = rect.bottom - this.stackHeight - this.rowHeight;
        top = Math.max(this.rowHeight*-1, top);
        var height = this.rowHeight + top;

        this.row.css('height', height).find('>*').css('top', top);
        if (top === this.rowHeight*-1) {
            this.rowStatus = 'above';
        }
    },
    onScrollIn: function(scrollEvent) {
        if (scrollEvent.direction == 'down') {
            this.rowStatus = 'scrollingOut';
            this.stackHeight += this.rowHeight;
            this.onScrollOut(scrollEvent);
            return;
        }

        var rect = this.context[0].getBoundingClientRect();
        var gap = rect.bottom - this.stackHeight;
        gap = Math.min(this.rowHeight, gap);
        var top = (this.rowHeight - gap) * -1;
        this.row.css('height', gap).find('>*').css('top', top);
        if (gap === this.rowHeight) {
            this.rowStatus = 'hepp';
        }
    },
    onAbove: function() {
        if (!this.row) this.beginStick();
    },
    onBelow: function() {
        if (this.row) this.endStick();
    }
});






return {
    Viewport: Viewport,
    StickyBase: StickyBase,
    Sticky: Sticky,
    StickyGroup: StickyGroup,
    SimpleSticky: SimpleSticky
};



});