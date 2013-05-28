define([
    'jquery', 
    'underscore',
    'backbone',
    './base',
    './tools',    
    'moment'
], function($, _, Backbone, gui, tools, moment) {

var exp = {};    


// =================
// = MonthCalendar =
// =================
var MonthCalendarModel = Backbone.Model.extend({
    defaults: function() {
        return {
            date: new Date(),
            items: new Backbone.Collection(),
            fill: false
        }
    },
    internalFormat: 'YYYY-MM-DD', // Todo: Don't hard-code this    
    set_date: function(v, attrs) {
        attrs['date'] = v ? tools.interpretdate(v, this.get('date')) : undefined;
    },
    parse: function(json) {
        if(json.date) {
            var m = tools.interpretdate(json.date);
            if(m) json.date = m;
        }
        return json;
    },
    // Override to change the serialization format
    toJSON: function() {
        var json = _.clone(this.attributes);
        if(json.date)
            json.date = json.date.toISOString();
        return json;
    }    
});

/**
 * A month calendar.
 */
exp.MonthCalendar = Backbone.View.extend({
    className: 'gui-calendar',
    
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
            '</div>'+
        '</td>'
    ),
    events: {
        // 'keydown': 'onKeyDown',
        'click .prevmonth': 'showPrevMonth',
        'click .nextmonth': 'showNextMonth'
    },

    initialize: function(config) {
        config = config || {};
        this.model = config.model || new MonthCalendarModel(config, {parse:true});
        this.listenTo(this.model, 'change', this.onModelChange, this)
    },
    onModelChange: function(model) {
        var attrs = model.changedAttributes();
        this.render();
    },
    showNextMonth: function() {
        var date = this.model.get('date')
        this.model.set('date', moment(date).clone().add({months: 1}));
    },
    showPrevMonth: function() {
        var date = this.model.get('date')
        this.model.set('date', moment(date).clone().subtract({months: 1}));
    },
    
    render: function() {
        var date = moment(this.model.get('date')),
            m = date.clone(),
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
        var table = $(this.template({monthname: date.format('MMMM')}));
        var tbody = table.children('tbody');
    
        // Render the header
        table.find('thead .header').html(this.templateHeader({
            monthname: date.format('MMMM'),
            year: date.format('YYYY')
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
                var html = $(this.templateDay({
                    cls: cls.join(' '),
                    date: m.date(),
                    ymd: m.format('YYYY-MM-DD')
                }));
                tr.append(html);
            }
            m.add('days', 1);
        }
        
        $(this.el).empty().append(table);    
        
        
        return this;    
    }


    
});


return exp;
});