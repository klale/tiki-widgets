define([
  'jquery',
  'underscore',
  'backbone',
  './util',
  './controlmodels',
  './controls',
  './calendar',
  './menu',
  './tools',
  './glue',
  './traits'
], function($, _, Backbone, Util, ControlModels, Controls, Calendar, Menu, Tools, Glue, Traits) {
  'use strict';


  var ItemView = Tools.View.extend('FilteringDropdown.ItemView', {
    tagName: 'li',
    initialize: function(config) {
      this.textField = config.textField || 'text';
      this.listenTo(this.model, 'change', this.render);
    },
    render: function() {
      this.$el.text(this.model.get(this.textField));
      this.$el.toggle(!this.model.get('hidden'));
      this.$el.attr('data-id', this.model.id);
      return this;
    }
  });


  var OptionsView = Tools.View.extend('FilteringDropdown.OptionsView', {
    className: 'tiki-menu tiki-filteringdropdown-optionsview',
    attributes: {tabindex: -1},
    events: {
      'click li': 'onLIClick',
      'mouseenter li': 'onLIMouseEnter',
      'focusleave': 'onFocusLeave'
    },
    hotkeys: {
      'keydown return': 'onReturnKeyDown',
      'keydown esc': 'onEscKeyDown'
    },
    mixins: [Tools.ModelToElement],

    initialize: function(config) {
      _.bindAll(this, 'addOne', 'removeOne');
      this.$el.scrollMeOnly();
      this.$el.html('<ul></ul>');
      var config = config || {};

      this.textField = config.textField;

      this.navigable = new Tools.Navigable({
        el: this.el,
        collection: this.collection,
        selector: '>ul>li:visible'
      });

      this.listenTo(this.collection, {
        add: this.addOne,
        remove: this.removeOne,
        reset: this.reset});
    },
    render: function() {
      this.empty();
      this.collection.each(this.addOne);
      return this;
    },
    show: function(alignToEl) {
      // Show it now
      if (!this.el.parentNode) {
        $(document.body).append(this.render().el);
        this.render();
      }

      // Given an inline element, position and resize this.el
      var pos = Util.fitInViewport(alignToEl, this.$el.width());
      this.$el.css({
        left: pos.left,
        top: pos.top,
        bottom: pos.bottom,
        maxHeight: pos.height
      });
      this.trigger('show', {optionsView: this});
    },
    hide: function(e) {
      this.$el.detach();
      this.trigger('hide', {optionsView: this, fromEvent: e});
    },
    focus: function() {
      this.el.focus();
    },
    addOne: function(model) {
      var view = new ItemView({model: model, textField: this.textField});
      this.views[model.cid] = view;
      this.$('>ul').append(view.render().el); //
    },
    removeOne: function(model) {
      var view = this.views[model.cid];
      if (view) {
        this.views[model.cid].remove();
        delete this.views[model.cid];
      }

    },
    reset: function(models) {
      this.collection.each(this.removeOne);
      _.each(models, this.addOne);
    },
    onLIClick: function(e) {
      var model = this.getModel(e.currentTarget);
      this.trigger('select', {model: model});
    },
    onLIMouseEnter: function(e) {
      $(e.currentTarget).make('active');
    },
    onReturnKeyDown: function(e) {
      var visibleOpts = this.collection.filter(function(opt) { return !opt.get('hidden'); });
      if (visibleOpts.length === 1) {
        // If there is only 1 visible option, select it
        this.trigger('select', {model: visibleOpts[0]});
      }
      else {
        // ..otherwise select the one having the class ".active"
        var activeEl = this.$('>ul>li.active');
        if (activeEl[0]) {
          this.trigger('select', {model: this.getModel(activeEl)});
        }
      }
    },
    onEscKeyDown: function(e) {
      this.hide(e);
    },
    onFocusLeave: function(e) {
      this.hide(e);
    }
  });



  var View = Tools.View.extend('FilteringDropdown.View', {
    className: 'tiki-dropdown',
    attributes: {tabindex: 0},
    template: _.template(''+
      '<span><%= text || emptyText %></span>'+
      '<button tabindex="-1"></button>'
    ),
    events: {
      'mousedown': 'onMouseDown',
      'blur': 'onBlur',
      'focus': 'onFocus',
      'keypress': 'onKeyPress'
    },
    hotkeys: {
      'keydown down': 'onDownKeyDown',
      'keydown space': 'onSpaceKeyDown',
    },
    defaultmodel: Controls.DropdownModel,
    mixins: [Controls.ControlView],

    initialize: function(config) {
      config = config || {};
      _.bindAll(this, 'render', 'onKeyPress', 'onBackspaceKeyDown');
      if(!this.model)
        this.model = config.model || new (Util.pop(config, 'modeltype', '') || this.defaultmodel)(config);

      Controls.ControlView.initialize.call(this, config);
      this.textField = config.textField || "text";
      this.valueField = config.valueField;

      var options = this.model.get('options');
      this.filterable = new Tools.Filterable({
        collection: options,
        textAttr: config.textField || 'text',
      });

      this.listenTo(this.filterable, 'filterchange', this.render);
      this.listenTo(this.model, 'change', this.render);

      // Create the options view
      this.optionsView = this.createOptionsView();
      this.listenTo(this.optionsView, 'select', this.onOptionsViewSelect);
      this.listenTo(this.optionsView, 'hide', this.onOptionsViewHide);
      this.optionsView.$el.on('keypress', this.onKeyPress);
      this.optionsView.$el.on('keydown', null, 'backspace', this.onBackspaceKeyDown);
    },

    render: function() {
      this.$el.attr('name', this.model.get('name'));
      var filter = this.filterable.getFilter();
      if (filter) {
        this.$el.html(this.template({text: filter, emptyText: ''}));
      }
      else {
        var text = this.renderText();
        this.$el.html(this.template({text: text, emptyText: this.model.emptyText}));
      }
      this.$el.toggleClass('tiki-disabled', !!this.model.get('disabled'));
      this.$el.toggleClass('is-filtering', !!filter);
      if (this.optionsView) this.optionsView.$el.toggleClass('is-filtering', !!filter);
      return this;
    },

    renderText: function() {
      var value = this.model.get('value');
      return value ? Util.getattr(value, this.textField) : '';
    },

    createOptionsView: function() {
      return new OptionsView({
        collection: this.model.get('options'),
        textField: this.textField
      });
    },

    focus: function() {
      this.$el.focus();
    },

    showOptionsView: function() {
      if(this.optionsView.$el.is(':visible')) {
        return;
      }
      var w = $(this.el).outerWidth();
      this.optionsView.$el.css('min-width', w);
      this.optionsView.show(this.el);
      this.optionsView.focus();
    },

    hideOptionsView: function(e) {
      this.optionsView.hide();
    },

    focusOptionsView: function() {
      this.optionsView.el.focus();
    },

    onDownKeyDown: function(e) {
      this.showOptionsView();
      e.preventDefault();
    },

    onBackspaceKeyDown: function(e) {
      e.preventDefault();
      var filter = this.filterable.getFilter();
      // pop trailing char in textbox
      filter = filter.length > 1 ? filter.slice(0, -1) : '';
      this.filterable.setFilter(filter);
    },

    onKeyPress: function(e) {
      // Handle typing inside menu
      if (e.charCode <= 32) {
        e.preventDefault();
        return;
      }
      var val = this.filterable.getFilter() + String.fromCharCode(e.charCode);
      if (val) {
        this.showOptionsView();
        this.filterable.setFilter(val);
      }
    },
    onSpaceKeyDown: function(e) {
      e.preventDefault();
      this.showOptionsView();
    },

    onMouseDown: function(e) {
      if(this.optionsView.$el.is(':visible')) {
        this.optionsView.hide();
      }
      if(this.$el.closest('.tiki-disabled').length) {
        e.preventDefault(); // don't focus
        return;
      }

      this.showOptionsView();
      e.stopPropagation();
      e.preventDefault();
    },

    onOptionsViewSelect: function(e) {
      this.model.value = e.model;
      this.hideOptionsView();
      this.filterable.setFilter('');
      this.focus();
    },

    onOptionsViewHide: function(e) {
      this.filterable.setFilter('');
      if (e.fromEvent && e.fromEvent.keyCode === Util.keys.ESC) {
        this.focus();
      }
    },
  });

  Controls.register.filteringDropdown = View;

  return {
    ItemView: ItemView,
    OptionsView: OptionsView,
    View: View,
  };

});