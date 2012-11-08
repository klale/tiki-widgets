define([
    'jquery',
    'underscore',
    'backbone',
    './base',
    'mousewheel'
], function($, _, Backbone, gui) {


var DropdownList = Backbone.View.extend({
    tagName: 'div', 
    attributes: {
        'class': 'dropdownlist',
        'tabindex': '0'
    },
    events: {
        'mouseup': 'onContainerMouseUp',
        'keydown': 'onKeyDown',
        'keypress': 'onKeyPress',
        'keyup': 'onKeyUp',
        'blur': 'onBlur',
        'focus': 'focus',
        // 'mouseenter .content': 'onMouseEnter',
        'mouseover .content': 'onMouseOver',
        'mouseup .content': 'onMouseUp',
        'mousedown .content': 'onMouseDown'
    },
    contentTemplate: _.template('' + 
        '<div class="content"><ul></ul></div>'
    ),
    itemTemplate: _.template(''+
        '<li id="<%= obj.id %>"<% print(obj.disabled ? " class=\\"disabled\\"":"") %>><a><%= obj.text %></a></li>'),

    
    initialize: function(config) {
        config = config || {};
        this.options = config.options;
        this.overlay = config.overlay;
        
        if(config.contentTemplate) {
            this.contentTemplate = config.contentTemplate;
        }
        if(config.itemTemplate) {
            this.itemTemplate = config.itemTemplate;
        }
        if($.browser.ltie9)
            this.$el.bind('mousemove', $.proxy(this.onIEMouseMove, this));        
    },
    render: function() {
        this.$el.html(this.contentTemplate());
        var tpl = this.itemTemplate;
        var html = $.map(_.compact(this.options), function(d) { return tpl(d); });
        this.$('.content > ul').empty().append(html.join(''));
        this._selectOnMouseUp = false;
                        
        if($.browser.ltie9) {
            this.$('li > a').attr('unselectable', 'on');
            this.$el.attr('unselectable', 'on');
            this.$el.css('border', '1px solid #ccc');
            this.el.hideFocus = true;
            this.$el.iefocus();
        }
        if(this._filterString) {
            var f = this._filterString || '';
            this._filterString = '';
            this.filter(f);
        }
        this.scrollable = new gui.Scrollable({
            container: this.el, 
            content: this.$('.content')
        });        
        return this;
    },
    onIEMouseMove: function(e) {
        if(!this._ieAllowMouseOver) {
            this._ieAllowMouseOver = true;
            this.onMouseOver(e);
        }
    },
    showAt: function(left, top) {
        // Get left and top
        if(_.isObject(left)) {
            var pos = $(left).screen(),
            left = pos.left,
            top = pos.top;
        }
        
        // Hide current dropdown if any
        var active = DropdownList.activeDropdown;
        if(active && active !== this)
            // active.$el.fadeOut(200);
            active.hide();
            
        // Render and insert (so we can measure the height of all options)
        this.render().$el.css({display: 'block', visibility: 'hidden', top: 'auto', bottom: 'auto', height: 'auto', 'max-height': 'auto'});
        $(document.body).append(this.el);
        
        // Positioning
        var height = this.$el.outerHeight(),
            winHeight = $(window).height();
        
        // height + top. Larger than window?
        if(height+top < winHeight) {
            // It fits, just show it
            this.$el.css({left: left, top: top});
        }
        else {
            // Allow the dropdown top be positioned over left and top?
            if(this.overlay) {

                
                // How much larger?                
                if(top-height < winHeight) {
                    // less than top? just move it up a bit
                    var diff = (top+height)-winHeight;
                    this.$el.css({left: left, top: top-diff, bottom: 'auto'});
                }
                else {
                    // It wont fit, glue it to top and bottom and make it scrollable
                    this.$el.css({left: left, top: 0, bottom: 0});
                }
            } 
            // put it above or below left+top, whichever is the largest, and make it scrollable
            else {                
                if(top < winHeight / 2) {
                    // trigger is somewhere on the upper half of the screen, go downwards
                    this.$el.css({left: left, top: top, 'max-height': (winHeight-top)-10});                    
                } else {
                    // go upwards
                    this.$el.css({left: left, top: 0, height: top-30});
                }
                this.scrollable.refresh();
            }
        }
        // Done, now show it
        this.$el.css('visibility', 'visible');
        // this.el.focus();
        this.trigger('show', this);
    },
    hide: function() {
        if(this.$el.is(':visible')) {
            if($.browser.ltie9) {
                this.$el.hide();
                this._ieAllowMouseOver = false;
            }
            else
                this.$el.fadeOut(200);
            DropdownList.activeDropdown = null;
            this.trigger('hide', this);
        }
    },
    
    /**
     * Returns text, with any regular-expression-specific special control characters
     * escaped.
     */
    _escapeRegexp: function(text) {
        if (!arguments.callee.sRE) {
            var specials = [ '/', '.', '*', '+', '?', '|', '(', ')', '[', ']', '{', '}', '\\' ];
            arguments.callee.sRE = new RegExp( '(\\' + specials.join('|\\') + ')', 'g' );
        }
        return text.replace(arguments.callee.sRE, '\\$1');
    },

    filter: function(q) {
        q = q.toLowerCase().replace(/\s/g, '');
        if(q == this._filterString)
            return
        this._filterString = q;
        if(q == '') {
            // Show all
            this.$('.content li:not(:visible)').show();
            return;
        }
        var chars = $.map(q.split(''), this._escapeRegexp);
        var re = new RegExp(chars.join('.*'), "i");// "t.*e.*r.*m"
        this.$('.content li').each(function(i, li) {
            var li = $(li);
            var text = li.children('a')[0].innerHTML.toLowerCase();
            if(text.indexOf(q) > -1 || re.test(text))
                li.show();
            else
                li.hide();
        });
        this.selectFirst();
    },
    scrollIntoView: function(el) {
        var pos = $(el).position();
        if(!this.scrollable || !pos) 
            return;
        
        var top = pos.top;      
        var height = $(el).height();
        var scrolltop = this.scrollable.getScrollTop();
        var viewportHeight = this.$el.height();
        
        // is it already visible?
        var marginTop = parseInt(this.$('.content').css('margin-top'));
                
        if(top < 0 ) {
            // It is above the viewport
            this.scrollable.scrollTo(((scrolltop*-1) + top)*-1); //*-1
        }
        else if(top+height > viewportHeight) {
            // It is below the viewport
            var diff = viewportHeight - (top+height);
            var scrollto = ((scrolltop*-1) - diff) * -1;
            this.scrollable.scrollTo(scrollto);
        }
    },
    refresh: function() {
        this.scrollable.refresh();            
    },
    select: function(li) {
        if(!li[0] || li.is('.disabled')) return;
        // deselect current            
        $(this.selected).removeClass('selected');
        // select new
        li.addClass('selected');
        if(this.scrollable.isOverflowing())
            this.scrollIntoView(li);
        this.selected = li;
    },
    selectNext: function() {
        if(!this.selected) 
            this.select(this.$('li:selectable:first'));
        else
            this.select($(this.selected).nextAll('li:selectable:first'));
    },
    selectPrev: function() {
        var prev = this.selected.prevAll('li:selectable:first');        
        if(prev[0]) {
            this.select($(prev[0]));
        }
    },
    selectFirst: function() {
        this.$('.content .selected').removeClass('selected');
        var sel = this.$('.content li:selectable:first');        
        if(sel[0]) {
            this.select(sel);
        }
    },
    focus: function() {
        this.el.focus();
    },
    _triggerSelect: function(e, li) {
        // invoked when clicking an item or pressing ENTER, do a fast blink
        this._blinking = true;
        $(li).blink($.proxy(function() {
            this.hide();
            this._blinking = false;
            this.trigger('select', this, e, li);
        }, this));
    },    
    onKeyDown: function(e) {
        var c = e.keyCode,
            keys = gui.keys,
            prevdefault = [keys.UP, keys.DOWN, keys.ENTER, keys.TAB];

        if(c == keys.UP) {
            this.selectPrev();
        }
        else if(c == keys.DOWN) {
            this.selectNext();
        }     
        else if(c == keys.ENTER && this.selected) {
            this._triggerSelect(e, this.selected);
        }
        // Prevent default?
        if(_.indexOf(prevdefault, c) !== -1 && !e.ctrlKey && !e.altKey) {
            e.preventDefault();  
        }
    },
    onKeyUp: function(e) {
        if(!e.ctrlKey && !e.altKey) { // dont block eg ctrl+r
            e.preventDefault();
            e.stopPropagation();
        }
    },
    onKeyPress: function(e) {
        if(e.ctrlKey || e.altKey || e.metaKey)
            return;
        
        var s = String.fromCharCode(e.charCode);
        var li = this.$('.content li:visible:containsre(/^'+s+'/i):first')
        this.select(li);
        e.preventDefault();
        e.stopPropagation();
    },
    onBlur: function() {
        this.trigger('blur', {dropdown: this});
    },
    // onMouseEnter: function(e) {
    //     this.focus();
    // },
    onMouseOver: function(e) {
        // todo: detach mouseover listener instead of _blinking property
        if(this._blinking || this.$el.is(':animated') || ($.browser.ltie9 && !this._ieAllowMouseOver))
            return;
        
        this._selectOnMouseUp = true;    
        if(this.selected)
            this.selected.removeClass('selected');
        var li = $(e.target).parents('li:first');
        if(li.is(':selectable'))        
            this.select(li)
    },
    onMouseDown: function(e) {
        this._selectOnMouseUp = true;    
        e.stopPropagation();
    },
    onMouseUp: function(e) {
        var selected = this.$('.content .selected');
        if(selected[0] && this._selectOnMouseUp) {
            this._triggerSelect(e, selected[0]);
        }
        e.preventDefault()
        e.stopPropagation()
    },
    onContainerMouseUp: function(e) {
        e.preventDefault()
        e.stopPropagation()        
    },
    onClick: function(e) {
        e.stopPropagation();
    },
    onTriggerMouseDown: function(e) {
        e.stopPropagation();
        this.showAt(this.el);
    }
});


var ContextMenu = DropdownList.extend({
    initialize: function(config) {
        DropdownList.prototype.initialize.call(this, config);
        this.overlay = true;
    },
    showAt: function(left, top) {
        DropdownList.prototype.showAt.call(this, left, top);
        this.focus();
    },
    onBlur: function() {
        DropdownList.prototype.onBlur.call(this);
        this.hide();
    } 
});


return {
    DropdownList: DropdownList,
    ContextMenu: ContextMenu
}


});