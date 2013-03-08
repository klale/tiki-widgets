define([
    'jquery',
    'underscore',
    'backbone',
    './base',
    './tools',    
    'mousewheel'
], function($, _, Backbone, gui, tools) {


/**
 * Returns text, with any regular-expression-specific special control characters
 * escaped.
 */
var escapeRegexp = function(text) {
    if (!arguments.callee.sRE) {
        var specials = [ '/', '.', '*', '+', '?', '|', '(', ')', '[', ']', '{', '}', '\\' ];
        arguments.callee.sRE = new RegExp( '(\\' + specials.join('|\\') + ')', 'g' );
    }
    return text.replace(arguments.callee.sRE, '\\$1');
}



var Option = Backbone.View.extend({
    tagName: 'li',

    initialize: function(config) {
        this.model = config.model;
    },

    render: function() {
        this.$el.html(this.model.get('text'));
        if(this.model.disabled)
            this.$el.addClass('disabled');
            
            
        if($.browser.ltie9) {
            this.$('>a').attr('unselectable', 'on');
        }
        return this;
    },
});

var DropdownList = Backbone.View.extend({
    tagName: 'ul', 
    className: 'dropdownlist',
    attributes: {
        tabindex: 0
    },
    events: {
        'mouseover li': 'onMouseOver',
        'mousedown': 'onMouseDown'
    },
    
    initialize: function(config) {
        config = config || {};
        this.overlay = config.overlay;

        // Add a collection for its options
        if(config.options instanceof Backbone.Collection)
            this.options = config.options;
        else
            this.options = new Backbone.Collection(config.options);
            
        // Create a selectable
        this.selectable = new tools.Selectable({
            el: this.el,
            selectables: 'li',
            // triggerChooseOn: ['keydown enter', 'mousedown li']
            chooseOnClick: true,
            chooseOnDblClick: false
        });
        this.selectable.on('choose', this.onSelectableChoose, this);
    },
    renderOne: function(model) {
        var option = new Option({model: model})
        return option.render().el;
    },
    render: function() {
        this.$el.empty();
        
        this.options.each(function(option) {
            this.$el.append(this.renderOne(option));
        }, this);

        // Todo: document this
                        
        if($.browser.ltie9) {
            this.$el.attr('unselectable', 'on');
            this.$el.iefocus();
            this.el.hideFocus = true;
        }
        
        if(this._filterString) {
            var f = this._filterString || '';
            this._filterString = '';
            this.filter(f);
        }
        return this;
    },

    show: function(el) {
        // if(this.$el.is(':visible'))
        //     return;

        if(DropdownList.activeDropdown)
            DropdownList.activeDropdown.hide();
        DropdownList.activeDropdown = this;

        $(document.body).append(this.render().el);

        if(el) {
            console.log('FOO')
            // this.$el.position2($(el), {
            //     anchor: ['tl', 'br'],
            //     // offset: [-5, 5]
            // });
            var offset = $(el).offset(),
                top = offset.top,
                left = offset.left,
                height = $(el).outerHeight();
            this.$el.position3(left, top+height);
        }

        // $(document.body).append(this.render().el);
        this.trigger('show', this);
    },
    hide: function() {  
        if(!this.$el.is(':visible'))
            return;
        if($.browser.ltie9) {
            this.$el.hide();
        }
        else
            this.$el.fadeOut(200);

        DropdownList.activeDropdown = null;
        this.trigger('hide', this);
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
        var chars = $.map(q.split(''), escapeRegexp);
        var re = new RegExp(chars.join('.*'), "i");// "t.*e.*r.*m"
        this.$('.content li').each(function(i, li) {
            var li = $(li);
            var text = li.children('a')[0].innerHTML.toLowerCase();
            if(text.indexOf(q) > -1 || re.test(text))
                li.show();
            else
                li.hide();
        });
        this.selectOne();
    },
    onSelectableChoose: function(e) {
        this._blinking = true;
        e.selected.blink(_.bind(function() {
            this.hide();
            this._blinking = false;
        }, this));
    },
    onMouseOver: function(e) {
        // todo: detach mouseover listener instead of _blinking property
        if(this._blinking || this.$el.is(':animated'))
            return;
        

        this.selectable.selectOne($(e.currentTarget));
    },
    onMouseDown: function(e) {
        // e.stopPropagation();
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
    'DropdownList': DropdownList,
    'ContextMenu': ContextMenu
}


});