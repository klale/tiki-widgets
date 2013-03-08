define([
    'jquery',
    'underscore',
    'backbone',
    'gui/base',
    'gui/form',    
], function($, _, Backbone, gui, form) {


    // Map of filter types
    filters = {};

    var FilterView = Backbone.View.extend({
        tagName: 'div',
        className: 'filterview',
        template: _.template2(''+
        '<ul></ul>'+
        '<div class="tools">'+
            '<button class="add">Add</button>'+
            '<button class="apply">Apply</button>'+
        '</div>'),
        events: {
            'click li .remove': 'onRemoveClick',
            'click button.apply': 'onApplyClick',
        },
    
        initialize: function(config) {
            this.config = config;
            this.filterType = config.filterType || 'and';
            this.applied = config.applied;
        
            // Populate this.available
            this.filters = []
            this.filterMap = {}
            _.each(config.filters, function(filter) {
                filter.factory = filters[filter.type];
                this.filters.push(filter);
                this.filterMap[filter.name] = filter;
            }, this);
        
            // Populate this.applied
            this.state = [];
            _.each(config.state, function(values) {
                var filtertype = this.filterMap[values.name];
                var config = _.extend(filtertype.defaults, values, {
                    title: filtertype.title,
                    defaults: filtertype.defaults
                });

                var filter = new filtertype.factory(config);
                this.state.push(filter);
            }, this);
        },
    
        render: function() {
            this.$el.html(this.template());
            var ul = this.$('ul');


            // One add filters (<li>'s) to the <ul>
            _.each(this.state, function(filter) {
                ul.append(filter.render().el);                
            });
            return this;
        },
        getQueryString: function() {
            var q = _.map(this.state, function(filter) {
                return filter.getQueryString();
            });
            q.splice(0,0, 'filterType='+this.filterType);
            return q.join('&')
        },
        onRemoveClick: function(e) {
            var li = $(e.target).parents('li');
            this.state.splice(li.index(), 1);
            this.render();
        },
        onApplyClick: function(e) {
            console.log('apply', this.getQueryString());
        }

    
    
    });


    // var FilterGroup = Backbone.View.extend({
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
    var FilterModel = Backbone.Model.extend({
        defaults: {
            'name': '',
            'title': '',
            'predicate': '',
            'value': null 
        }
    });

    /*

    FilterView
    ----------
    A list of available filter the user can add:
    availableFilters: [
        {name: 'invoice_date', title: 'Fakturadatum', type: 'datetime', defaults: {predicate: 'atleast', date1: Date()}}
    ],
    values: {
        'invoice_date': {predicate: 'between', date1: '2012-01-01', date2: '2012-01-15'},
        'amount' {predicate: 'atleast', value: 1000}
    }


    Example I 
    -----------------------------------------
    var datefilter = new DateFilter({
        name: 'foo',
        title: 'Foo',
        values: {
            'predicate': 'between',
            'date1': '2012-01-01',
            'date2': '2012-01-01',
        }
    });


    var filterview = new FilterView({
        available: [
            {type: 'datetime'}
        ]
        filters: datefilters
    })

    */


    var Filter = Backbone.View.extend({
        tagName: 'li',
        events: {
            'click .remove': 'remove'
        },
    
        initialize: function(config) {
            this.name = config.name;
            this.title = config.title;            
        },
        remove: function() {
        
        },
        onModelChange: function() {
        
        }
    });


    filters.date = Filter.extend({
    
        template: _.template2(''+
            '<div class="title">${obj.title}</div>'+
            '<div class="fields">'+
                '<div type="combo" name="predicate"></div>'+
                '<div type="date" name="value"></div>'+
                '<div type="date" name="value2"></div>'+
            '</div>'+
            '<div class="tools">'+
                '<button class="remove">Remove</button>'+
            '</div>'),
    
        initialize: function(config) {
            Filter.prototype.initialize.call(this, config)

            var model = new FilterModel({
                name: config.name,
                predicate: config.predicate,
                value: config.value,
                value2: config.value2,
            });
            model.on('change:predicate', this.onPredicateChange, this)
            this.form = new form.CustomForm({
                model: model,
                domTemplate: $(this.template({title: this.title}))
            });

            // Add some options
            this.form.fieldsmap['predicate'].options = [
                {id: 'is', text: 'exactly'},
                {id: 'between', text: 'between'},
                {id: 'atleast', text: 'At least'},
                {id: 'atmost', text: 'At most'}
            ];
        },
    
        render: function() {
            this.$el.empty().append(this.form.render().el);

            // Hide date2 if not applicable
            if(this.form.model.get('predicate') != 'between')
                this.form.fieldsmap['value2'].$el.hide();
            
            return this;
        },
        getQueryString: function() {
            var model = this.form.model;
            var s = this.name+'='+model.get('predicate')+','+model.get('value');
            if(model.get('predicate') == 'between')
                s += ','+model.get('value2');
            return s;
        },
        onPredicateChange: function(model, newval, changes) {
            this.form.fieldsmap['value2'].$el.toggle(newval=='between');
        }
    });




    filters.number = Filter.extend({

        template: _.template2(''+
            '<div class="title">${obj.title}</div>'+
            '<div class="fields">'+
                '<div type="combo" name="predicate"></div>'+
                '<div type="text" name="value"></div>'+
                '<div type="text" name="value2"></div>'+
            '</div>'+
            '<div class="tools">'+
                '<button class="remove">Remove</button>'+
            '</div>'),
    
        initialize: function(config) {
            Filter.prototype.initialize.call(this, config)

            var model = new FilterModel({
                name: config.name,
                predicate: config.predicate,
                value: config.value,
                value2: config.value2,
            });
            model.on('change:predicate', this.onPredicateChange, this)
            this.form = new form.CustomForm({
                model: model,
                domTemplate: $(this.template({title: this.title}))
            });

            // Add some options
            this.form.fieldsmap['predicate'].options = [
                {id: 'is', text: 'exactly'},
                {id: 'between', text: 'between'},
                {id: 'atleast', text: 'At least'},
                {id: 'atmost', text: 'At most'}
            ];

        },
        render: function() {
            this.$el.empty().append(this.form.render().el);

            // Hide value2 if not applicable
            if(this.form.model.get('predicate') != 'between')
                this.form.fieldsmap['value2'].$el.hide();
        
            return this;
        },
        getQueryString: function() {
            var model = this.form.model;
            var s = this.name+'='+model.get('predicate')+','+model.get('value');
            if(model.get('predicate') == 'between')
                s += ','+model.get('value2');
            return s;
        },
        onPredicateChange: function(model, newval, changes) {
            this.form.fieldsmap['value2'].$el.toggle(newval=='between');
        }        
    });

    filters.text = Filter.extend({
    
        template: _.template2(''+
            '<div class="title">${obj.title}</div>'+
            '<div class="fields">'+
                '<div type="combo" name="predicate"></div>'+
                '<div type="text" name="value"></div>'+
            '</div>'+
            '<div class="tools">'+
                '<button class="remove">Remove</button>'+
            '</div>'),
    
        initialize: function(config) {
            Filter.prototype.initialize.call(this, config)

            var model = new FilterModel({
                name: config.name,
                predicate: config.predicate,
                value: config.value
            });
            this.form = new form.CustomForm({
                model: model,
                domTemplate: $(this.template({title: this.title}))
            });

            // Add some options
            this.form.fieldsmap['predicate'].options = [
                {id: 'is', text: 'exactly'},
                {id: 'contains', text: 'contains'},
                {id: 'startswith', text: 'Starts with'},
                {id: 'endswith', text: 'Ends with'}
            ];
        },
        render: function() {
            this.$el.empty().append(this.form.render().el);            
            return this;
        },
        getQueryString: function() {
            var model = this.form.model;
            return this.name+'='+model.get('predicate')+','+model.get('value');
        },
    });    
    

    
    
    return {
        'FilterView': FilterView,
        'Filter': Filter,
        'FilterModel': FilterModel,
        'filters': filters,        
    };
});





