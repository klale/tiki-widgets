
// =================
// = MonthCalendar =
// =================

/**
 * A month calendar containing one or more Tasks.
 * 
 * It supports keyboard navigation if focused. (To make it focusable, 
 * make sure this.el has tabindex=0)
 * 
 */
gui.MonthCalendar = Backbone.View.extend({
    tagName: 'div',
    className: 'calendar',
    
    template: _.template(''+
        '<table>'+
            '<thead>'+
                '<tr class="monthname">'+
                    '<th colspan="7"><%= monthname %></th>'+
                '</tr>'+
                '<tr class="weekdays"></tr>'+
            '</thead>'+
            '<tbody></tbody>'+
        '</table>'
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
        'keydown': 'onKeyDown',
        'mouseover': 'onMouseOver'
    },
    // templateTask: _.template('' +
    //     '<li style="height: <% print((obj.hours_reserved || 0.5) * 10) %>px">'+
    //         '<div class="popup">'+
    //             '<h2><%= title %></h2>'+
    //         '</div>'+
    //     '</li>'
    // ),
    
    initialize: function(conf) {
        // Backbone.View.prototype.initialize.call(this, conf);
        conf = conf || {};
        var now = moment();
        this.month = conf.month || now.month(); // zero-based
        this.year = conf.year || now.year();
        this.fill = conf.fill;

        // // Create a tasks-collection
        // this.collection = new babble.Collection({
        //     // This collection ever only contains Comment objects, so just use 
        //     // the default Collection.prototype.make_model
        //     model: babble.Comment,
        //     // REST request verbs goes here
        //     url: conf.url,
        //     // A bunch of comments as bootstrapped plain javascript objects
        //     data: conf.data
        // });
        // this.collection.on('all', this.onCollectionAll, this);        


        // this.render();
    },
    onMouseOver: function(e) {
    },
    onKeyDown: function() {
    },
    onCollectionAll: function(eventname, e) {
        
    },
    daysInMonth: function(year, month) {
        return new Date(year, month, 0).getDate();
    },    
    render: function() {
        var month = moment(new Date(this.year, this.month));
        var today = moment(new Date());
        var today_month = today.month(),
            today_date = today.date();
        
        var m = moment(new Date(this.year, this.month));
        var firstWeekdayOfMonth = m.day();
        m.subtract('days', firstWeekdayOfMonth);

        // Create the main table
        var table = $(this.template({monthname: month.format('MMMM')}));
        var tbody = table.children('tbody');
        var weekdaysRow = table.find('thead tr.weekdays');        
        
        // Add the weekday names
        for(var i=0,days=[1,2,3,4,5,6,0]; i<days.length; i++) {
            weekdaysRow.append($('<th>'+moment.weekdaysShort[days[i]]+'</th>'));
        }
        
        // Add all the days

        for(var i=0; i<42; i++) {
            if(i % 7 == 0) {
               var tr = $('<tr></tr>').appendTo(tbody);
            }
            
            // Add optional cell styling
            var cls = ['day'];
            if(m.month() !== this.month) {
                cls.push('gray');
            }
            if(m.day() >= 5) {
                cls.push('weekend');
            }
            if(m.date() == today_date && m.month() == today_month) {
                cls.push('today');
            }

            // Draw the cell
            if(!this.fill && m.month() !== this.month) {
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
        

        
        // // Draw any tasks of the cell
        // // TODO: move this into a TaskCalendar or something
        // var el = this.el;
        // $.each(window.scheduledTasks, function(k, v) {
        //     var height = (v.hours_reserved * 8) || 4;
        //     tbody.find('td[data-ymd="'+v.date_ymd+'"] .tasks').append('<li><a href="'+v.uri+'" title="('+v.hours_reserved+') '+v.title+'" style="height:'+height+'px"></a></li>');
        //     
        // });

        
        $(this.el).append(table);
        
        return this;
            
    }

    
});



// // ==========
// // = TriCal =
// // ==========
// gui.TriCal = jkit.View.extend({
//     
//     template: jkit.template(''+
//         '<div class="prev_month"></div>'+
//         '<div class="curr_month"></div>'+
//         '<div class="next_month"></div>'
//     ),
//     
//     init: function(conf) {
//         /* Trical is a widget containing 3 month calendars:
//         the current, previous and next month.*/
//         
//         conf.events = {
//             'taskdrop': this.onTaskDrop,
//             'taskmouseover': this.onTaskMouseOver,
//             'taskmouseout': this.onTaskMouseOut            
//         };
//         jkit.drag.on('dragend', this.onDragEnd, this);
//         
//         conf = conf || {};
//         this._super(conf);
//         
//         // Create a "moment" object
//         if(conf.year && conf.month) {
//             var m = moment(new Date(conf.year, conf.month));
//             this.year = m.year();
//             this.month = m.month();            
//         } else {
//             var m = moment(new Date());
//             this.year = m.year();
//             this.month = m.month();
//         }
//         
//         // Apply the template to this.el
//         this.el.append(this.template())
//         
//         // Create a collection
//         // var collection = new jkit.Collection({
//         //     model: jkit.Task,
//         //     url: '/task',
//         //     data: window.scheduledTasks            
//         // });
//         // collection.on('all', this.onCollectionAll, this);        
//         
//         // Create "prev" calendar
//         var prev = m.clone().subtract('months', 1);
//         this.prev = new gui.MonthCalendar({
//             el: this.el.find('.prev_month'),
//             year: prev.year(),
//             month: prev.month(),
//         });
//         
//         // create "curr" calendar
//         this.curr = new gui.MonthCalendar({
//             el: this.el.find('.curr_month'),
//             year: m.year(),
//             month: m.month()            
//         });
// 
//         // Create "next" calendar
//         var next = m.clone().add('months', 1);
//         this.next = new gui.MonthCalendar({
//             el: this.el.find('.next_month'),
//             year: next.year(),
//             month: next.month()
//         });
//         
//     },
//     
//     onTaskDrop: function(e, data) {
//         var tr = data.conf.tr;
//         var ymd = $(e.target).parents('td').attr('data-ymd');
//         var id = data.conf.tr.attr('id');
//         console.log('task drop!: ', id, ymd);
//         
//         $.ajax({
//             url: '/task/'+id+'/',
//             type: 'put',
//             dataType: 'json',
//             data: {date: ymd},
//             success: $.proxy(this.onPutSuccess, this),
//         });
//     },
//     onPutSuccess: function(e) {
//         alert('reloading!');
//         window.location.reload();
//     },
//     onTaskMouseOver: function(e) {
//         var td = $(e.target).parents('td:first');
//         if(!td.hasClass('empty'))
//             $(e.target).parents('td:first').addClass('over');
//     },
//     onTaskMouseOut: function(e) {
//         $(e.target).parents('td:first').removeClass('over');
//     },
//     onDragEnd: function(e) {
//         this.el.find('td.over').removeClass('over');
//     },
//     onCollectionAll: function(eventname, e) {
//         
//     }
//     
// });
