define([
    'jquery', 
    'underscore',
    'backbone',
    'moment',    
    'globalize/globalize',
    './base',
    './tools'    
], function($, _, Backbone, moment, Globalize, gui, tools) {

    // Todo: Make Globalize an optional dep
    var tools = {};

    function reverseSortBy(sortByFunction) {
        return function(left, right) {
            var l = sortByFunction(left);
            var r = sortByFunction(right);

            if (l === void 0) return -1;
            if (r === void 0) return 1;

            return l < r ? 1 : l > r ? -1 : 0;
        };
    }



    tools.FileDropper = Backbone.View.extend({
        tagName: 'div',
        className: 'dropupload',
        attributes: {
            'ondragover': "return false"
        },
        events: {
            // 'dragover': 'onDragOver',
            'drop': 'onDrop'
        },    
        initialize: function(config) {
            if(config.el) {
                $(config.el).attr(this.attributes).addClass(this.className);
            }
        },
        render: function() {
            return this;
        },
    
        onDragOver: function(e) {
            e.preventDefault(); 
            return false;
        },
        onDrop: function(e) {
            // Prevent the default behavior of opening a dropped file
            e.preventDefault();
        
            // Get all dropped files
            var files = e.originalEvent.dataTransfer.files;
    
            // Re-trigger the origial "drop" event, with the spaceholders added.
            var ev = _.extend({}, e, {files: files});
            this.trigger('drop', ev);
        }    
    });


    tools.Float = Backbone.View.extend({
        
        initialize: function(config) {
            _.bindAll(this, 'onScroll');
            $(window.document).on('scroll', this.onScroll);
            this.pos = this.$el.offset();
            this.width = this.$el.width();
            this.height = this.$el.height();
            this.position = this.$el.css('position');
            $(window.document).trigger('scroll');
        },
        onScroll: function(e) {
            if(!this.el.parentElement) return;
            
            this.pos = this.$el.offset();
            this.width = this.$el.width();
            this.height = this.$el.height();
            this.position = this.$el.css('position');
            
            var scrollTop = e.target.body.scrollTop,
                viewportHeight = $(window).height(),
                above = this.pos.top < scrollTop,
                below = this.pos.top+this.height > scrollTop + viewportHeight;             

            if(above && !this.clone) {
                this.flyTop();
            }
            else if(below && !this.clone) {
                this.flyBottom();                
            }
            else if(!above && !below && this.clone) {
                this.land();
            }
        },
        createClone: function() {
            // $el.clone() does a deep clone. 
            // Passing true clones events and data as well.
            return this.$el.clone(true).insertAfter(this.el).addClass('flying');
        },
        flyTop: function() {
            this.clone = this.createClone();
            this.clone.css({
                position: 'fixed',
                top: 0,
                left: this.pos.left,
                width: this.width,
                height: this.height
            });
        },
        flyBottom: function() {
            this.clone = this.createClone();            
            this.clone.css({
                position: 'fixed',
                bottom: 0,
                left: this.pos.left,
                width: this.width,
                height: this.height
            });
        },        
        land: function() {
            this.clone.remove();
            this.clone = null;
        }
    });


    var splitter = /^(\S+)\s+(\S+)\s*(.*)$/
    
    /**
    Example
    -------
    this.selectable = new tools.Selectable({
        el: this.el,              // common ancestor for the selectables
        selectables: 'li',        // a selector expression
        chooseOnClick: true,
        chooseOnDblClick: false,

        // triggerChooseOn: ['keydown enter', 'mousedown li'] // this is not yet implemented        
    });
    this.selectable.on('choose', this.onSelectableChoose, this);
    */
    tools.Selectable = Backbone.View.extend({
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
            
            // this.triggerChooseOn = config.triggerChooseOn || ['keydown enter', 'dblclick li'];
            // _.each(this.triggerChooseOn, function(evtstr) {
            //     var matches = evtstr.match(splitter),
            //         eventName = match[1], 
            //         hotkey = match[2] || '',
            //         selector = match[3] || '';
            //                         
            //     if(_.indexOf(['keydown', 'keypress', 'keyup')], matches[1]) {
            //         // register hotkey
            //         this.$el.on(eventName, selector || null, hotkey, this.chooseSelected);
            //     } else {
            //         this.$el.on(eventName, match[2] + ' ' + match[3], this.chooseSelected);                    
            //     }
            // })
        },

        off: function() {
            this.$el.off('mousedown', this.selectables, this.onSelectableMouseDown);
            this.$el.off('dblclick', this.selectables, this.chooseSelected);
            this.$el.off('click', this.selectables, this.chooseSelected);
            if(this.keynav)
                this.$el.off('keydown', this.onSelectableKeyDown);            
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
            else if(_.isString(el)) {
                console.log('Q: ', this.selectables+'[data-id="'+el+'"]')
                el = this.$(this.selectables+'[data-id="'+el+'"]');
            }


                
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
            else if(_.isNumber(el))
                el = this.$(this.selectables+':nth-child('+el+')');
            else if(_.isString(el)) {
                console.log('Q: ', this.selectables+'[data-id="'+el+'"]')
                el = this.$(this.selectables+'[data-id="'+el+'"]');
            }
            
            if(!el)
                return;
            if(el.is && !el.is(this.selectables))
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
            this.unselectAll();
            _(_.arrayify(items)).each(function(item) {
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
    // legacy        
    _.extend(tools.Selectable.prototype, {
        deselect: tools.Selectable.prototype.unselect, 
        deselectAll: tools.Selectable.prototype.unselectAll
    });


    function headOrTail(e, el) {
        e.pageX == 400
        el.offset().left == 300
        el.width() == 120
        var left = $(el).offset().left,
            center = $(el).outerWidth() / 2 + left;
        return e.pageX > center ? 'tail' : 'head';
    }

    
    tools.Sortable = Backbone.View.extend({
        hotkeys: {
            'keydown esc': 'onEscKeyDown'
        },

        initialize: function(config) {
            this.config = config;
            this.sortables = config.sortables; // a selector string
            this.collection = config.collection; // optional
            _.bindAll(this, 'onDragInit', 'onDragEnd', 'onDropOverHead', 'onDropOverTail', 'onDropOn', 'abort');
            
            this.$el.on('dragdown', config.sortables, this.onDragDown);
            this.$el.on('draginit', config.sortables, this.onDragInit);
            this.$el.on('dragend', config.sortables, this.onDragEnd);
            this.$el.on('dropover', config.sortables, this.onDropOver);
            this.$el.on('dropmove', config.sortables, this.onDropMove);
            this.$el.on('dropoverhead', config.sortables, this.onDropOverHead);
            this.$el.on('dropovertail', config.sortables, this.onDropOverTail);            
            this.$el.on('dropon', this.onDropOn);
        },
        render: function() {
            return this;
        },
        abort: function() {
            var container = this.drag.orgContainer;
            container.insertAt(this.drag.orgIndex, this.drag.element[0]);
            this.drag.cancel();
            this.cleanup();
            this.trigger('abort', {drag: this.drag});
        },
        cleanup: function() {
            $(this.drag.activeElement).off('keydown', null, 'esc', this.abort)
            this.drag.ghostEl.remove();            
            this.drag.spaceholder.remove();            
        },

        // Drag events
        onDragDown: function(e, drag) {
            drag.distance(5);
            drag.mouseOffset = gui.mouseOffset(e, e.currentTarget);
            e.preventDefault();
        },    
        onDragInit: function(e, drag) {
            if(this.collection)
                drag.model = this.collection.at(drag.element.index())
            
            this.drag = drag;
            drag.orgIndex = drag.element.index();
            drag.spaceholder = drag.element.clone();
            drag.spaceholder.addClass('gui-spaceholder');
            drag.orgContainer = drag.element.parent();
            
            drag.ghostEl = drag.element.clone().addClass('gui-ghost').appendTo(document.body)
            drag.ghostEl.css({position: 'absolute'})
            drag.index = drag.element.index();            
            drag.element.detach()
            drag.representative(drag.ghostEl, drag.mouseOffset.left, drag.mouseOffset.top)
            drag.name = 'gui-sort';
            drag.sortmode = 'horizontal';

            // Add an extra event listener to activeElement
            drag.activeElement = document.activeElement;
            $(drag.activeElement).on('keydown', null, 'esc', this.abort)

            this.trigger('draginit', e, drag)
        },
        
        // Drop events
        onDropOver: function(e, drop, drag) {
            if(drag.allowDrop === false) 
                return
            drag.currOver = {el: drop.element, part: null};
        },        
        onDropMove: function(e, drop, drag) {
            if(drag.allowDrop === false) 
                return
            var dragel = drag.element,
                dropel = drop.element;
                
            if(dropel[0] == dragel[0])
                return
                        
            var part = headOrTail(e, drop.element);
            if(part != drag.currOver.part && part) {
                drop.element.trigger('dropover'+part, [drop, drag])
                drag.currOver.part = part;
            }            
        },

        onDropOverHead: function(e, drop, drag) {
            drag.index = drop.element.index();

            var afterSpaceholder = !!drop.element.prevAll('*.gui-spaceholder')[0];
            if(afterSpaceholder)
                drag.index -= 1;
                
            drag.spaceholder.insertBefore(drop.element);
        },
        onDropOverTail: function(e, drop, drag) {
            drag.index = drop.element.index() + 1;
            var afterSpaceholder = !!drop.element.prevAll('*.gui-spaceholder')[0];
            if(afterSpaceholder)
                drag.index -= 1;

            drag.spaceholder.insertAfter(drop.element);
        },        
        onDropOn: function(e, drop, drag) {
            if(!drag.allowDrop || drop.element[0] != drag.delegate)
                return;
            
            if(this.collection)
                this.collection.move(drag.model, drag.index);
            drag.success = true;
        },
        onDragEnd: function(e, drag) {
            if(drag.preventDefault) {
                return;
            }
            else if(drag.success) {
                if(drag.spaceholder[0].parentElement)
                    drag.spaceholder.replaceWith(drag.element); 
                else
                    drag.orgContainer.append(drag.element)
                this.cleanup();
                this.trigger('sort', {drag: drag});
            }
            else
                this.abort();
        },
        onEscKeyDown: function(e) {
            this.abort();
            e.preventDefault();
        }
        
        
    });

    /*
    Example:
    -----------------
    this.table = new gui.Table({
        columns: [
            {name: 'title', title: 'Title', width: '40%'},
            {name: 'col2', title: 'Column B', width: '60%'},
        ],
        rows: [
            {title: 'Feppo', col2: 'Sune'},
            {title: 'Heppo', col2: 'Sune'},
            {title: 'Lorem', col2: 'Ipsum'},
        ]
    });
    */
    tools.TableColumnModel = Backbone.Model.extend({
        defaults: {
            visible: true,
            sort: null, //'asc',
            sortprio: null , // 1
            name: null, // 'title'
            title: null // 'Title',
            
        }
    });
    
    tools.TableColumn = Backbone.View.extend({
        tagName: 'th',
        template: _.template2(''+
            '<div>'+
                '${obj.title}'+
                '<span class="direction"></span>' +
                '<span class="resize"></span>' +
            '</div>'), 
        events: {
            'click': 'onClick',
            'dragdown': 'onDragDown',
            'draginit': 'onDragInit',
            'dragend': 'onDragEnd',
            'dragover': 'onDragOver'
        },
            
        initialize: function(config) {
            this.config = config;
            this.model = config.model;
            if(!this.model)
                this.model = new tools.TableColumnModel();
        
            // this.model.on('change:sort', this.onSortChange, this);
            this.model.on('change:direction', this.render, this);
            
            
            // Table columns are draggable (for reordering columns)
            // this.$el
            // $('.mydraggable', 'ondraginit', function(e, drag) {
            //    drag.horizontal()
            //    drag.steps(...)
            //    drag.ghost()     <-- clone a ghost to follow the mouse pointer.
            //    // ..etc, configure the drag here..
            // 
            //    drag.element    <-- the (jquery) element dragged
            //    drag.delegate   <-- the parent-ish element (eg .acm-desktop) that 'dragstart' is registerd to. (Often you bind one listener on a container element instead of multiple listeners on each individual child)
            // 
            // });
        },

        onDragDown: function(e, drag) {
            e.preventDefault()
            drag.mousedownPosition = {left: e.offsetX, top: e.offsetY};
            drag.distance(5);
        },
        onDragOver: function(e, drag) {
            // console.log('Over: ', e, drag)
        },

        onDragInit: function(e, drag) {
            console.log('Soooo pretty2: ', drag, 'e:', e)
            var tablecont = this.$el.parents('.gui-table');
            var foo = $('<div><div></div></div>').appendTo(document.body); // tablecont
            foo.children('div').html(this.$el.text());
            foo.css({width: this.$el.width(), height: tablecont.height()})
            foo.addClass('gui-table-column-ghost')
            drag.representative(foo, drag.mousedownPosition.left, drag.mousedownPosition.top)
            drag.ghostEl = foo;
            drag.model = this.model;
            // drag.ghost();
            // drag.horizontal(0);
            
        },
        onDragEnd: function(e, drag) {
            drag.ghostEl.remove();
        },
        render: function() {
            this.$el.html(this.template(this.model.toJSON()));
            var dir = this.model.get('direction');
            if(dir)
                this.$('.direction').addClass(dir == 'asc' ? 'icon-arrow-up' : 'icon-arrow-down');            
            return this;
        },
        onClick: function(e) {
            // change sort direction
            var dir = this.model.get('direction');
            if(!dir)
                this.model.set('direction', 'asc')
            else if(dir=='asc')
                this.model.set('direction', 'desc')
            else if(dir=='desc')
                this.model.set('direction', '')            
        }
        
    });
    
    tools.Table = Backbone.View.extend({
        tagName: 'div',
        className: 'gui-table',
        attributes: {
            tabindex: 0
        },
        template: _.template('' + 
            '<table>'+
                '<colgroup></colgroup>'+
                '<thead><tr></tr></thead>' + 
                '<tbody></tbody>' + 
            '</table>'),



        initialize: function(config) {
            config = config || {};
            if(config.el) {
                this.$el.attr(this.attributes);
            }

            // Add a columns collection
            if(config.columns instanceof Backbone.Collection)
                this.columns = config.columns;
            else
                this.columns = new Backbone.Collection(config.columns);
            this.columns.on('change:sort', this.onColumnSortChange, this)

            // Add a rows collection
            if(config.rows instanceof Backbone.Collection)
                this.rows = config.rows;
            else
                this.rows = new (Backbone.Collection.extend({url: config.url}))(config.rows);
            this.rows.on('add', this.onRowAdd, this);
            this.rows.on('reset', this.onRowsReset, this);            
            this.rows.on('destroy remove', this.onRowRemove, this);
            
            var tr = this.$('thead > tr');
            var rowTpl = [];
            var renderers = {};
            this.columns.each(function(col) {                
                // Append another <td> to the row template
                var renderer = col.get('renderer');
                if(renderer) {
                    // Call a given renderer function 
                    if(_.isString(renderer))
                        // use a named built-in renderer, see `tools.renderers`
                        renderer = tools.renderers[renderer]

                    renderers[col.get('name')] = function(row) { return renderer(row, col.toJSON()); };
                    rowTpl.push('${ renderers["'+col.get('name')+'"](obj) }');
                }
                else
                    // or just use the default cell markup
                    rowTpl.push('<td><div>${ obj.'+col.get('name')+' || "" }</div></td>');
            }, this);
            this.rowTemplate = _.template2('<tr id="${obj.id}">'+rowTpl.join('')+'</tr>', {renderers: renderers});            

            // Make the rows selectable
            this.selectable = new tools.Selectable({
                el: this.el,
                selectables: 'tbody tr'
            });            
        },
        render: function() {

            // Start by generate a skeleton
            this.$el.html(this.template());

            // ..add some column headers
            var tr = this.$('thead > tr'),
                colgroup = this.$('table > colgroup');

            this.columns.each(function(model) {
                // Create a <col> to the main table 
                var c = $('<col/>').css('width', model.get('width')).addClass(model.get('className'));
                colgroup.append(c);

                // Append a th to the header table
                tr.append(this.renderOneColumn(model));                    
            }, this);

            // ..and finally some rows, from this.rows, if any.
            var tbody = this.$('table > tbody');
            
            
            this.rows.each(function(row) {
                tbody.append(this.renderOne(row));
            }, this);


            this.$('table.body').iefocus();
            this.$('>.head').ieunselectable();        
            return this;
        },
        renderOneColumn: function(model) {
            var th = new tools.TableColumn({model: model})
            return th.render().el;
        },
        renderOne: function(model) {
            return this.rowTemplate(model.toJSON());
        },
        onRowAdd: function(model, collection, options) {
            options = options || {};
            var tr = this.renderOne(model);
            this.$('table.body tbody').insertAt(options.index || -1, tr);
        },
        onRowsReset: function() {
            this.render();
        },
        onRowRemove: function(model, collection) {
            var el = this.$el.find('#'+model.id);
            el.remove();
        },
        onColumnSortChange: function(column, sort) {

            if(sort) {            
                var fn = function(model) {
                    return model.get(column.get('name'));
                }
                if(sort == 'desc')
                    fn = reverseSortBy(fn)
            
                this.rows.comparator = fn;
            }
            
            this.rows.sort();
            this.render();                    
        }        
    });

    
    // Some common table column renderers
    tools.renderers = {
        'timeago': function(row, col) {
            var val = row[col.name];
            if(!val)
                return '<td><div></div></td>';
            return '<td><div>'+moment.utc(row[col.name]).local().fromNow()+'</div></td>';
        },
        'ymd': function(row, col) {
            var val = row[col.name];
            if(!val)
                return '<td><div></div></td>';
            return '<td><div>'+moment.utc(row[col.name]).local().format('YYYY-MM-DD')+'</div></td>';            
        },
        'amount': function(row, col) {
            var val = row[col.name];
            if(!val)
                return '<td><div></div></td>';
            return '<td><div>'+Globalize.format(val, 'n')+'</div></td>';            
        },
    }






    /*    
    Filters:
    [date]          2012-11-01   2012-11-30     date/timedelta
    [invoice]                                   id/relation
    [hours]         >1                          int     
    [billable]      true
    [tags]          all/any [hyp]               List(Str)

    
    Date
    --------------------------------------------
    is
    between
    at least
    at most
    
    where 
        jget(data, 'date') >= 2012-11-01 and
        jget(data, 'date') <= 2012-11-30
    
    

    var f = new FilterView({
        filterType: 'and',
        filters: [{
                type: 'datetime',
                name: 'date',
                title: 'Date',
                predicate: 'between',
                value: [moment('2012-11-01),
                        moment('2012-11-30)]
            },{
                type: 'number',
                name: 'rate',
                title: 'Billable?',
                predicate: 'atleast',
                value: 1
            },{
                type: 'text',
                name: 'tags',
                title: 'Tags',
                predicate: 'is'
                value: 'hyp'
            }]
    });
    
    >>> f.getQueryString() 
    "?filtertype=and&date=between,2012-11-01,2012-11-30&rate=atleast,1&tags=is,hyp"
    
    
    /clients/448472/slaps?[...]
    
    
    Example 1
    -------------------------------------
    var filterview = new tools.FilterView({
        filterType: 'and',
        filters: [{
                name: 'paper_date',
                type: 'date', 
                title: 'Paper date', 
                defaults: {predicate: 'between', value: '2012-11-01', value2: '2012-11-15'}
            },{
                name: 'amount',
                type: 'number', 
                title: 'Amount', 
                defaults: {predicate: 'atleast'}
            },{
                name: 'comment',
                type: 'text', 
                title: 'Comments', 
                defaults: {predicate: 'contains'}
            }],
        state: [{
                name: 'paper_date',
                predicate: 'atleast',
                value: '2012-11-01',
            },{
                name: 'amount',
                predicate: 'atleast',
                value: '1000',
            },{
                name: 'comment',
                predicate: 'contains',
                value: 'foo',
            }]        
    });
    $(document.body).append(filterview.render().el);
    */
    
    
    /*
    A small single-line editor
    */
    tools.Edit = Backbone.View.extend({
        events: {
            'blur': 'apply',
            'mousedown': 'stopPropagation',
            'keydown': 'stopPropagation'
        },
        hotkeys: {
            'keydown return': 'apply',
            'keydown esc': 'abort'
        },

        initialize: function(config) {
            this.config = config;
            this.$el.attr('contenteditable', 'true');
            this.$el.addClass('gui-edit');
            this.prevfoc = document.activeElement;
            console.log('PREVFOC: ', document.activeElement)

            this.$el.focus();
            this.$el.selectAll();
            this.text = this.$el.text();
        },
        abort: function(e) {
            e.stopPropagation();            
            e.stopImmediatePropagation();
            this.off();
            this.$el.attr('contenteditable', 'false');
            this.$el.removeClass('gui-edit');
            this.$el.text(this.text);
            this._restoreFocus();

        },
        apply: function(e) {
            this.$el.attr('contenteditable', 'false');
            this.$el.removeClass('gui-edit');
            this.prevfoc.focus();
            this.trigger('edit', {el: this.el, '$el': this.$el})
            if(e) {
                e.preventDefault();
                e.stopPropagation();
            }
            this._restoreFocus();            
        },
        stopPropagation: function(e) {
            e.stopPropagation();
        },        
        _restoreFocus: function() {
            window.setTimeout(_.bind(function() {
               this.prevfoc.focus(); 
            }, this), 500)            
        }     
    });




    /**
    A mixin for intercepting paste (ctrl+v) operations.
    When user hits ctrl+v, the default paste is cancelled, and
    instead an event "paste" is triggered, carrying the browser
    event and the pasted text.

    Example
    --------------------
    var MyTextField = form.Text.extend({
        mixins: [form.Field, tools.InterceptPaste],
    
        initialize: function(config) {
            form.Text.prototype.initialize.call(this, config);
            tools.InterceptPaste.initialize.call(this);
            this.on('paste', this.onPaste, this);
        },
        onPaste: function(e) {
            var data = e.data.replace(/kalle/g, 'hassan');
            WysiHat.Commands.insertHTML(data);
        }
    });
    */
    tools.InterceptPaste = {
        initialize: function() {
            this.$el.bind('paste', $.proxy(this._onPaste, this));
        },
        _onPaste: function(e) {
            var ev = e.originalEvent,
                el = $('<div></div>')[0],
                savedcontent = el.innerHTML,
                data = '';
            if(ev && ev.clipboardData && ev.clipboardData.getData) { // Webkit
                if (/text\/html/.test(ev.clipboardData.types)) {
                    var data = ev.clipboardData.getData('text/html');
                }
                else if (/text\/plain/.test(ev.clipboardData.types)) {
                    var data = ev.clipboardData.getData('text/plain');
                }
                this.trigger('paste', {e: e, data: data});
                e.stopPropagation();
                e.preventDefault();
                return false;
            } else {
                function wait() {
                    if(el.childNodes && el.childNodes.length > 0)
                        this.processPaste(el.innerHTML);
                    else
                        setTimeout(wait,1000);         
                }
                wait();
                return true;
            }        
        }
    };
    
    tools.TabChain = {
        initialize: function() {
            this.$el.on('keydown', _.bind(this._onKeyDown, this));
        },
        _onKeyDown: function(e) {
            if(e.which == gui.keys.TAB) {
                var set = this.$('*:tabable'),
                    index = set.index(e.target),
                    next = set[index + (e.shiftKey ? -1 : 1)];
                (next || set[e.shiftKey ? set.length-1 : 0]).focus();
                e.preventDefault();
            }
        }
    };


    // =========
    // = Utils =
    // =========
    var tests = {
        dateManip: /^([\+\-])?(\d{0,3})(\w)?$/,
        iscompactdate: /^(\d{2,4})(\d{2})(\d{2})$/,
        yyyymmdd: /^(\d{4})(\d{2})(\d{2})$/,
        yymmdd: /^(\d{2})(\d{2})(\d{2})$/
    };    
    tools.interpretdate = function(value, basedate) {
        var date = false;
        if(value instanceof Date) {
            date = value;
        }
        else {
            var s = $('<div>'+value+'</div>').getPreText();
            if(s == 'now') {
                date = new Date()
            }
            else if(basedate && s && tests.dateManip.test(s)) {
                // Date manipulation
                // >>> dateManip.exec('+1d')
                // ["+1d", "+", "1", "d"]
                s = tests.dateManip.exec(s);
                var method = s[1] == '-' ? 'subtract' : 'add';
                var unit = s[3] || 'd';
                var num = parseInt(s[2]);    
                date = moment(basedate || new Date())[method](unit, num).toDate();
            }
            else if(/^\d+$/.test(s)) { // Timestamp, millis
                date = new Date(parseInt(s));
            }        
            else if(s) {
                if(tests.iscompactdate.test(s)) {
                    var matcher = tests.yyyymmdd.test(s) ? tests.yyyymmdd : tests.yymmdd;
                    var gr = matcher.exec(s);
                    var year = parseInt(gr[1]) > 1000 ? gr[1] : parseInt(gr[1])+2000;
                    date = new Date(year, gr[2]-1, gr[3]) // month is zero-based
                } 
                else {
                    // Let globalize parse it
                    var result = Globalize.parseDate(value);
                    if(result)
                        date = result;
                    else {                        
                        // let moment have a go as well
                        var m = moment(date || value);  
                        if(m && m.toDate().valueOf())
                            date = m.toDate();
                    }
                }
            }
        }
        return date; // false or window.Date object
    };




    return tools;

});





