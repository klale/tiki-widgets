define([
    'jquery', 
    'underscore',
    'backbone',
    './base'
], function($, _, Backbone, gui) {

    var win = {};

    /**
    * win.Layer is 
    *  - absolut positioned div that has focus
    *  - 
    */
    win.Layer = Backbone.View.extend({
        tagName: 'div',
        className: 'gui-layer',
        attributes: {tabindex: '-1'},
        template: _.template(''+
            '<div class="content"></div>'
        ),
        
        initialize: function(config) {
            this.resizable = config.resizable;
        },
        render: function() {
            this.$el.html(this.template());
        }
    });

    /**
    * A win.Window 
    *   - has a header with a title and a close button, 
    *   - is draggable
    *   - is resizable
    *   - has a footer with zero or more buttons
    *   - is a direct child of <body>
    *   - has show() method
    *   - has non-filter dropshadow in IE<=8
    *   - is z-index managed
    */
    win.Window = win.Layer.extend({
        className: 'gui-win',
        _template: _.template(''+
            '<header><div class="title"><%= obj.title %></div></header>'+
            '<div class="content"></div>'+          
            '<div class="resize"></div>'
        ),
        mixins: [gui.ChildView],
        events: {
            'mousedown': 'bringToTop',
            'focusin': 'onFocusIn',
            'dragdown header': 'onHeaderDragDown',
            'draginit header': 'onHeaderDragInit',
            'draginit .resize': 'onResizeDragInit',
            'dragmove .resize': 'onResizeDragMove',
            'dragend .resize': 'onResizeDragEnd'            
        },                
        initialize: function(config) {
            config = config || {};
            this.title = config.title || this.title;
            this.template = config.template || this.template;

            if($.browser.ltie8)
                this.$el.iefocus();
        },    
        render: function() {
            this.$el.html(this._template({title: this.title}));

            if($.browser.ltie8) {
                this.$('>footer button').iefocus();
            }
            if($.browser.ltie9)
                this.$el.ieshadow();
            if($.browser.ltie10)
                this.$('> header h2, > header, > .resize').attr('unselectable', 'on');            
            return this;
        },

        show: function() {
            if(!this.el.parentElement)
                $(document.body).append(this.render().el);
            this.bringToTop();
            return this;
        },
        bringToTop: function() {
            var currz = parseInt(this.$el.css('z-index') || 0),
                dialogs = $(document.body).children('.gui-win, .gui-dialog');
            if(currz-100 === dialogs.length-1)
                return this;
        
            dialogs.each(function() {
                var z = parseInt($(this).css('z-index'));
                if(z > currz) 
                    $(this).css('z-index', z-1);
            });
            this.$el.css('z-index', (dialogs.length-1) + 100);
            return this;
        },
        close: function() {
            this.$el.remove();
            this.trigger('close', this);            
        },
        center: function(args) {            
            var el = $(this.el),
                width = el.outerWidth(),
                height = el.outerHeight(),
                winWidth = $(window).width(),
                winHeight = $(window).height();

            var top = ((winHeight - height) / 2) + $(window.document).scrollTop(),
                left = ((winWidth - width) / 2) + $(window.document).scrollLeft();
            el.css({left: left, top: top});
            return this;
        },
        onFocusIn: function(e) {
            this.bringToTop();
        },
        onHeaderDragDown: function(e, drag) {
            var offset = gui.mouseOffset(e);
            drag.offsetx = offset.left;
            drag.offsety = offset.top;
        },
        onHeaderDragInit: function(e, drag) {
            drag.only();
            drag.representative(this.el, drag.offsetx, drag.offsety);                        
        },       
        onResizeDragInit: function(e, drag) {
            drag.winpos = $(this.el).offset();
            drag.only();
        },
        onResizeDragMove: function(e, drag) {
            var w = e.pageX - drag.winpos.left,
                h = e.pageY - drag.winpos.top;
            this.$el.css({'width': w, 'height': h});            
        },
        onResizeDragEnd: function(e, drag) {
            drag.element.attr('style', '');
        }
    });


    win.Dialog = win.Window.extend({
        className: 'gui-dialog',
        _template: _.template(''+
            '<header><div class="title"><%= obj.title %></div></header>'+
            '<div class="content"></div>'+
            '<footer>'+
                '<div class="buttons"></div>'+
            '</footer>'+
            '<div class="resize"></div>'
        )
    });

    // win.Info
    // win.Warning
    // win.Confirm



    return win;
});

