define([
    'jquery', 
    'underscore',
    'backbone',
    './base',
    
    'jquery-ui',
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
            'mousedown': 'bringToTop',
            'click .buttons .close': 'close',
            'focusin': '_onFocusIn',            
        },
                
        initialize: function(config) {
            this.title = config.title || this.title || 'asdee';
            this.template = config.template || this.template;
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
            
            this.$el.draggable({handle: this.$('>header')});
            this.$el.resizable();            
            return this;
        },
        renderContent: function() {
            this.$('>.content').html(this.template());            
        },
        alignTo: function(el, align) {
            // if(align=='right') {
            // 
            //     elLeft = el.offset().left,
            //     rightSpace = $(document).width() - (elLeft + el.width()),
            //     winWidth = this.$el.outerWidth();
            // 
            // if(winWidth < rightSpace) {
            //     // right
            //     win.$el.css({left: tdLeft + td.width()});
            // }
            // else {
            //     // left
            //     win.$el.css({left: tdLeft - winWidth});                    
            // }
            // win.$el.css({top: td.offset().top});
            // 
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

            var top = ((winHeight - height) / 2) + $(window.document).scrollTop(),
                left = ((winWidth - width) / 2) + $(window.document).scrollLeft();

            // var top = 10;

            el.css({left: left, top: top});
        }

    });


    return win;
});

