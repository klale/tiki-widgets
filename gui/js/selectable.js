define([
    'jquery',
    'underscore',
    'backbone',
    'gui/base',
], function($, _, Backbone, gui) {


    var Selectable = Backbone.View.extend({
        events: {
            'mousedown': 'onMouseDown'
        },
        hotkeys: {
            'keydown meta+a': 'onMetaAKeyDown'
        },
        initialize: function(config) {
            _.bindAll(this, 'onSelectableMouseDown', 'chooseSelected', 'onSelectableKeyDown')
            this.selectables = config.selectables;
            this.collection = config.collection; // optional
            this.keynav = config.keynav === false ? false : true; // bool, true default, false to disable key navigation

            if(this.keynav)
                this.$el.on('keydown', this.onSelectableKeyDown);            
            this.$el.on('mousedown', config.selectables, this.onSelectableMouseDown);
            
            // Todo: Replace these silly arguments with the out-commented code below?
            if(config.chooseOnDblClick)
                this.$el.on('dblclick', config.selectables, this.chooseSelected);
            if(config.chooseOnClick)
                this.$el.on('click', config.selectables, this.chooseSelected);
            if(config.chooseOnMouseUp)
                this.$el.on('mouseup', config.selectables, this.chooseSelected);
            
        },

        off: function() {
            this.$el.off('mousedown', this.selectables, this.onSelectableMouseDown);
            this.$el.off('dblclick', this.selectables, this.chooseSelected);
            this.$el.off('click', this.selectables, this.chooseSelected);
            if(this.keynav)
                this.$el.off('keydown', this.onSelectableKeyDown);            
        },
        chooseSelected: function(e) {
            this.trigger('beforechoose', e);
            if(e.cancel)
                return;
            
            var el = $(e.currentTarget),
                e = {selected: el};
            if(this.collection)
                e.model = this.collection.at(el.index())

            this.selectOne(el);
            this.trigger('choose', e);
        },
        getSelected: function() {
            return this.$(this.selectables).filter('.selected');
        },
        getSelectedModels: function(collection) {
            collection = collection || this.collection;
            return this.getSelected().map(function() {
                return collection.at($(this).index());
            }).toArray();
        },
        getSelectedModel: function(collection) {
            return (collection || this.collection).at(this.getSelected().filter(':first').index());
        },
        getSelectables: function() {
            return this.$(this.selectables);
        },
        toggle: function(el) {
            if($(el).is('.selected')) 
                this.unselect(el);
            else
                this.select(el);
        },
        select: function(el) {
            if(_.isNumber(el))
                el = this.$(this.selectables+':nth-child('+el+')');

            var ev = {
                el: el[0],
                selected: this.getSelected()
            };
            if(this.collection)
                ev.model = this.collection.at(el.index());
                
            $(el).addClass('selected');
            this.trigger('select', ev);
            this.trigger('change');
        },
        selectOne: function(el) {
            if(!el || !el[0])
                el = this.$(this.selectables+':visible:first');

            if(!el || !el.is(this.selectables)) 
                return;
            


            if(!el.hasClass('selected')) {
                this.unselectAll();                
                this.select(el);
            }

            el.make('head').make('tail');
        },
        selectAll: function() {
            this.unselectAll();
            this.$(this.selectables).addClass('selected');
            this.$(this.selectables).first().addClass('tail');
            this.$(this.selectables).last().addClass('head');
            this.trigger('select');
            this.trigger('change');
        },
        setSelection: function(items) {
            _(gui.listify(items)).each(function(item) {
                // item can be an index, an elemenet
                this.select(item);
            }, this)
        },
        unselect: function(el) {
            var ev = {el: el[0]};
            if(this.collection)
                ev.model = this.collection.at(el.index());
            
            $(el).removeClass('selected');
            this.trigger('unselect', ev);
            this.trigger('deselect'); // legacy
            this.trigger('change');
            
            if(this.collection)
                ev.model = this.collection.at(el.index())            
        },

        unselectAll: function() {
            this.$('.selected').each(_.bind(function(i, el) {
                this.unselect($(el));
            }, this))
            this.$('.selected').removeClass('selected');
            this.$('.head').removeClass('.head');
            this.$('.tail').removeClass('.tail');
        },
        moveUp: function(steps) {

        },
        moveDown: function(steps) {
        
        },
        selectRight: function() {
            
        },
        selectLeft: function() {
            
        },
        selectUp: function() {
            
        },
        selectDown: function() {
            
        },   
        
        onMouseDown: function(e) {
            if(!$(e.target).closest(this.el, this.selectables).length || e.target == this.el) {
                this.unselectAll();
            }
        },
        onMetaAKeyDown: function(e) {
            if(this.keynav) {
                this.selectAll();
                e.preventDefault();
            }
        },
        onSelectableMouseDown: function(e) {
            var el = $(e.currentTarget);
        
            if(e.metaKey) {
                this.toggle(el);
                el.make('head');
            }
            else if(e.shiftKey) {
                var a = this.$('.tail').index(),
                    b = el.index(),
                    start = Math.min(a,b),
                    end = Math.max(a,b);
                this.unselectAll();
                this.$(this.selectables).slice(start, end+1).addClass('selected');
                el.make('head');
            
                // Allow text selection, but no shift-click text selection
                e.preventDefault();
                gui.iepreventTextSelection(e);
            }
            else {
                this.selectOne(el);
                // this.trigger('choose', {selected: el});
            }
        },   
        onSelectableKeyDown: function(e) {
            if(e.which == gui.keys.ENTER) {
                var el = this.getSelected(),
                    ev = {selected: el};
                if(el[0]) {
                    if(this.collection)
                        ev.model = this.collection.at(el.index())
                    this.trigger('choose', ev);
                }
                e.preventDefault();
            }
            else if(gui.isArrowKey(e)) {
                if(!e.ctrlKey && !e.metaKey && !e.altKey)
                    e.preventDefault();
                
                if(!this.$('.selected').length) {
                    this.selectOne();
                    return;
                }                
                var head = this.$('.head'),
                    tail = this.$('.tail'),
                    prev = head.prevAll(this.selectables+':visible:first'),
                    next = head.nextAll(this.selectables+':visible:first');

                // within visible viewport?
                if(e.which == gui.keys.UP)
                    prev.scrollIntoView(true, this.el);
                else if(e.which == gui.keys.DOWN)
                    next.scrollIntoView(false, this.el);
            
                if(!e.shiftKey) {
                    if(e.which == gui.keys.DOWN && next[0]) 
                        this.selectOne(tail.nextAll(this.selectables+':visible:first'));
                    else if(e.which == gui.keys.UP && prev[0]) 
                        this.selectOne(tail.prevAll(this.selectables+':visible:first'));
                }    
                else {            
                    if(e.which == gui.keys.DOWN && next[0]) {
                        var below = head.index() >= tail.index() 
                        if(below) {
                            this.select(next);
                            next.make('head');
                        } else {
                            this.unselect(head);
                            next.make('head');
                        }
                    }
                    else if(e.which == gui.keys.UP && prev[0]) {
                        var below = head.index() > tail.index()
                        if(below) {
                            this.unselect(head);
                            prev.make('head');
                        } else {
                            this.select(prev);
                            prev.make('head');
                        }
                    }
                }
            }
        }
    });
    
    
    return {
        Selectable: Selectable
    }
});