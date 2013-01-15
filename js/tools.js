define([
    'jquery', 
    'underscore',
    'backbone',
    'moment',    
    './base',
], function($, _, Backbone, moment, gui) {


    var tools = {};


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
            // this.$el.css({
            //     position: this.position,
            //     top: 'auto',
            //     left: 'auto',
            //     width: 'auto',
            //     height: this.height
            // })
            // this.$el.removeClass('flying');
        }
    });



    tools.Selectable = Backbone.View.extend({
        events: {
            'keydown': 'onSelectableKeyDown',
        },

    
    
        /*        
        var s = Selectable({
            el: '#table',
            selectable: 'td'
        });
        s.render();
        */
        initialize: function(config) {
            _.bindAll(this, 'onSelectableMouseDown', 'onSelectableKeyDown')
            this.selectables = config.selectables;
            this.$el.delegate(config.selectables, 'mousedown', this.onSelectableMouseDown);
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
                this.deselectAll();
                this.$(this.selectables).slice(start, end+1).addClass('selected');
                el.make('head');
            
                // Allow text selection, but no shift-click text selection
                e.preventDefault();
                gui.iepreventTextSelection(e);
            }
            else {
                this.selectOne(el);
                this.trigger('choose', {selected: el});
            }
        },
        getSelected: function() {
            return this.$(this.selectables).filter('.selected');
        },
        getSelectedModels: function(collection) {
            return this.getSelected().map(function() {
                return collection.at($(this).index());
            }).toArray();
        },
        getSelectables: function() {
            return this.$(this.selectables);
        },
        toggle: function(el) {
            if($(el).is('.selected')) 
                this.deselect(el);
            else
                this.select(el);
        },
        select: function(el) {
            if(_.isNumber(el)) {
                console.log('OO', this.selectables+':nth-child('+el+')')
                el = this.$(this.selectables+':nth-child('+el+')')
            }
            $(el).addClass('selected');
            this.trigger('select', {selected: this.getSelected()});
            this.trigger('change');
        },
        selectOne: function(el) {
            if(!el || !el[0])
                el = this.$(this.selectables+':visible:first');
            this.deselectAll();
            this.select(el);
            el.make('head').make('tail');
        },
        deselect: function(el) {
            $(el).removeClass('selected');
            this.trigger('deselect');
            this.trigger('change');
        },
        deselectAll: function() {
            this.$('.selected').removeClass('selected');
            this.$('.head').removeClass('.head');
            this.$('.tail').removeClass('.tail');
        },
        moveUp: function(steps) {

        },
        moveDown: function(steps) {
        
        },
        onSelectableKeyDown: function(e) {
            if(e.which == gui.keys.ENTER) {
                var sel = this.getSelected();
                if(sel[0]) {
                    this.trigger('choose', {selected: sel});
                }
                e.preventDefault();
            }
            else if(gui.isArrowKey(e)) {
                e.preventDefault();
                if(!this.$('.selected').length) {
                    this.selectOne()
                    return
                }
                
                var head = this.$('.head'),
                    tail = this.$('.tail'),
                    prev = head.prevAll(':visible:first'),
                    next = head.nextAll(':visible:first');
            
                if(!e.shiftKey) {
                    if(e.which == gui.keys.DOWN && next[0]) 
                        this.selectOne(tail.nextAll(':visible:first'));
                    else if(e.which == gui.keys.UP && prev[0]) 
                        this.selectOne(tail.prevAll(':visible:first'));
                }    
                else {            
                    if(e.which == gui.keys.DOWN && next[0]) {
                        var below = head.index() >= tail.index() 
                        if(below) {
                            this.select(next);
                            next.make('head');
                        } else {
                            this.deselect(head);
                            next.make('head');
                        }
                    }
                    else if(e.which == gui.keys.UP && prev[0]) {
                        var below = head.index() > tail.index()
                        if(below) {
                            this.deselect(head);
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
    tools.Table = Backbone.View.extend({
        tagName: 'div',
        className: 'gui-table',
        attributes: {
            tabindex: 0
        },
        template: _.template('' + 
            '<div class="head"><table><colgroup></colgroup><thead><tr></tr></thead></table></div>'+
            '<div class="scroll">'+
                '<table class="body">'+ //  tabindex="0"
                    '<colgroup></colgroup>' +
                    '<tbody></tbody>' +
                '</table>'+
            '</div>'),
        colTemplate: _.template('<th><i></i><%= obj.title || "" %><span class="resize"></span></th>'),


        initialize: function(config) {
            config = config || {};
            if(config.el) {
                this.$el.attr(this.attributes);
            }
            // _.bindAll(this, 'onResizeDrag', 'onResizeDragEnd');
            this.rows = new (Backbone.Collection.extend({url: config.url}))(config.rows);
            // this.rows.url = config.url;

            this.columns = config.columns;
            this.sortBy = config.sortBy;

            var tr = this.$('thead > tr');
            var rowTpl = [];
            var renderers = {};
            _.each(this.columns || [], function(col) {                
                // Append another <td> to the row template
                var renderer = col.renderer;
                if(renderer) {
                    // Call a given renderer function 
                    
                    if(_.isString(renderer))
                        // use built-in common renderer
                        renderer = tools.renderers[renderer]

                    
                    renderers[col.name] = function(row) { return renderer(row, col); };
                    // console.log('REN: ', renderer, renderers)
                    rowTpl.push('${ renderers["'+col.name+'"](obj) }');
                    // rowTpl.push('<td>AAAA</td>');
                }
                else
                    // or just use the default cell markup
                    rowTpl.push('<td><div>${ obj.'+col.name+' || "" }</div></td>');
            }, this);
            this.rowTemplate = _.template2('<tr id="${obj.id}">'+rowTpl.join('')+'</tr>', {renderers: renderers});            

            // Make the rows selectable
            this.selectable = new tools.Selectable({
                // el: this.$('table'),
                el: this.el,
                selectables: 'tbody tr'
            });            
        },
        render: function() {
            var alreadyHasLotOfHtml = false;
            
            console.log('render table')
            if(alreadyHasLotOfHtml) {
                // Populating from innerHTML, just apply the behavior.
                // What about the this.rows collection?
                // We still configure the columns, hence don't add <col> tags
                // or <thead>, just a raw table with all the rows.
                // Add support for specifying these in markup as well later.
            }
            else {
                // Start by generate a skeleton
                this.$el.html(this.template());

                // ..add some column headers
                var tr = this.$('thead > tr'),
                    colgroup = this.$('table.body > colgroup'),
                    colgroupheader = this.$('.head colgroup');

                _.each(this.columns || [], function(col) {
                    // Create a <col> to the main table 
                    var c = $('<col/>').css('width', col.width);
                    colgroup.append(c);

                    // Append a th to the header table
                    var th = $(this.colTemplate(col)).css('width', col.width);
                    tr.append(th);
                    colgroupheader.append(c.clone());
                }, this);

                // ..and finally some rows, from this.rows, if any.
                var tbody = this.$('table.body tbody');
                
                console.log('FOOBAR', this.rows.length)
                this.rows.each(function(row) {
                    tbody.append(this.rowTemplate(row.toJSON()));
                }, this);
            }

            // Make the columns resizable
            var o = {table: this};
            this.$('.resize').draggable({
                containment: 'parent', 
                axis: 'x',
                helper: false,
                cursor: 'col-resize',
                start: function(e, draginfo) {
                    $(this).css({'left': ''});
                    o.tableoffset = o.table.$el.offset().left;
                    o.tablewidth = o.table.$el.width();
                },
                drag: function(e, draginfo) {
                    var colwidth = e.pageX - o.tableoffset;
                    colwidth = (colwidth / o.tablewidth) * 100
                    var rest = 100-colwidth;
                    o.table.$('colgroup col:nth-child(1)').css({width: colwidth+'%'});
                    o.table.$('colgroup col:nth-child(2)').css({width: rest+'%'});                
                },
                stop: function() {
                    $(this).css({'left': ''});
                }
            });



            this.$('table.body').iefocus();
            this.$('>.head').ieunselectable();        
            return this;
        }

    });
    
    // Some common table column renderers
    tools.renderers = {
        'timeago': function(row, col) {
            return '<td><div>'+moment.utc(row[col.name]).local().fromNow()+'</div></td>';
        },
        'ymd': function(row, col) {
            return '<td><div>'+moment.utc(row[col.name]).local().format('YYYY-MM-DD')+'</div></td>';            
        }
    }









    /*
    Silly class assuming a lot of things.
    */
    tools.ItemTable = tools.Table.extend({    

        className: 'gui-table item-table',

        
        template: _.template('' + 
            '<div class="head"><table><colgroup></colgroup><thead><tr></tr></thead></table></div>'+
            '<div class="scroll">'+
                '<table class="body">'+
                    '<colgroup></colgroup>' +
                    '<tbody></tbody>' +
                '</table>'+
            '</div>'+
            '<div class="tools"><ul>'+
                '<li><button class="add">Add row</button></li>'+
            '</ul></div>'            ),        
        
        events: {
            'click .add': 'onAddClick',
            'click tr': 'onRowClick',
            'keydown': 'onKeyDown'
        },
        mixins: [
            gui.ChildView,
            // tools.selectable()
        ],
    
    
        initialize: function(config) {
            tools.ItemTable.__super__.initialize.call(this, config)
            this.filterView = config.filterView;  // optional
            if(this.filterView) {
                this.filterView.on('change', this.onFilterViewChange, this)
            }
            this.url = config.url;
            this.rows.url = config.url;
            this.rows.on('add', this.onRowAdd, this);
            this.rows.on('destroy remove', this.onRowRemove, this);            
        },
        render: function() {
            return tools.ItemTable.__super__.render.call(this)
        },
        comparator: function(row) {
            return row.get('period');
        },

        populate: function() {
            
        },
        onFilterViewChange: function() {
            console.log('YEAYEA')
            var url = this.url + '?' + this.filterView.getQueryString();
            this.rows.url = url;
        },
        onAddClick: function() {
            this.trigger('addclick')
        },
        onRowClick: function(e) {
            this.$('tr.selected').removeClass('selected');
            $(e.target).parents('tr:first').addClass('selected')
        },
        onKeyDown: function(e) {
            // tools.ItemTable.__super__.onKeyDown.call(this, e);
            if(e.which == gui.keys.BACKSPACE && confirm('Delete this row?')) {
                var id = this.$('tr.selected').attr('id'),
                    row = this.rows.get(id);
                row.destroy();
            }
        },
        onRowAdd: function(model, collection, metadata) {
            // options = options || {};
            // var tr = this.rowTemplate(row.toJSON());
            // // this.$('tbody').insertAt(options.index || -1);
            // this.$('tbody').insertAt(options.index || -1);
            this.render();
            this.el.focus();
            this.selectable.selectOne(this.$('#'+model.id));
        },
        onRowRemove: function(row, collection) {
            var el = this.$el.find('#'+row.id);
            el.fadeOut(300, function() {this.remove();});
            var next = el.next();
            if(next[0]) 
                this.selectable.selectOne(el.next())
                // el.next().addClass('selected');
            else 
                this.selectable.selectOne(el.prev())            
                // el.prev().addClass('selected');
            this.el.focus();
        },    
        
    
    
    });
    


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
            }
        ]
    })   
    
    >>> f.getQueryString() 
    "?filtertype=and&date=between,2012-11-01,2012-11-30&rate=atleast,1&tags=is,hyp"
    
    
    /clients/448472/slaps?[...]
    
    
    */
    tools.FilterView = Backbone.View.extend({
        tagName: 'div',
        className: 'filterview',
        events: {
            'fieldchange': 'onFieldChange'
        },
        template: _.template2(''+
        '<ul></ul>'+
        '<div class="tools">'+
            '<button class="add">Add</button>'+
            '<button class="apply">Apply</button>'+
        '</div>'),
        
        initialize: function(config) {
            this.config = config;
            this.filterType = config.filterType || 'and';
            this.filters = [];
            this.applied = [];
        },
        
        render: function() {
            this.$el.html(this.template());
            var ul = this.$('ul');
            
            _.each(this.config.filters, function(filterconf) {
                var factory = tools.filters[filterconf.type];
                var f = new factory(filterconf);
                this.filters.push(f);
                
                if(filterconf.value) {
                    this.applied.push(f);
                    ul.append(f.render().el);
                }
                
            }, this);
            return this;
        },
        getQueryString: function() {
            var q = _.map(this.filters, function(filter) {
                return filter.getQueryString();
            });
            q.splice(0,0, 'filterType='+this.filterType);
            return q.join('&')
        },
        
        onFieldChange: function(e) {
            console.log('HEHE: ', this.getQueryString())
        },
        
        
    });


    // tools.FilterGroup = Backbone.View.extend({
    //     tagName: 'ul',
    //     className: 'filter-group'
    //     
    //     initialize: function(config) {
    //         // Type can be "and" or "or"
    //         this.type = config.type;
    //         this.filters = config.filters;
    //     },
    //     render: function() {
    //         
    //     }        
    // });
    tools.Filter = Backbone.View.extend({
        tagName: 'li',
        rowTemplate: _.template2(''+
            '<div class="title">${obj.title}</div>'+
            '<div class="filter"></div>'+
            '<div class="tools">'+
                '<button class="remove">Remove</button>'+
            '</div>'),
        events: {
            'click .remove': 'remove'
        },
        
        initialize: function(config) {
            this.name = config.name;
            this.title = config.title;
            this.predicate = config.predicate;
            this.value = config.value;
        },
        remove: function() {
            
        }
        
    });
    
    tools.filters = {};
    tools.filters.datetime = tools.Filter.extend({
        
        // template: _.template(''
        //     'Slap-date: [is,between,atleast,atmost]   [picker1] and [picker2]'),
        
        initialize: function(config) {
            tools.Filter.prototype.initialize.call(this, config)

            // Create predicate combo
            this.predicateCombo = new form.ComboBox({
                options: [
                    {id: 'is', text: 'exactly'},
                    {id: 'between', text: 'betweeen'},
                    {id: 'atleast', text: 'At least'},
                    {id: 'atmost', text: 'At most'},
                ],
                value: this.predicate
            });
            this.predicateCombo.on('change', this.onPredicateComboChange, this);
            
            var values = (this.value || '').split(',')
            this.dateField = new form.DateField({value: values[0]})
            this.dateField2 = new form.DateField({value: values[1]})
        },
        render: function() {
            this.$el.html(this.rowTemplate(this));
            var cont = this.$('.filter');
            
            cont.append(this.predicateCombo.render().el);
            this.predicateCombo.delegateEvents()

            // There is at least one datefield
            cont.append(this.dateField.render().el);                
            
            if(this.predicate == 'between') {
                // Add the second datefield
                cont.append(this.dateField2.render().el);                
            }
            
            return this;
        },
        getQueryString: function() {
            var s = this.name+'='+this.predicateCombo.getValue()+','+this.dateField.getValue();
            if(this.predicate == 'between')
                s += ','+this.dateField2.getValue();
            return s;
        },
        onPredicateComboChange: function(e) {
            this.predicate = e.value;
            this.render();
        }
    });


    tools.filters.number = tools.Filter.extend({
        
        // template: _.template(''
        //     'Slap-date: [is,between,atleast,atmost]   [picker1] and [picker2]'),
        
        initialize: function(config) {
            tools.Filter.prototype.initialize.call(this, config)

            // Create predicate combo
            this.predicateCombo = new form.ComboBox({
                options: [
                    {id: 'is', text: 'exactly'},
                    {id: 'between', text: 'betweeen'},
                    {id: 'atleast', text: 'At least'},
                    {id: 'atmost', text: 'At most'},
                ],
                value: this.predicate
            });
            this.predicateCombo.on('change', this.onPredicateComboChange, this);

            // Create textfield
            this.textfield = new form.TextField({
                value: this.value || ''
            });
            // this.textfield.on('change', this.onTextFieldChange, this);

            // Create textfield
            this.textfield2 = new form.TextField({
                value: this.value2 || ''
            });

        },
        render: function() {
            this.$el.html(this.rowTemplate(this));
            var cont = this.$('.filter');
            cont.append(this.predicateCombo.render().el);
            this.predicateCombo.delegateEvents();
            cont.append(this.textfield.render().el);
            if(this.predicate == 'between') {
                cont.append(this.textfield2.render().el);                
            }
            return this;
        },
        getQueryString: function() {
            var s = this.name+'='+this.predicateCombo.getValue()+','+this.textfield.getValue();
            if(this.predicate == 'between')
                s += ','+this.textfield2.getValue();
            return s;
        },
    });

    tools.filters.text = tools.Filter.extend({
        
        // template: _.template(''
        //     'Slap-date: [is,between,atleast,atmost]   [picker1] and [picker2]'),
        
        initialize: function(config) {
            tools.Filter.prototype.initialize.call(this, config)

            // Create predicate combo
            this.predicateCombo = new form.ComboBox({
                options: [
                    {id: 'is', text: 'equals'},
                    {id: 'contains', text: 'contains'},
                    {id: 'startswith', text: 'Starts with'},
                    {id: 'endswith', text: 'Ends with'},
                ],
                value: this.predicate
            });
            
            // Create a textfield
            this.textfield = new form.TextField({
                value: this.value || ''
            });
            this.textfield.on('change', this.onTextFieldChange, this);

        },
        render: function() {
            this.$el.html(this.rowTemplate(this));
            var cont = this.$('.filter');
            
            cont.append(this.predicateCombo.render().el);
            this.predicateCombo.delegateEvents();
            
            cont.append(this.textfield.render().el);
            return this;
        },
        getQueryString: function() {
            var s = this.name+'='+this.predicateCombo.getValue()+','+this.textfield.getValue();
            return s;
        },
    });    
        

        



return tools;

});













