define([
    'jquery',
    'underscore',
    'backbone',
    './util',
    './tools',
    './traits'
], function($, _, Backbone, Util, Tools, Traits) {
    'use strict';

    // =========
    // = Utils =
    // =========
    function makeview(view, model) {
        if(view.prototype.render) // its a View
            return new view({model: model});
        else // a callable returning a View
            return view(model);
    }

    // ==========================
    // = Models and collections =
    // ==========================
    var OptionModel = Backbone.Model.extend({
        defaults: {
            enabled: true,
            submenu: null,  // new MenuModel()
            expanded: false
        },
        parse: function(json, xhr) {
            if(json.submenu) 
                json.submenu = new MenuModel(json.submenu, {parse: true});
            return json;
        }
    });
    
    var Options = Backbone.Collection.extend({
        model: OptionModel
    });
    
    var MenuModel = Traits.Model.extend({
        traits: {
            options: new Traits.Collection(Options)
        },
        defaults: function() {
            return {
                options: null
            };
        }
    });
    

    

    // =========
    // = Views =
    // =========
    var Option = Backbone.View.extend({
        className: 'selectable',
        tagName: 'li',
        template: Util.template('<span>${obj.text}</span><i>&#xe10a;</i>'),

        initialize: function() {
            // Todo: assumes id extists on creation and never changes. OK?
            this.$el.attr('data-id', this.model.id)
        },
        render: function() {
            this.$el.html(this.template(this.model.toJSON()));
            if(!this.model.get('enabled'))
                this.$el.addClass('disabled').removeClass('selectable');
            
            this.$el.toggleClass('submenu', !!this.model.get('submenu'));
            if($.browser.ltie9) {
                this.$('>a').attr('unselectable', 'on');
            }
            return this;
        }
        
    });
    var Spacer = Backbone.View.extend({
        tagName: 'li',
        className: 'spacer',

        initialize: function(config) {
            this.config = config;
        },
        render: function() {
            return this;
        }
    });


    /*
    // Create a menu
    var m = new menu.Menu({
        options: [
            {id: 'foo', text: 'Foo'},
            {id: 'bar', text: 'Bar', enabled: false},
            {id: 'lax', text: 'Lax', view: LaxOption},
            '-',
            {id: 'filters', text: 'Filters', submenu: {
                view: MySpecialMenu,
                options: [
                    {id: 'foo2', text: 'Foo 2'},
                    {id: 'bar2', text: 'Bar 2'},
                    {id: 'lax2', text: 'Lax 2'},
                ]            
            }}
        ]
    })
    
    // Hide any other active menu, render and if necessary, append to body.
    m.show();  triggers "show"

    // Align to otherEl 
    m.alignTo(otherEl, alignment_options);

    // detach menu view, triggers "hide"
    m.hide(); 

    // Play with the options
    var opt = m.options.at(4);
    opt.set('expanded', true);
    opt.set('enabled', false);
    m.model.get('options').add({id: 'helo', text: 'I am new option'})

    // Add handler
    m.on('select', function(e) {
        consolse.log('you chose: ', e);
    });
    
    */
    var MenuBase = Tools.View.extend({
        tagName: 'div', 
        className: 'tiki-menu',
        attributes: {
            tabindex: 0
        },
        events: {
            'mouseover li': 'onMouseOver',
            'click li.selectable': 'onSelectableClick',
            'keydown': 'onKeyDown',
            'keyup': 'onKeyUp',
            'mouseup': 'onMouseUp'
        },
        hotkeys: {
            'keydown right': 'onRightKeyDown',
            'keydown left': 'onLeftKeyDown',
            'keydown esc': 'onESCKeyDown',
            'keydown return': 'onReturnKeyDown'
        },
        _isroot: true,
        initialize: function(config) {
            config = config || {};
            _.bindAll(this, 'onShowTimeout', 'onKeyUpTimeout', 'onSelectedAdd', 'onSelectedRemove');
            this.views = {};
            if(!config.model)
                this.model = new MenuModel(config, {parse: true});
            
            // Observe the options-collection
            var options = this.model.get('options');
            options.on('add', this.addOne, this);
            options.on('remove', this.removeOne, this);
            options.on('change:expanded', this.onExpandedChange, this);
            
            // Create a Selectable
            this.selectable = new Tools.Selectable({
                el: this.el,
                selector: 'li.selectable',
                selectables: options,
            });
            this.selectable.model.get('selected').on({
                'add': this.onSelectedAdd,
                'reset': this.onSelectedAdd,
                'remove': this.onSelectedRemove});

            this.$el.scrollMeOnly();
            if($.browser.ltie10)
                this.$el.attr('unselectable', 'on');                     
        },
        render: function() {
            this.$el.empty().append('<ul></ul>');
            this.model.get('options').each(function(option) {
                this.addOne(option);
            }, this);
            return this;
        },
        addOne: function(option) {
            var view = makeview(option.get('view') || Option, option);
            this.views[option.cid] = view;
            this.$('>ul').append(view.render().el);
            
            // render a submenu as well?
            if(option.get('submenu') && option.get('expanded'))
                this._showSubmenu(option);
        },
        removeOne: function(option) {
            this.views[option.cid].remove();
        },
        
        _showSubmenu: function(model) {
            var menu = makeview(model.get('view') || Menu, model.get('submenu'));
            menu.show({hideOther:false, focus:false}).alignTo(this.views[model.cid].el, {at: 'right top'});

            // set silly properties, factor away these
            menu._isroot = false;
            menu._parentmenu = this;
            this._submenu = menu;            
        },
        _hideSubmenu: function(model) {
            this._submenu.hide();
            this._submenu = null;
        },        
        _hideAll: function() {
            if(this._submenu) 
                this._submenu.hide();
            for(var menu=this; menu; menu=menu._parentmenu) 
                menu.hide();
        },
        _select: function(model) {
            var model = this.selectable.model.get('selected').at(0),
                el = this.selectable.getEl(model);
            this._lock = true;
            el.blink(_.bind(function() {
                this._hideAll();
                this._lock = false;
                this.trigger('select', model);                
            }, this));
        },        
        
                        
        show: function(options) {
            var opt = Util.defs(options, {
                hideOther: true,
                focus: true,
                alignTo: false,
                left: false,
                top: false});
               
            var availHeight = $(this.el.ownerDocument.documentElement).height() - 10; // ~10px dropshadow
            this.$el.css('max-height', availHeight);
                        
            if(opt.hideOther && MenuBase.active) 
                MenuBase.active.hide();
            MenuBase.active = this;
            
            // implicit dom insert
            if(!this.el.parentElement)
                $(document.body).append(this.render().el);

            if(opt.alignTo) {
                this.alignTo(opt.alignTo.of, opt.alignTo);
                if(opt.focus)
                    this.$el.focus();                
            } 
            else if(opt.left !== false && opt.top !== false) {
                this.$el.css({left: opt.left, top: opt.top});
                if(opt.focus)
                    this.$el.focus();                
            }
            this._okMouseUp = false;
            window.setTimeout(this.onShowTimeout, 350);            
            this.trigger('show', this);
            return this;
        },
        hide: function() {  
            if(!this.$el.is(':visible'))
                return;
        
            this.$el.fadeOutFast({detach:true});
            this.trigger('hide', this);
            if(this._isroot)
                MenuBase.active = null;
        },
        alignTo: function(el, options) {            
            this.$el.position(_.defaults(options || {}, {
                my: 'left top',
                at: 'left bottom',
                of: el,
                collision: 'flip fit'
            }));
        },
        trigger: function() {
            // overload Backbone.Event.trigger to pass events upward the menu chain
            MenuBase.__super__.trigger.apply(this, arguments);
            if(this._parentmenu)
                this._parentmenu.trigger.apply(this._parentmenu, arguments);
        },
        
        onExpandedChange: function(model) {
            if(!model.get('submenu')) 
                return;
            if(model.get('expanded'))
                this._showSubmenu(model);
            else
                this._hideSubmenu(model);
        },        

        onSelectedAdd: function(model) {
            if(model.get('submenu')) 
                model.set('expanded', true);
            this.el.focus();
        },
        onSelectedRemove: function(model) {
            if(model.get('submenu'))
                model.set('expanded', false);
        },        
        onMouseOver: function(e) {
            // todo: detach mouseover listener instead of _lock property
            if(this._lock || this.$el.is(':animated'))
                return;
                
            var target = $(e.currentTarget),
                sel = this.selectable;
            if(target.is('li.selectable')) {
                var model = sel.getModel(target);
                sel.model.selectOne(model);
                target.addClass('head tail');
            }
        },
        onSelectableClick: function(e) {
            // clicking a submenu li should not propagate to parent menu's li
            // (causing more than one 'choose' event)
            this._select();
            
            e.stopPropagation();
        },
        onRightKeyDown: function(e) {
            var model = this.selectable.getSelectedModel();
            if(!model)  
                return;
            model.set('expanded', true);
            model.get('submenu').get('options').at(0);
            this._submenu.el.focus();                
            this._submenu.selectable.selectOne();
        },
        onLeftKeyDown: function(e) {
            if(!this._parentmenu)
                return;
            var model = this._parentmenu.selectable.getSelectedModel();
            model.set('expanded', false);
            this._parentmenu.el.focus();
        },
        onESCKeyDown: function(e) {
            this._hideAll();
        },
        onReturnKeyDown: function(e) {
            this._select();
        },
        onKeyDown: function(e) {
            this._okMouseUp = true;
            if(Util.isArrowKey(e))
                this._lock = true;
        },
        onKeyUp: function() {
            window.setTimeout(this.onKeyUpTimeout, 100);
        },
        onMouseUp: function(e) {
            if(this._okMouseUp)
                this._select();
            this._okMouseUp = true;
        },
        onBeforeChoose: function(e) {
            e.cancel = !this._okMouseUp;
        },
        onShowTimeout: function() {
            this._okMouseUp = true;
        },
        onKeyUpTimeout: function() {
            this._lock = false;
        }
    });

    var Menu = MenuBase.extend({
        events: {
            'blur': 'onBlur'
        },
        merge: ['events'],
        
        onBlur: function() {
            // When a focused menu loses focus to anything but another menu,
            // hide this menu and any sub/parent menus.
            window.setTimeout(_.bind(function(e) {
                var focused = this.el.ownerDocument.activeElement;
                if(!$(focused).is('.tiki-menu')) 
                    this._hideAll();
            }, this), 1);
        }
    });

    return {
        MenuBase: MenuBase,
        Menu: Menu,
        Spacer: Spacer
    };

});