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
        margin: $(el).css('margin'),
        position: 'relative',
        left: el.getBoundingClientRect().left
    });
    return spaceholder;
};


var ScrollEvent = function(config) {
    this.mutated = [];
    this.direction = config.direction;
    this.viewportWidth = config.viewportWidth;
    this.viewportHeight = config.viewportHeight;
    this.viewportRect = config.viewportRect;
    this.stackHeight = config.stackHeight;
    this.scrollTop = config.scrollTop;
    this.scrollLeft = config.scrollLeft;
    this.scrollWidth = config.scrollWidth;
    this.e = config.e;
};
ScrollEvent.prototype.hasMutated = function(cid) {
    return this.mutated.indexOf(cid) !== -1;
};
ScrollEvent.prototype.addMutated = function(cid) {
    this.mutated.push(cid);
};


var AbstractViewport = Tools.View.extend({
    triggerNewScrollEvent: function() {
        // Create and dispatch a new scroll event artificially
        // Reuse the same browser event
        this.onScroll(this.scrollEvent.e);
    },
    retriggerScrollEvent: function(scrollEvent) {
        // Update the scrollHeight and dispatch scrollEvent
        scrollEvent.stackHeight = this.stack[0].scrollHeight;
        this.trigger('scroll', scrollEvent);
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
    onScroll: function(e) {
        var scrollEvent = this.createScrollEvent(e);

        // Keep a reference to the most recent scroll event
        this.scrollEvent = scrollEvent;

        // Trigger the scroll event
        var dir = scrollEvent.direction;
        if (dir == 'left' || dir == 'right') {
            this.trigger('horizontalscroll', scrollEvent);
        }
        else {
            this.trigger('scroll', scrollEvent);
        }
    }
});

var DocumentViewport = AbstractViewport.extend('DocumentViewport', {
    initialize: function() {
        this.stack = $('<div class="tiki-stickystack fixed"></div>');
        $(this.el.body).insertAt(0, this.stack);
        this.scrollEvent = this.createScrollEvent();

        // this.$el.on('scroll', _.throttle(this.onScroll, 5).bind(this));
        this.$el.on('scroll', this.onScroll.bind(this));
    },
    createScrollEvent: function(e) {
        var scrollTop = this.el.body.scrollTop;
        var scrollLeft = this.el.body.scrollLeft;

        return new ScrollEvent({
            direction: this.getScrollDirection(scrollLeft, scrollTop),
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
            viewportRect: {
                top: 0,
                left: 0
            },
            scrollWidth: this.el.body.scrollWidth,
            scrollTop: scrollTop,
            scrollLeft: scrollLeft,
            stackHeight: this.stack[0].scrollHeight,
            e: e
        });
    },

});

var ElementViewport = AbstractViewport.extend('ElementViewport', {
    initialize: function() {
        this.stack = $('<div class="tiki-stickystack absolute"></div>');
        $(this.el).insertAt(0, this.stack);
        this.scrollEvent = this.createScrollEvent();
        this.$el.on('scroll', this.onScroll.bind(this));
    },
    createScrollEvent: function(e) {
        var scrollTop = this.el.scrollTop;
        var scrollLeft = this.el.scrollLeft;
        var rect = this.el.getBoundingClientRect();

        return new ScrollEvent({
            direction: this.getScrollDirection(scrollLeft, scrollTop),
            viewportWidth: rect.width,
            viewportHeight: rect.height,
            viewportRect: rect,
            scrollWidth: this.el.scrollWidth,
            scrollHeight: this.el.scrollHeight,
            scrollTop: scrollTop,
            scrollLeft: scrollLeft,
            stackHeight: this.stack[0].scrollHeight,
            e: e
        });
    },
    onScroll: function(e) {
        this.stack.css('top', this.el.scrollTop);
        this.stack.css('left', this.el.scrollLeft);
        ElementViewport.__super__.onScroll.call(this, e);
    }
});




var StickyBase = Tools.View.extend('Sticky', {

    initialize: function(options) {
        _.bindAll(this, 'onViewportScroll');
        this.enabled = options.enabled === undefined ? true : options.enabled;
        // Set scrollable, default to document
        this.setViewport($(options.viewport || document));
        this.state = {};
    },
    setViewport: function(viewportEl) {
        viewportEl = $(viewportEl);
        if (this.enabled && this.viewport) {
            this.viewport.off('scroll', this.onViewportScroll);
        }
        var viewport = viewportEl.data('viewport');
        if (!viewport) {
            var isDocument = viewportEl[0].nodeType === 9;
            var Viewport = isDocument ? DocumentViewport : ElementViewport;
            viewport = new Viewport({el: viewportEl});
            viewportEl.data('viewport', viewport);
        }

        this.viewport = viewport;
        if (this.enabled) {
            this.listenTo(viewport, 'scroll', this.onViewportScroll);
        }
    },
    enable: function() {
        this.enabled = true;
        if (this.viewport) {
            this.viewport.on('scroll', this.onViewportScroll);
        }
    },
    disable: function() {
        if (this.row) {
            this.endStick();
        }
        if (this.viewport) {
            this.viewport.off('scroll', this.onViewportScroll);
        }
        this.enabled = false;
    },
    getStackHeight: function(scrollEvent) {
        return scrollEvent.stackHeight;
    },
    setState: function() {
        var scrollEvent = this.scrollEvent;

        // Make "rect" of this.el relative to viewport
        var rect = _.extend({}, this.el.getBoundingClientRect());  // <-- optimize?
        rect.top -= scrollEvent.viewportRect.top;
        rect.bottom = rect.top + rect.height;
        rect.left -= scrollEvent.viewportRect.left;


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


var HorizontalSticky = StickyBase.extend('HorizontalSticky', {
    initialize: function(options) {
        HorizontalSticky.__super__.initialize.call(this, options);
    },
    setViewport: function(viewportEl) {
        HorizontalSticky.__super__.setViewport.call(this, viewportEl);
        this.listenTo(this.viewport, 'horizontalscroll', this.onHorizontalViewportScroll);
    },
    onHorizontalViewportScroll: function(e) {
        // Note: e is a ScrollEvent instance, not a normal browser or jquery event.
        if (!this.state.rect) return;
        var maxLeftAllowed = e.scrollWidth - this.state.rect.width;
        var left = Math.min(e.scrollLeft, maxLeftAllowed);
        left = Math.max(0, left);
        this.$el.css('left', left);
    }
});


var SimpleSticky = StickyBase.extend('Sticky', {
    initialize: function(options) {
        if (options.stickHorizontally) {
            this.stickHorizontally = options.stickHorizontally;
        }
        SimpleSticky.__super__.initialize.call(this, options);
        this.on('partiallyabove fullyabove', this.onAbove, this);
        this.on('partiallybelow fullybelow fullyvisible', this.onBelow, this);
        if (options.createRow) this.createRow = options.createRow;

    },
    setViewport: function(viewportEl) {
        SimpleSticky.__super__.setViewport.call(this, viewportEl);
        if (this.stickHorizontally) {
            this.listenTo(this.viewport, 'horizontalscroll',
                this.onHorizontalViewportScroll);
        }
    },
    onHorizontalViewportScroll: function(e) {
        // Note: e is a ScrollEvent instance, see ScrollEvent above.
        var maxLeftAllowed = e.scrollWidth - e.viewportWidth;
        var left = Math.min(e.scrollLeft, maxLeftAllowed);
        left = Math.max(0, left);

        if (!this.row) {
            this.$el.css('left', left);
        }
        this.tmpLeft = left;
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
        var left;
        if (this.stickHorizontally) {
            left = rect.left;
        } else {
            left = rect.left + this.scrollEvent.scrollLeft; // <-- offsetLeft, that is
        }
        this.row.css({
            width: rect.width,
            height: rect.height,
            left: left
        });

        // Finally insert it
        this.insertRow();
        this.scrollEvent.addMutated(this.cid);
        this.viewport.retriggerScrollEvent(this.scrollEvent);
    },
    endStick: function() {
        this.removeRow();
        if (this.stickHorizontally) {
            this.$el.css('left', this.tmpLeft);
        }

        this.row = null;
        this.scrollEvent.addMutated(this.cid);
        this.viewport.retriggerScrollEvent(this.scrollEvent);
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
    },
    remove: function() {
        // When removing this view, quickly restore
        if (this.row) {
            this.endStick();
        }
        SimpleSticky.__super__.remove.call(this);
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
    positionRow: function() {
        var rect = this.state.rect;
        this.orgLeft = rect.left + this.scrollEvent.scrollLeft;

        if (this.group) {
            this.row.css({
                width: rect.width,
                height: rect.height,
                left: rect.left + this.scrollEvent.scrollLeft,
                marginRight: rect.width * -1
            });
        }
        else {
            this.row.css({
                width: rect.width,
                height: rect.height,
                left: rect.left,
                marginRight: rect.width * -1
            });
        }
    },
    beginStick: function() {
        this.row = this.doClone ? this.createRowClone() : this.createRow();
        this.insertRow();
        this.positionRow();

        this.scrollEvent.addMutated(this.cid);
        this.viewport.retriggerScrollEvent(this.scrollEvent);
    },
    endStick: function(newpos, oldpos) {
        if (this.doClone) {
            this.removeRowClone();
        } else {
            this.removeRow();
        }
        this.row = false;

        if (this.group && this.group.$el.is(':empty')) {
            this.group.remove();
        }

        this.scrollEvent.addMutated(this.cid);
        this.viewport.retriggerScrollEvent(this.scrollEvent);
    },
    remove: function() {
        if (this.row) {
            this.endStick();
        }
        StickyBase.__super__.remove.call(this);
    },
    onViewportScroll: function(scrollEvent) {
        Sticky.__super__.onViewportScroll.call(this, scrollEvent);
        var rect;

        if (this.rowStatus == 'scrollingOut') {
            this.onScrollOut(scrollEvent);
        }
        else if(this.rowStatus == 'scrollingIn') {
            this.onScrollIn(scrollEvent);
        }
        else if(this.rowStatus == 'above') {
            if (scrollEvent.direction == 'up') {
                rect = this.context[0].getBoundingClientRect();
                if (rect.bottom > this.stackHeight) {
                    this.rowStatus = 'scrollingIn';
                    this.onScrollIn(scrollEvent);
                }
            }
        }
        else if (this.row) {
            // When scrolling with a clone, i might need to scrollOut or scrollIn.
            rect = this.context[0].getBoundingClientRect();
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
            this.group.$el.css('left', left);
        } else {
            // just move this row
            this.row.css('left', left + this.orgLeft);
        }
    },
    onScrollOut: function(scrollEvent) {
        if (scrollEvent.direction == 'up') {
            this.rowStatus = 'scrollingIn';
            this.onScrollIn(scrollEvent);
            return;
        }

        var rect = this.context[0].getBoundingClientRect();
        var top = (rect.bottom - this.stackHeight - this.rowHeight);
        top = Math.max(this.rowHeight * -1, top);

        this.row.css('top', top);
        if (top === this.rowHeight * -1) {
            this.rowStatus = 'above';
        }
    },
    onScrollIn: function(scrollEvent) {
        if (scrollEvent.direction == 'down') {
            this.rowStatus = 'scrollingOut';
            this.onScrollOut(scrollEvent);
            return;
        }

        var rect = this.context[0].getBoundingClientRect();
        var boxHeight = this.rowHeight;
        var ofWhichIsVisible = rect.bottom - this.stackHeight;
        var top = (boxHeight - ofWhichIsVisible) * -1;
        top = Math.min(0, top);
        if(this.row) {
            this.row.css('top', top);
        }

        if (top === 0 || !this.row) {
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
    AbstractViewport: AbstractViewport,
    DocumentViewport: DocumentViewport,
    ElementViewport: ElementViewport,
    StickyBase: StickyBase,
    Sticky: Sticky,
    StickyGroup: StickyGroup,
    SimpleSticky: SimpleSticky,
    HorizontalSticky: HorizontalSticky
};

});