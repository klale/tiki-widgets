define([
    'jquery', 
    'underscore',
    'backbone',
    './base',
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
        
        initialize: function(config) {
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
            '<footer>'+
                '<div class="buttons"></div>'+
            '</footer>'+
            '<div class="resize"></div>'
        ),
        mixins: [
            gui.ChildView
        ],
        events: {
            'mousedown header': '_onHeaderMouseDown',
            'mousedown': 'bringToTop',
            'click .buttons .close': 'close',
            'mousedown .resize': '_onResizeMouseDown',
            'focusin': '_onFocusIn',            
        },
                
        initialize: function(config) {
            this.title = config.title || this.title || 'asdee';
            this.template = config.template || this.template;
            
            _.bindAll(this, '_onResizeDrag', '_onResizeDragEnd', '_onFocusIn');            
        },    
        render: function() {
            this.$el.html(this._template({title: this.title}));

        
            if($.browser.ltie9) {
                var divs = ['ds_l','ds_r','ds_t','ds_b','ds_tl','ds_tr','ds_bl','ds_br'];
                _.each(divs, function(item) {
                    this.$el.append($('<div class="ds '+item+'"><div>'));
                }, this);
                this.$el.iefocus();
                this.$('> header h2, > header, > .resize').attr('unselectable', 'on');
            }
            this.renderContent();
            return this;
        },
        renderContent: function() {
            this.$('>.content').html(this.template());            
        },
        alignTo: function(el, align) {
            
        },


        _ieRepaintScrollbars: function() {
            this.$('.tabs > div').css('overflow', 'hidden').css('overflow', 'auto');
        },
        _onHeaderMouseDown: function(e) {
            gui.drag.start({
                ev: e,
                el: this.el
            });
            e.preventDefault();                
        },
        _onResizeMouseDown: function(e) {
            var curr = this.$el.position();
            gui.drag.start({
                ev: e,
                ondrag: this.onResizeDrag,
                onend: this.onResizeDragEnd,
                startX: curr.left,
                startY: curr.top
            });
            e.preventDefault();                        
        },
        _onResizeDrag: function(e, conf) {
            var w = e.pageX - conf.startX,
                h = e.pageY - conf.startY;
            this.$el.css({'width': w, 'height': h});
        },
        _onResizeDragEnd: function(e) {
            if($.browser.ltie9)
                this._ieRepaintScrollbars();
        },
        _onFocusIn: function(e) {
            this.bringToTop();
        },
                
        
        
        show: function() {
            if(!this.el.parentNode)
                $(document.body).append(this.render().el);
            this.bringToTop();
        },
        bringToTop: function() {
            var currz = parseInt(this.$el.css('z-index') || 0),
                dialogs = $(document.body).children('.gui-win');
        
            if(currz-100 === dialogs.length-1)
                return;
        
            dialogs.each(function() {
                var z = parseInt($(this).css('z-index'));
                if(z > currz) 
                    $(this).css('z-index', z-1);
            });
            this.$el.css('z-index', (dialogs.length-1) + 100);
        },
        close: function() {
            this.trigger('close');
            this.$el.remove();
        },
        center: function(args) {            
            var el = $(this.el),
                width = el.outerWidth(),
                height = el.outerHeight(),
                winWidth = $(window).width(),
                winHeight = $(window).height();

            var top = ((winHeight - height) / 2) + $(window).scrollTop(),
                left = ((winWidth - width) / 2) + $(window).scrollLeft();

            var top = 10;

            el.css({left: left, top: top});
        }

    });


    return win;
});

