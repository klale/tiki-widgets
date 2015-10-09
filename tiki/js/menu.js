define([
    'jquery',
    'underscore',
    'backbone',
    './util',
    './tools',
    './traits'
], function($, _, Backbone, Util, Tools, Traits) {
    'use strict';


    var Option = {};
    Option.Model = Traits.Model.extend('Menu.Option.Model', {
        traits: function() {
            return {
                disabled: Traits.Bool(),
                submenu: Traits.Instance(function() { return Menu.Model; }),
                expanded: Traits.Bool()
            };
        },
        defaults: {
            disabled: false,
            expanded: false
        }
    });

    Option.View = Tools.View.extend('Menu.Option.View', {
        className: 'selectable',
        tagName: 'li',
        template: _.template('<span><%=obj.text%></span><i>&#xe10a;</i>'),

        initialize: function(config) {
            if(config.optionTemplate) {
                this.template = config.optionTemplate;
            }
            // Todo: assumes id extists on creation and never changes. OK?
            this.$el.attr('data-id', this.model.id);
        },
        render: function() {
            var obj = _.extend(this.model.toJSON(), {text: this.renderText()});
            var html = this.template(obj);
            this.$el.html(html);
            if(this.model.get('disabled'))
                this.$el.addClass('disabled').removeClass('selectable');

            if(this.model.get('selected'))
                this.$el.addClass('active selected');

            this.$el.toggleClass('submenu', !!this.model.get('submenu'));
            if($.browser.ltie9) {
                this.$('>a').attr('unselectable', 'on');
            }
            return this;
        },
        renderText: function() {
            var textField = this.model.collection.textField || "text";
            return Util.getattr(this.model, textField);
        }
    });


    var Options = Tools.Collection.extend('Menu.Options', {
        model: Option.Model
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
            {id: 'bar', text: 'Bar', disabled: true},
            {id: 'lax', text: 'Lax'},
            '-',
            {id: 'filters', text: 'Filters', submenu: {
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
    opt.set('disabled', true);
    m.model.get('options').add({id: 'helo', text: 'I am new option'})

    // Add handler
    m.on('select', function(e) {
        consolse.log('you chose: ', e);
    });

    */
    var Menu = {};
    Menu.Model = Traits.Model.extend({
        traits: {
            options: new Traits.CollectionM() // Options
        }
    });
    Menu.BaseView = Tools.View.extend({
        tagName: 'div',
        className: 'tiki-menu',
        attributes: {
            tabindex: 0
        },
        events: {
            'mouseenter li.selectable': 'onSelectableMouseEnter',
            'keydown': 'onKeyDown',
            'mousedown': 'onMouseDown',
            'mouseup': 'onMouseUp',
            'scroll': 'onScroll'
        },
        hotkeys: {
            'keydown right': 'onRightKeyDown',
            'keydown left': 'onLeftKeyDown',
            'keydown esc': 'onESCKeyDown',
            'keydown return': 'onReturnKeyDown'
        },
        _isroot: true,
        mixins: [Tools.ModelToElement],
        ui: {
            'ul': '>ul'
        },
        OptionClass: Option,

        initialize: function(config) {
            config = config || {};
            _.bindAll(this, 'onShowTimeout');
            this.views = {};

            if(!this.model) {
                if(!config.options)
                    config.options = [];
                this.model = new Menu.Model(config);
            }

            this.textField = this.model.options.textField || "text";

            if(config.options.optionTemplate) {
                this.optionTemplate = config.options.optionTemplate;
            }

            var options = this.model.get('options');
            this.collection = options;

            // Observe the options-collection
            options.on('add', this.addOne, this);
            options.on('remove', this.removeOne, this);
            options.on('reset', this.render, this);
            options.on('change:expanded', this.onExpandedChange, this);

            this.selector = 'li.selectable';
            // Create a Selectable
            this.navigable = new Tools.Navigable({
                el: this.el,
                selector: this.selector,
                collection: options
            });

            this.$el.scrollMeOnly();
            if($.browser.ltie10)
                this.$el.attr('unselectable', 'on');
        },
        render: function() {
            this.empty().$el.html('<ul></ul>');
            this.bindUI();
            this.model.get('options').each(function(option) {
                this.addOne(option);
            }, this);
            return this;
        },
        addOne: function(option) {
            // var View = (option.get('text') == '-' ? Spacer : Option.View),
            //     view = new View({model: option});

            var view;
            if (option.get(this.textField) == '-') {
                view = new Spacer({model: option});
            } else {
                var conf = { model: option };
                if(this.optionTemplate) {
                    conf.optionTemplate = this.optionTemplate;
                }
                view = new this.OptionClass.View(conf);
            }

            this.views[option.cid] = view;
            this.ui.ul.append(view.render().el);

            // render a submenu as well?
            if(option.get('submenu') && option.get('expanded'))
                this._showSubmenu(option);
        },
        removeOne: function(option) {
            this.views[option.cid].remove();
        },

        _showSubmenu: function(model) {
            var menu = new Menu.View(model.get('submenu'));
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
        _select: function() {
            var el = this.$('.active:first');
            this.$('.selected').removeClass('selected');
            var model = this.getModel(el);
            if(!model) return;

            this._lock = true;
            el.blink(_.bind(function() {
                this._hideAll();
                this._lock = false;
                this.trigger('select', model);
            }, this), {className: 'active selected'});
        },
        show: function(options) {
            var opt = Util.defs(options, {
                hideOther: true,
                focus: true,
                alignTo: false,
                left: false,
                top: false});


            var availHeight = $(window).height();
            this.$el.css('max-height', availHeight);

            if(opt.hideOther && Menu.BaseView.active)
                Menu.BaseView.active.hide();
            Menu.BaseView.active = this;

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


            // Scroll down to options.active
            if(opt.alignTo && opt.active) {
                var alignTo = opt.alignTo.of,
                    active = this.getEl(options.active);
                if(active[0] && availHeight < this.ui.ul.height()) {
                    active.make('active');
                    var spanOffset = alignTo.offset().top - $(window).scrollTop();
                    this.$el.scrollTop(active.position().top - spanOffset);
                }
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
                Menu.BaseView.active = null;
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
            Menu.BaseView.__super__.trigger.apply(this, arguments);
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

        onSelectableMouseEnter: function(e) {
            // todo: detach mouseover listener instead of _lock property
            if(this._lock || this.$el.is(':animated'))
                return;
            $(e.currentTarget).make('active');
        },
        onRightKeyDown: function(e) {
            var model = this.selectable.getFirstSelected();
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
        searchString: '',
        searchLastKeyPress: Date.now(),
        onKeyDown: function(e) {
            this._okMouseUp = true;
            var now = Date.now();
            if (now - this.searchLastKeyPress > 500) {
                this.searchString = String.fromCharCode(e.keyCode);
            } else {
                this.searchString += String.fromCharCode(e.keyCode);
            }
            this.searchLastKeyPress = now;

            var textField = this.model.options.textField;
            var searchString = this.searchString;
            var match = this.model.options.find(function(option) {
                return option.get(textField).substring(0,searchString.length).toUpperCase() === searchString;
            });
            if (match) {
                this.$el.find('.active').removeClass('active');
                this.views[match.cid].$el.addClass("active");
            }
        },
        onScroll: function(e) {
            if(this._mousedown) {
                // This means we're dragging the scrollbar. Ignore the upcoming mouseup
                // IE correctly fires mousedown on a scrollbar, but it does not fire a mouseup.
                if(!$.browser.msie)
                    this._okMouseUp = false;
            }
            this._lock = true;
            this.onScrollDebounce();
        },
        onScrollDebounce: _.debounce(function() {
            this._lock = false;
        }, 150),
        onMouseDown: function(e) {
            this._mousedown = e;
        },
        onMouseUp: function(e) {
            if(this._okMouseUp && !$(e.target).closest('li.disabled').length)
                this._select();
            this._okMouseUp = true;
            this._mousedown = false;
        },
        onShowTimeout: function() {
            this._okMouseUp = true;
        },
    });

    Menu.View = Menu.BaseView.extend({
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
        Menu: Menu.View,
        BaseView: Menu.BaseView,
        Option: Option,
        Spacer: Spacer
    };

});