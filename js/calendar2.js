define([
    'jquery', 
    'underscore',
    'backbone',
    './base',
    'moment'
], function($, _, Backbone, gui, moment) {

var calendar = {};    


function daysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
}



/**
A month calendar
- Has a <ul class="items"></ul> for each day
- Supports keyboard navigation
- has 1 this.items Collection
- Supports selecting, deleting, adding, editing items
  by supplying events to hook into.
  
Events:
  - "itemdestroy"
  

*/
calendar.EditableMonthCalendar = Backbone.View.extend({
    tagName: 'div',
    className: 'calendar',
    attributes: {
        tabindex: '-1'
    },
    
    template: _.template(''+
        '<table>'+
            '<thead>'+
                '<tr>'+
                    '<td class="header" colspan="7">'+
                        '<div class="monthname"><%= monthname %>, <%= year %></div>'+
                        '<div class="prevmonth"></div>'+
                        '<div class="nextmonth"></div>'+
                    '</td>'+
                '</tr>'+
            '</thead>'+
            '<tbody></tbody>'+
        '</table>'
    ),
    templateDay: _.template(''+
        '<td class="<%= cls %>" data-ymd="<%= ymd %>">'+
            '<div>&nbsp;'+
                '<div class="date"><%= date %></div>'+
                '<ul class="items"></ul>'+                
            '</div>'+
        '</td>'
    ),
    events: {
        'click .prevmonth': 'showPrevMonth',
        'click .nextmonth': 'showNextMonth',
        'keydown': 'onKeyDown',
        'click .day': 'onClickDay'        
    },


    initialize: function(config) {
        config = config || {};
        this.date = moment(config.date || new Date());
        this.fill = config.fill;
        if(config.el)
            $(config.el).attrs(this.attributes).addClass(this.className);

        if(!config.url)
            throw new Error('config.url is required')
        this.items = new (Backbone.Collection.extend({url: config.url}));
    },
    render: function() {
        var m = this.date.clone(),
            month = m.month(),
            today = moment(new Date()),
            today_month = today.month(),
            today_date = today.date();
        
        // Start at first day of month
        m.date(1);
        var firstWeekdayOfMonth = m.day() - 1;
        if(firstWeekdayOfMonth == -1)
            firstWeekdayOfMonth = 6        
        m.subtract('days', firstWeekdayOfMonth);

        // Create the main table
        var data = {
            monthname: this.date.format('MMMM'),
            year: this.date.format('YYYY')
        }
        var table = $(this.template(data));
        var tbody = table.children('tbody');

        // // Render the header
        // table.find('thead .header').html(this.templateHeader({
        //     monthname: this.date.format('MMMM'),
        //     year: this.date.format('YYYY')
        // }));

        // Add the weekday names
        var tr = $('<tr class="weekdays"></tr>').appendTo(table.find('thead'));                
        for(var i=0,days=[1,2,3,4,5,6,0]; i<days.length; i++) {
            tr.append($('<th>'+moment.weekdaysShort[days[i]]+'</th>'));
        }
        
        // Add all the days
        for(var i=0; i<42; i++) {
            if(i % 7 == 0) {
               var tr = $('<tr></tr>').appendTo(tbody);
            }
        
            // Add optional cell styling
            var cls = ['day'],
                day = m.day();
            if(m.month() !== month) {
                cls.push('gray');
            }
            if(day == 6 || day == 0) { // saturday or sunday
                cls.push('weekend');
            }
            if(m.date() == today_date && m.month() == today_month) {
                cls.push('today');
            }
        
            // Draw the cell
            if(!this.fill && m.month() !== month) {
                // Only show days in this month
                tr.append('<td class="empty"><div>&nbsp;</div></td>');
            } else {
                // tr.append('<td class="'+cls.join(' ')+'"><div>'+(m.date())+'</div></td>');                        
                var html = this.templateDay({
                    cls: cls.join(' '),
                    date: m.date(),
                    ymd: m.format('YYYY-MM-DD')
                });
                tr.append(html);
            }
            m.add('days', 1);
        }
        
        $(this.el).empty().append(table);    
        return this;    
    },

    showNextMonth: function() {
        var m = this.date.add({months: 1});
        this.render();
        this.trigger('monthchange')
    },
    showPrevMonth: function() {
        var m = this.date.subtract({months: 1});
        this.render();
        this.trigger('monthchange')        
    },
    showMonth: function(date) {
        this.date = moment(date);
        this.render()
    },

    selectDay: function(td) {
        td = $(td);
        if(!td.hasClass('day') || td.is('.selected')) 
            return;
        // Remove .selected from current selected dat
        var curr = this.$('.selected');
        curr.find('.selected').removeClass('selected');
        curr.removeClass('selected').removeAttr('tabIndex');            
        
        // select the new day and its first item, if any
        td.addClass('selected').attr('tabIndex', '-1').focus();
        td.find('.slaps li:first-child').addClass('selected');
    },    
    selectItem: function(li) {
        this.$('.selected').removeClass('selected')
        $(li).addClass('selected');
        $(li).parents('.day').addClass('selected');
    },


    onKeyDown: function(e) {
        // Support keyboard navigation for selecting a day
        var keys = gui.keys,
            key = e.which,
            curr = this.$('td.selected'),
            items = curr.find('.items'),
            item = this.items.get(items.children('li.selected').attr('id'));
            
        if(!curr[0]) curr = this.$('.today');
        if(!curr[0]) curr = this.$('.day:first');
        var tr = curr.parents('tr:first');

    
        if(e.which == 65 || (e.which == gui.keys.ENTER && !item)) { // "a"
            // User wants to add an item here
            this.trigger('new', {td: curr});
        }
        else if(item && e.which == gui.keys.ENTER) {
            // User wants to edit selected item
            this.trigger('edit', {td: curr, item: item});
            e.stopPropagation();
            e.preventDefault();                
        }
        else if(e.which == gui.keys.BACKSPACE) {
            // User wants to delete selected item
            this.trigger('delete', {td: curr, item: item});
        }
        else if(gui.isArrowKey(e)) {
            var select;
            if(key == keys.RIGHT) {
                select = curr.nextAll('td:first');
            } else if(key == keys.LEFT) {
                select = curr.prevAll('td:first');
            } else if(key == keys.UP) {
                // Select prev item, or switch day?
                var i = items.children('li.selected').index() - 1;
                if(i >= 0)
                    this.selectItem(items.children('li:nth-child('+(i+1)+')'));
                else if(tr.prev()[0])                
                    select = tr.prev().find('td:nth-child('+(curr.index()+1)+')');
            } else if(key == keys.DOWN) {
                // Select next item, or switch day?
                var i = items.children('li.selected').index() + 1;
                var len = items.children('li').length;
                if(i < len)
                    this.selectItem(items.children('li:nth-child('+(i+1)+')'));
                else if(tr.next()[0])
                    select = tr.next().find('td:nth-child('+(curr.index()+1)+')');
            }
            if(select)
                this.selectDay(select);
            e.preventDefault();
        }
        
    },
    onClickDay: function(e) {
        this.selectDay(e.currentTarget);
    }
    
});


return calendar;

});
