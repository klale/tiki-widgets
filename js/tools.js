define([
    'jquery', 
    'underscore',
    'backbone',
    './base',
], function($, _, Backbone, gui) {


    var tools = {};


    tools.Table = Backbone.View.extend({
        tagName: 'div',
        className: 'gui-table',
        attributes: {
            tabIndex: 0
        },
        template: _.template('' + 
            '<table>'+
                '<colgroup></colgroup>' +
                '<thead><tr></tr></thead>' + 
                '<tbody></tbody>' +
            '</table>'),
        colTemplate: _.template('<th><%= obj.label || "" %></th>'),        
        events: {
            'keydown': 'onKeyDown'
        },
    
        initialize: function(config) {
            config = config || {};

            this.rows = new Backbone.Collection(config.rows || []);
            this.rows.url = config.url;

            this.columns = config.columns;
            this.sortBy = config.sortBy;

            var tr = this.$('thead > tr');
            var rowTpl = [];
            var renderers = {};
            _.each(this.columns || [], function(col) {                
                // Append another <td> to the row template
                if(col.renderer) {
                    // Call a given renderer function 
                    renderers[col.name] = col.renderer;
                    rowTpl.push('${ settings.renderers["'+col.name+'"](obj) }');
                }
                else
                    // or just use the default cell markup
                    rowTpl.push('<td><div>${ obj.'+col.name+' || "" }</div></td>');
            }, this);
            this.rowTemplate = _.template2('<tr id="${obj.id}">'+rowTpl.join('')+'</tr>', {renderers: renderers});            
            if($.browser.ltie10) 
                this.$el.attr('unselectable', 'on');
        },
        render: function() {
            console.log('render!')
            this.$el.html(this.template());
            var tbody = this.$('tbody');
            tbody.empty();
        
            // Add column headers
            var tr = this.$('thead > tr');            
            _.each(this.columns || [], function(col) {
                // Create a <col> 
                $('<col/>').css('width', col.width).appendTo(this.$('>table>colgroup'));
                tr.append(this.colTemplate(col));
            }, this);

            // Add all rows
            this.rows.each(function(row) {
                tbody.append(this.rowTemplate(row.toJSON()));
            }, this);
            return this;
        },

        comparator: function(row) {
            return row.get('period');
        },
        onKeyDown: function(e) {
            if(gui.isArrowKey(e)) {
                var sel;
                var curr = this.$('tr.selected');
                if(e.which == gui.keys.DOWN) {
                    sel = curr.next();
                }
                else if(e.which == gui.keys.UP) {
                    sel = curr.prev();
                }
                if(sel[0]) {
                    curr.removeClass('selected');
                    sel.addClass('selected')
                }
                e.preventDefault();
            }
        }
    });

    tools.selectable = {
    
    };


    /*
    Silly class assuming a lot of things.
    */
    tools.ItemTable = tools.Table.extend({    

        className: 'gui-table item-table',
        colTemplate: _.template('<th><%= obj.label || "" %></th>'),
        template: _.template('' + 
            '<table>'+
                '<colgroup></colgroup>' +
                '<thead><tr></tr></thead>' + 
                '<tbody></tbody>' +
            '</table>'+
            '<div class="tools"><ul>'+
                '<li><button class="add">Add row</button></li>'+
            '</ul></div>'),
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
            tools.ItemTable.__super__.prototype.initialize.call(this, config)
            this.rows.url = config.url;
            this.rows.on('add', this.onRowAdd, this);
            this.rows.on('destroy', this.onRowDestroy, this);            
        },
        render: function() {
            return tools.ItemTable.__super__.prototype.render.call(this)
        },
        comparator: function(row) {
            return row.get('period');
        },
        
        populate: function() {
            
        },
        onAddClick: function() {
            this.trigger('addclick')
        },
        onRowClick: function(e) {
            this.$('tr.selected').removeClass('selected');
            $(e.target).parents('tr:first').addClass('selected')
        },
        onKeyDown: function(e) {
            tools.ItemTable.__super__.prototype.onKeyDown.call(this, e);
            if(e.which == gui.keys.BACKSPACE && confirm('Delete this row?')) {
                var id = this.$('tr.selected').attr('id'),
                    row = this.rows.get(id);
                row.destroy();
            }
        },
        onRowAdd: function(row, model, coll, options) {
            // options = options || {};
            // var tr = this.rowTemplate(row.toJSON());
            // // this.$('tbody').insertAt(options.index || -1);
            // this.$('tbody').insertAt(options.index || -1);
            this.render();
        },
        onRowDestroy: function(row, collection) {
            var el = this.$el.find('#'+row.id);
            el.fadeOut(300, function() {this.remove();});
            var next = el.next();
            if(next[0]) 
                el.next().addClass('selected');
            else 
                el.prev().addClass('selected');
        },    
        
    
    
    });
    


return tools;

});











