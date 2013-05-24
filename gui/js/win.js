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
        },    
        render: function() {
            this.$el.html(this._template({title: this.title}));
            
            // Add a dropshadow in old ie
            if($.browser.ltie9) {
                var divs = ['ds_l','ds_r','ds_t','ds_b','ds_tl','ds_tr','ds_bl','ds_br'];
                _.each(divs, function(item) {
                    this.$el.append($('<div class="ds '+item+'"><div>'));
                }, this);
                this.$el.iefocus();
                this.$('> header h2, > header, > .resize').attr('unselectable', 'on');
            }
            return this;
        },

        show: function() {
            if(!this.el.parentNode)
                $(document.body).append(this.render().el);
            this.bringToTop();
            // this.el.focus();
        },
        bringToTop: function() {
            var currz = parseInt(this.$el.css('z-index') || 0),
                dialogs = $(document.body).children('.gui-win');
        
            if(currz-101 === dialogs.length-1)
                return;
        
            dialogs.each(function() {
                var z = parseInt($(this).css('z-index'));
                if(z > currz) 
                    $(this).css('z-index', z-1);
            });
            this.$el.css('z-index', (dialogs.length-1) + 101);
        },
        close: function() {
            this.$el.remove();
            this.trigger('close');            
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
        },
        onFocusIn: function(e) {
            this.bringToTop();
        },
        onHeaderDragDown: function(e, drag) {
            var offset = $(e.currentTarget.offsetParent).offset(); 
            drag.offsetx = e.pageX - offset.left;
            drag.offsety = e.pageY - offset.top;
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

