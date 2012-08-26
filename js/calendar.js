
// =================
// = MonthCalendar =
// =================

/**
 * A month calendar.
 */
gui.MonthCalendar = Backbone.View.extend({
    tagName: 'div',
    className: 'calendar',
    
    template: _.template(''+
        '<table>'+
            '<thead>'+
                '<tr><td class="header" colspan="7"></td></tr>'+
            '</thead>'+
            '<tbody></tbody>'+
        '</table>'
    ),
    templateHeader: _.template(''+
        '<div class="monthname"><%= monthname %>, <%= year %></div>'+
        '<div class="prevmonth"></div>'+
        '<div class="nextmonth"></div>'        
    ),
    templateDay: _.template(''+
        '<td class="<%= cls %>" data-ymd="<%= ymd %>">'+
            '<div>&nbsp;'+
                '<div class="date"><%= date %></div>'+
                '<ul class="tasks"></ul>'+
            '</div>'+
        '</td>'
    ),
    events: {
        // 'keydown': 'onKeyDown',
        'click .prevmonth': 'showPrevMonth',
        'click .nextmonth': 'showNextMonth'
    },

    initialize: function(conf) {
        conf = conf || {};
        this.date = moment(conf.date || new Date());
        this.fill = conf.fill;
    },
    showNextMonth: function() {
        var m = this.date.add({months: 1});
        this.render();
    },
    showPrevMonth: function() {
        var m = this.date.subtract({months: 1});
        this.render();
    },
    showMonth: function(date) {
        this.date = moment(date);
        this.render()
    },
    daysInMonth: function(year, month) {
        return new Date(year, month, 0).getDate();
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
        var table = $(this.template({monthname: this.date.format('MMMM')}));
        var tbody = table.children('tbody');

        // Render the header
        table.find('thead .header').html(this.templateHeader({
            monthname: this.date.format('MMMM'),
            year: this.date.format('YYYY')
        }));

        // Add the weekday names
        var tr = table.find('thead').append('<tr class="weekdays"></tr>');                
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
    }

    
});


