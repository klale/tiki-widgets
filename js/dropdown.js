/*
    Dropdownlist
    ============
    - Hides when losing focus
    - Hides when selecting an item
    - Only one dropdownlist will be visible at a time per window
    - Aquires a max-height of browser viewport height, minus its own offset top.
    - Uses Scrollable for overflow
    
    Todo
    -----
    - Support multiple windows (how to get window from somediv.ownerDocument?)
    


    Example
    ==============
    <!-- Admin menu -->
    <li class="admin arrow">
        <a href="#">System</a>
        <div class="dropdownlist">
            <ul>
                <li><a href="index.php?index">Designläge</a></li>                    
                <li><a href="index.php?_p=portal/importlog">Importlogg</a></li>                                                
            </ul>
        </div>
    </li>
*/

gui.DropdownList = Backbone.View.extend({
    tagName: 'div', 
    attributes: {
        'class': 'dropdownlist',
        'tabindex': '0'
    },
    events: {
        'mouseup': 'onContainerMouseUp',
        'keydown': 'onKeyDown',
        'keypress': 'onMaxHeightKeyPress',
        'keyup': 'onKeyUp',
        'blur': 'onBlur',
        'focus': 'focus',
        // 'mouseenter .content': 'onMouseEnter',
        'mouseover .content': 'onMouseOver',
        'click .content': 'onMouseUp',
        'mousedown .content': 'onMouseDown'
    },


    // template: _.template('<div class="dropdownlist maxheight"></div>'),
    // An alternative template used in IE adding a few elements for
    // the dropshadow
    IEExtras: _.template('' +
            '<div><span></span>' +
                '<div class="maxheight"></div>' +
            '</div>' +
            '<div class="bot"><div></div></div>'),
    contentTemplate: _.template('' + 
        '<div class="content"></div>'
    ),
    itemTemplate: _.template(''+
        '<li id="<%= obj.id %>"<% print(obj.disabled ? " class=\\"disabled\\"":"") %>><a><%= obj.text %></a></li>'),

    
    initialize: function(config) {
        config = config || {};
        this.alignTo = config.alignTo || config.triggerEl;
        this.triggerEl = config.triggerEl;
        
        if(config.contentTemplate) {
            this.contentTemplate = config.contentTemplate;
        }
        if(config.itemTemplate) {
            this.itemTemplate = config.itemTemplate;
        }

        // Set "container", "maxheight" and "content" elements
        if($.browser.msie) {
            $(this.el).html(this.IEExtras());
            this.maxheight = this.$('.maxheight')[0];
            this.maxheight.hideFocus = true;
        }
        else {
            $(this.el).addClass('maxheight');
            this.maxheight = this.el;
        }
        // this.content = $(this.contentTemplate()).appendTo(this.maxheight)[0];
        
        $(this.maxheight).html(this.contentTemplate());
        
        // Make scrollable
        this.scrollable = new gui.Scrollable({
            container: this.maxheight, 
            content: this.$('.content')
        });
                
        // Add event handlers
        if(this.triggerEl) {
            $(this.triggerEl).mousedown($.proxy(this.onTriggerMouseDown, this));
        }
    },
    populate: function(data) {
        var tpl = this.itemTemplate;
        var html = $.map(data, function(d) { return tpl(d); });
        this.$('.content').empty().append(html.join(''));
    },
    _show: function(position) {
        if(gui.DropdownList.activeDropdown) {
            $(gui.DropdownList.activeDropdown.el).fadeOut(200);
        }

        // Update max-height
        $(this.maxheight).css('max-height', this.getScrollHeight()+'px');
        
        // Append to body if necessary
        var isAdded = this.el.parentNode == window.document.body;
        if(!isAdded) {
            $(this.el).appendTo(window.document.body);
        }
        
        // Align to a given element, if specified
        // this.align();
        position.call(this)
        this.scrollable.scrollTo(0);
        this.$('.content .selected').removeClass('selected');
        
        // Show and apply scrollbars
        $(this.el).fadeIn(100, $.proxy(function() {
            this.refresh();
        }, this));
        this.focus();
        gui.DropdownList.registerDocument(this.el.ownerDocument);
        gui.DropdownList.activeDropdown = this;
        this.refresh()
    },
    show: function() {
        var pos = function() {
            this.align();
        };
        this._show(pos);
    },
    showAt: function(left, top) {
        var pos = function() {
            $(this.el).css({left: left, top: top});
        }
        this._show(pos);
    },
    align: function(to) {
        var alignTo = $(to || this.alignTo),
            visibleWidth = $(window).width();
        if(alignTo) {
            var css = {
                'left': Math.min(alignTo.offset().left, (visibleWidth-$(this.maxheight).width())-4), 
                'top': alignTo.offset().top + alignTo.height() + 2
            }
            $(this.el).css(css);
        }        
    },
    getScrollHeight: function() {
        return ($(window).height()+$(window).scrollTop()) - parseInt($(this.el).css('top')) - 30;
    },
    refresh: function() {
        if(!this.$('.content').outerHeight()) {
            return;
        }
        this.scrollable.refresh();

        // Set max-height
        $(this.maxheight).css('max-height', this.getScrollHeight()+'px');

        // Adjust things if content has changed
        if(this.scrollable.isOverflowing()) {
            $(this.maxheight).css('height', $(this.maxheight).css('max-height'));
            this.scrollable.refresh();
        }
        else {
            $(this.maxheight).css('height', 'auto');
            this.scrollable.refresh();
            this.scrollable.scrollTo(0);
        }
        
        // Re-align
        // this.align(); 
    },
    isVisible: function() {
        return $(this.el).is(':visible');
    },
    hide: function() {
        if(this.isVisible()) {
            $(this.el).fadeOut(200);
            gui.DropdownList.activeDropdown = null;
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
        if(q == '') {
            // Show all
            this.$('.content li[class="hidden"]').removeClass('hidden').show();
            this.refresh();
            return;
        }    
        
        var hepp = [];
        this.$('.content li').each(function() {
            hepp.push(this);
        });
        
        var chars = $.map(q.split(''), this._escapeRegexp);
        var re = new RegExp(chars.join('.*'), "i");// "t.*e.*r.*m"
        
        q = q.toLowerCase();
        $.each(hepp, function(i, li) {
            var li = $(li);
            var text = li.children('a')[0].innerHTML.toLowerCase();
            if(text.indexOf(q) > -1 || re.test(text)) {
                li.removeClass('hidden')
                li.show(); //100                
            } else {
                li.hide();// 100
                li.addClass('hidden').removeClass('selected');
            }
        });
        this.selectFirst();
        this.refresh();
    },
    scrollIntoView: function(el) {
        var top = $(el).position().top;      
        var height = $(el).height();
        var scrolltop = this.scrollable.getScrollTop();
        var viewportHeight = $(this.maxheight).height();
        
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
    select: function(li) {
        if(li.is('.disabled')) return;

        // deselect current            
        this.$('.content .selected').removeClass('selected');
        // select new
        li.addClass('selected');
        this.scrollIntoView(li);
    },
    getSelected: function() {
        return this.$('.content .selected').jget();
    },
    getSelectedOrFirst: function() {
        var sel = this.$('.content .selected').jget();        
        if(!sel) {
            sel = this.$('.content li:selectable:first').jget();                         
        }
        return sel;
    },    
    selectNext: function() {
        var sel = this.getSelectedOrFirst();
        var next = sel.nextAll('li:selectable:first');        
        if(next[0]) {
            this.select($(next[0]))
        }
    },
    selectPrev: function() {
        var sel = this.getSelected();
        var prev = sel.prevAll('li:selectable:first');        
        if(prev[0]) {
            this.select($(prev[0]));
        }
    },
    selectFirst: function() {
        // var sel = $('li:first-child', this.content).first(); 
        this.$('.content .selected').removeClass('selected');
        var sel = this.$('.content li:selectable:first');        
        if(sel[0]) {
            this.select(sel);
        }
    },
    _focusTriggerEl: function() {
        var el = this.triggerEl;
        if(el) {
            el[0].focus();
            if(el[0].select) {
                el[0].select();
            }
        }        
    },
    focus: function() {
        // console.log('FOC')
        // if(window.document.activeElement == this.maxheight) {
        //     return;
        // }
        if(!this.getSelected()) {
            this.selectFirst();
        }
        $(this.el).removeClass('blur');
        this.maxheight.focus();
    },
    
    onKeyDown: function(e) {
        var c = e.keyCode,
            keys = gui.keys,
            prevdefault = [keys.UP, keys.DOWN, keys.ESCAPE, keys.ENTER, keys.TAB];

        if(c == keys.UP) {
            this.selectPrev();
        }
        else if(c == keys.DOWN) {
            this.selectNext();
        }     
        else if(c == keys.ESCAPE) {
            this.hide();
            this._focusTriggerEl();
            e.stopPropagation();
        }
        else if(c == keys.ENTER) {
            var sel = this.getSelected();
            if(sel) {
                this.trigger('select', this, e);
                this.hide();
            }
        }
        else if(c == keys.TAB) {
            // Only allow tabbing between triggerEl and the dropdown while
            // it's showing.
            this._focusTriggerEl();
        }
        // Prevent default?
        if(_.indexOf(prevdefault, c) !== -1 && !e.ctrlKey && !e.altKey) {
            e.preventDefault();            
        }
    },
    onKeyUp: function(e) {
        if(!e.ctrlKey && !e.altKey) { // dont block eg ctrl+r
            // e.preventDefault();
            // e.stopPropagation();        
        }
    },
    onMaxHeightKeyPress: function(e) {
        var keyCode = e.keyCode;
        var distance = 1000;
        var closest;
        if(e.ctrlKey || e.altKey || e.metaKey)
            return;

        this.$('.content li').each(function(i, li) {
            var html = $(li).children('a').html();
            if(html) {
                var ascii = html[0].toLowerCase().charCodeAt(0)                
                var v = ascii - keyCode;
                if (v<0) {
                    v=v*-1;
                }
                if(v < distance) {
                    closest = li;
                    distance = v
                }
            }
        })
        this.select($(closest));
        e.preventDefault();
        e.stopPropagation()
    },
    onBlur: function() {
        $(this.el).addClass('blur');
        this.trigger('blur', this);
    },
    onMouseOver: function(e) {
        this.focus();
        var sel = this.getSelected();
        if(sel) {
            sel.removeClass('selected');
        }
        var li = $(e.target).parents('li:first');
        if(li.is(':selectable'))        
            li.addClass('selected');
    },
    onMouseDown: function(e) {    
        e.stopPropagation()
    },
    onMouseUp: function(e) {
        var selected = this.$('.content .selected')
        if(selected[0]) {
            this.trigger('select', this, e, selected[0]);
            this.hide();
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
        this.show();
    }
})
$.extend(gui.DropdownList, {
    documents: {},
    activeDropdown: null,
    // lessThanIE9: $.browser.msie && parseInt($.browser.version) < 9,
    // UPDATE: Some graphical bugs in ie9 when using boxshadow, could be due to the underlying
    // iframe.
    isie: $.browser.msie,
    
    registerDocument: function(doc) {
        var docs = gui.DropdownList.documents;
        var self = this;
        if(!docs[doc]) {
            docs[doc] = doc
            

            $('body', doc).mousedown(function() {
                if(self.activeDropdown) {
                    self.activeDropdown.hide();
                }                
            })            

            $(window).resize(function() {
                if(self.activeDropdown) {
                    self.activeDropdown.refresh();
                }
            })
            $(window).scroll(function() {
                if(self.activeDropdown) {
                    self.activeDropdown.refresh();
                }
            })
        }        
    }

})

// var GroupedDropdownList = jkit.DropdownList.extend({
//     /* 
//     NOTE: Docs in progress
//     
//     A dropdown list which can have one or more groups of items in addtion to 
//     normal items.
//     
//     Markup
//     =======
//     <div class="mylist">
//         <!-- Fruits -->
//         <div class="group">
//             <h3><span>Fruits</span></h3>
//             <ul>
//                 <li>Apple</li>
//                 <li>Banana</li>
//                 <li>Kiwi</li>
//             </ul>
//         </div>
//     </div>
//     */
//     groupTemplate: $('' +
//         '<script type="text/x-jquery-tmpl">'+
//             '<div class="group${collapsed ? " collapsed" : ""}">' +
//                 '<h3><span>${title}</span></h3>' +
//                 '<ul></ul>' +
//             '</div>' +
//         '</script>'),
//         
//     itemTemplate: $(''+
//         '<script type="text/x-jquery-tmpl">'+
//             '<li id="${id}">{{html html}}</li>' +
//         '</script>'),
//     
//     init: function(config) {
//         this._super(config);
//         this.maxheight.addClass('grouped')
//     },
//     getSelectedOrFirst: function() {
//         var sel = $('.selected', this.content).jget();
//         if(!sel) {
//             sel = $('.group:first-child', this.content).first(); 
//         }
//         return sel;
//     },
//     selectFirst: function() {
//         // Select first ".group > h3" or first li, whichever comes first
//         var sel = $('.group:first-child > h3, li:first-child', this.content).first(); 
//         if(sel[0]) {
//             this.select(sel);
//         }
//     },
//     selectNext: function() {
//         // Todo: Clean up this method a bit
//         var sel = this.getSelected();
//         if(!sel) {
//             this.selectFirst();
//         }
//         else if(sel.next('li')[0]) {
//             this._super();
//         } else {
//             var group = this.getSelectedGroup();
//             if(sel[0].tagName == 'H3') {
//                 if(group.hasClass('collapsed')) {
//                     var nextH3 = group.next('.group').children('h3').jget()
//                     if(nextH3) {
//                         this.select(nextH3);
//                     }
//                 } else {
//                     this.select(group.find('ul li:first-child'))
//                 }
//             } else if(group) {
//                 var nextgroup = group.next('.group').jget()
//                 if(nextgroup) {
//                     this.select(nextgroup.children('h3'));
//                 }
//             }
//         }
//     },
//     selectPrev: function() {
//         var sel = this.getSelected();
//         if(sel.prev('li')[0]) {
//             this._super();
//         } else {
//             var group = this.getSelectedGroup();
//             if(sel[0].tagName == 'H3') {
//                 group = group.prev('.group').jget()
//                 if(group) {
//                     this.select(this.getLastInGroup(group));
//                 }
//             } else if(group) {
//                 this.select(group.children('h3'));
//             }
//         }
//     },    
//     getLastInGroup: function(group) {
//         if(group.hasClass('collapsed')) {
//             return group.children('h3')
//         }
//         return group.find('li:last-child')
//     },
//     expandGroup: function(group) {
//         group.removeClass('collapsed');
//         // this.scrollable.refresh();
//         this.refresh();
//     },
//     collapseGroup: function(group) {
//         group.addClass('collapsed')
//         if(this._keyboardMode) {
//             this.select(group.find('h3'))
//         }
//         // this.scrollable.refresh();
//         this.refresh();
//     },
//     getSelectedGroup: function() {
//         var sel = this.getSelected();
//         if(sel) {
//             return sel.parents('.group').jget();
//         }
//     },
//     onKeyDown: function(e) {
//         /* Also react to left and right arrow keys */
//         this._super(e);
//         this._keyboardMode = true;
//         var c = e.keyCode,
//             group = this.getSelectedGroup();
//             
//         if(group) {
//             if(c == this.LEFT) {
//                 this.collapseGroup(this.getSelectedGroup());
//             }
//             else if(c == this.RIGHT) {
//                 this.expandGroup(this.getSelectedGroup());
//             }            
//         }    
//     },
//     onGroupHeaderClick: function(e) {
//         var group = $(e.target).parents('.group');
//         if(group.hasClass('collapsed')) {
//             this.expandGroup(group);
//         } else {
//             this.collapseGroup(group);
//         }
//     },
//     onMouseOver: function(e) {
//         this._super(e);
//         this._keyboardMode = false;
//     },
//     onClick: function(e) {
//         this._super(e);
//         
//         // Expand/collapse when clicking the group headers
//         var h3 = $(e.target).parents('h3');
//         if(h3[0]) {
//             var group = $(e.target).parents('.group');
//             if(group.hasClass('collapsed')) {
//                 this.expandGroup(group);
//             } else {
//                 this.collapseGroup(group);
//             }            
//         }
//     }
//     
// })




jQuery.fn.disableSelection = function() { 
    return this.each(function() { 
        // this.onselectstart = function() { return false; }; 
        this.unselectable = "on"; 
        $(this).addClass('disableSelection'); 
    }); 
};


