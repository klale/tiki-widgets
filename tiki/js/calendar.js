define([
    'jquery',
    'underscore',
    'backbone',
    'moment',
    'globalize/globalize',
    './tools',
    './menu',
    './traits'
], function($, _, Backbone, moment, Globalize, Tools, Menu, Traits) {
    'use strict';
    var exp = {};

    // =================
    // = MonthCalendar =
    // =================
    var MonthCalendarModel = Traits.Model.extend({
        traits: {
            date: new Traits.Date(),
            fill: new Traits.Bool()
        },
        defaults: function() {
            return {
                date: new Date(),
                fill: false
            };
        }
    });

    /**
     * A month calendar.
     */
    exp.MonthCalendar = Tools.View.extend({
        className: 'tiki-calendar',

        template: _.template(''+
            '<table>'+
                '<thead>'+
                    '<tr><td class="header" colspan="<%= colspan %>"></td></tr>'+
                '</thead>'+
                '<tbody></tbody>'+
            '</table>'
        ),
        templateHeader: _.template(''+
            '<div class="monthname">'+
                '<span class="month"><%= monthname %></span>'+
                '<span class="year"><%= year %></span>'+
            '</div>'+
            '<button class="prevyear"></button>'+
            '<button class="prevmonth"></button>'+
            '<button class="nextmonth"></button>'+
            '<button class="nextyear"></button>'
        ),
        templateDay: _.template(''+
            '<td class="<%= cls %>" data-ymd="<%= ymd %>">'+
                '<div>&nbsp;'+
                    '<div class="date"><%= date %></div>'+
                '</div>'+
            '</td>'
        ),
        events: {
            'click .prevyear': 'showPrevYear',
            'click .nextyear': 'showNextYear',
            'click .prevmonth': 'showPrevMonth',
            'click .nextmonth': 'showNextMonth',
            'mousedown .monthname .month': 'showMonthDropdown',
            'mousedown .monthname .year': 'showYearDropdown',
        },
        ui: {
            monthname: '.monthname .month',
            yearname: '.monthname .year'
        },


        initialize: function(config) {
            config = config || {};
            this.model = config.model || new MonthCalendarModel(config, {parse:true});
            this.weeks = config.weeks || false;
            this.listenTo(this.model, 'change', this.onModelChange, this);
        },
        onModelChange: function(model) {
            var attrs = model.changedAttributes();
            this.render();
            this.trigger('calendarModelChanged');
        },
        showNextMonth: function() {
            var date = this.model.get('date');
            this.model.set('date', moment(date).clone().add({months: 1}).toDate());
        },
        showPrevMonth: function() {
            var date = this.model.get('date');
            this.model.set('date', moment(date).clone().subtract({months: 1}).toDate());
        },
        showNextYear: function() {
            var date = this.model.get('date');
            this.model.set('date', moment(date).clone().add({years: 1}).toDate());
        },
        showPrevYear: function() {
            var date = this.model.get('date');
            this.model.set('date', moment(date).clone().subtract({years: 1}).toDate());
        },
        showMonthDropdown: function(e) {
            e.preventDefault();
            if(!this.monthDropdown) {
                var names = Globalize.cultures.default.calendar.months.names;
                this.monthDropdown = new Menu.Menu({
                    options: _.map(_.range(12), function(i) { return {id: i, text: names[i]}; })
                })
                this.listenTo(this.monthDropdown, {
                    'select': this.onMonthDropdownSelect,
                    'hide': this.onDropdownHide
                });
            }
            this.monthDropdown.show({alignTo: {of: this.ui.monthname}});
        },
        showYearDropdown: function(e) {
            e.preventDefault();
            if(!this.yearDropdown) {
                var options = _.map(_.range(1900, 2101), function(i) { return {id: i, text: i+''}; })
                this.yearDropdown = new Menu.Menu({
                    options: options
                })
                this.listenTo(this.yearDropdown, {
                    'select': this.onYearDropdownSelect,
                    'hide': this.onDropdownHide
                });
            }
            this.yearDropdown.show({alignTo: {of: this.ui.yearname}, active: this.model.date.getFullYear()});
        },
        render: function() {
            var date = moment(this.model.get('date') || new Date()),
                m = date.clone(),
                month = m.month(),
                today = moment(new Date()),
                today_month = today.month(),
                today_date = today.date(),
                dayNames = Globalize.cultures.default.calendar.days.namesShort;

            // Start at first day of month
            m.date(1);
            // Next month (so that no empty calendar row will be added)
            var nextMonth = new Date(m.year(), m.month() + 1, 1);
            var firstWeekdayOfMonth = m.day() - 1;
            if(firstWeekdayOfMonth == -1)
                firstWeekdayOfMonth = 6;
            m.subtract('days', firstWeekdayOfMonth);

            // Create the main table
            var colspan = this.weeks ? 8 : 7;
            var table = $(this.template({colspan:colspan}));
            var tbody = table.children('tbody');

            // Render the header
            table.find('thead .header').html(this.templateHeader({
                monthname: date.format('MMMM'),
                year: date.format('YYYY')
            }));


            // Add the weekday names
            var tr = $('<tr class="weekdays"></tr>').appendTo(table.find('thead'));
            if(this.weeks) {
                tr.append('<th></th>');
            }
            for(var i=0,days=[1,2,3,4,5,6,0]; i<days.length; i++) {
                tr.append($('<th>'+dayNames[days[i]]+'</th>'));
            }

            // Add all the days
            for(i=0; i<42; i++) {
                if(i % 7 === 0) {
                    if(m.month() === nextMonth.getMonth()){
                        // make sure no empty weeks are added
                        break;
                    }
                    tr = $('<tr></tr>').appendTo(tbody);
                    if(this.weeks) {
                        tr.append('<td class="weeknumber">'+m.week()+'</td>');
                    }
                }

                // Add optional cell styling
                var cls = ['day'],
                    day = m.day();
                if(m.month() !== month) {
                    cls.push('gray');
                }
                if(day == 6 || day === 0) { // saturday or sunday
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
            this.$el.attr("tabindex", "0");
            this.el.focus();

            this.bindUI();
            return this;
        },
        onDropdownHide: function(e) {
            this.trigger('dropdownhide');
        },
        onMonthDropdownSelect: function(e) {
            var date = moment(this.model.date);
            this.model.date = date.month(e.id).toDate();
        },
        onYearDropdownSelect: function(e) {
            var date = moment(this.model.date);
            this.model.date = date.year(e.id).toDate();
        },


    });


    return exp;
});