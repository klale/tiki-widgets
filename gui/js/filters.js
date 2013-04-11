define([
    'jquery',
    'underscore',
    'backbone',
    './base',
    './form'
], function($, _, Backbone, base, form) {


    var exp = {};

    var FilterModel = Backbone.Model.extend({
        defaults: {
            'name': '',
            'predicate': '',
            'value': null, 
            'value2': null,            
        },
        toQueryString: function() {
            if(!this.get('name'))
                return ''
            
            var s = this.get('name')+'='+this.get('predicate')+','+this.get('value');
            if(this.get('predicate') == 'between')
                s += ','+this.get('value2');
            return s;
        }
        
    },{
        fromQueryString: function(name, s) {
            /* Example: s = "between,2011-11-04,2012-01-01" */
            var values = s.split(',');
            return new this({
                name: name,
                predicate: values[0],
                value: values[1],
                value2: values[2]
            });            
        }
    });
    
    
    var FilterCollection = Backbone.Collection.extend({
        model: FilterModel
    });


    /*
    - 1 plain list of filters.Filter(..) views. 
    
    new FilterView({
        // Declare a _specification_ of available filters, just raw dicts.
        filters: [
            {type: 'enum', name: 'company', options: options},
            {type: 'numeric', name: 'amount'},
            {type: 'enum', name: '_class', options: [..]},
        ],
        
        //  Collection of models
        models: [
            {name: 'company', predicate: 'is', value="43857374"},
            {name: '_class', predicate: 'is', value="slappr.models:Bill"},
            {name: 'anmount', predicate: 'atleast', value="1000"},
        ]
    })    
    */    
    var FilterView = Backbone.View.extend({
        className: 'gui-filterview',
        template: _.template2(''+
        '<ul></ul>'+
        '<div class="buttons">'+
            '<button class="gui-btn add">Add</button>'+
            '<button class="gui-btn primary">Apply</button>'+
        '</div>'),
        events: {
            'click li .remove': 'onRemoveClick',
            'click button.primary': 'onApplyClick',
            'click .add': 'onAddClick',
        },
    
        initialize: function(config) {
            this.config = config;
            this.filterType = config.filterType || 'and';
            this.filters = config.filters;
            var models = config.models;
            

            // Populate this.filters and this.filtersMap
            this.filtermap = _.object(_.map(config.filters, function(f) {
                return [f.name, f];
            }));

            // Populate this.applied
            if(_.isString(config.models)) {
                models = this.modelsFromString(config.models)
            }
            this.collection = new FilterCollection(models);
            this.collection.on('change:name', this.onNameChange, this);
            this.collection.on('add', this.render, this);
            this.collection.on('remove', this.render, this);
        },
    
        render: function() {
            this.$el.html(this.template());
            var ul = this.$('ul');

            this.collection.each(function(model) {
                ul.append(this.renderOne(model));
            }, this);
            
            return this;
        },
        renderOne: function(model) {
            // console.log('RO: ', model.get('name'), this.filtermap, this.filtermap[model.get('name')].type, typemap)
            
            if(!model.get('name')) 
                return new exp.NonTypeFilter({model: model, filterview: this}).render().el;
            else {
                var filterspec = this.filtermap[model.get('name')];
                var View = typemap[filterspec.type];
                return new View({model: model, filterspec: filterspec, filterview: this}).render().el;
            }

            
        },
        modelsFromString: function(url) {
            var filtermap = this.filtermap,
                params = jsuri.Uri(url).getParams();

            /* Example: [["transaction_date", "atleast,2011-11-04"], ...] */            
            return _.compact(_.map(params, function(p) {                
                if(filtermap[p[0]]) 
                    // Todo: don't hard-code FilterModel
                    return FilterModel.fromQueryString(p[0], p[1]);
            }));
        },
        toQueryString: function() {
            var q = this.collection.map(function(model) {
                return model.toQueryString();
            });
            q.splice(0, 0, 'filterType='+this.filterType);
            return q.join('&')
        },
        onRemoveClick: function(e) {
            var li = $(e.target).parents('li'),
                model = this.collection.at(li.index())
            this.collection.remove(model);
        },
        onApplyClick: function(e) {
            this.trigger('apply', {queryString: this.toQueryString()})
        },
        onAddClick: function(e) {
            this.collection.add({});
            // var model = this.collection.at(this.collection.length-1)
        },        
        onNameChange: function(model, newval, changes) {
            model.set({value: '', value2: '', predicate: ''}, {silent: true});
            this.render();
        },

    
    
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
            this.filterspec = config.filterspec;
            this.model = config.model;
            this.filterview = config.filterview;
            this._options = _.map(config.filterview.filters, function(filter) {
                return {id: filter.name, text: filter.title}
            });
        },
        remove: function() {
        
        },
        onModelChange: function() {
        
        }
    });


    exp.NonTypeFilter = Filter.extend({
        template: _.template2(''+
            '<div>'+
                '<div class="fields">'+
                    '<div name="name"></div>'+
                '</div>'+
                '<div class="tools">'+
                    '<button class="remove">Remove</button>'+
                '</div>'+
            '</div>'),
    
        initialize: function(config) {
            Filter.prototype.initialize.call(this, config)

            // // Create a basic form
            // this.formview = new form.FormView({
            //     model: config.model,
            //     fields: [
            //         {name: 'name', type: 'combo', options: this._options},
            //     ],
            //     template: this.template()
            // });
            // Create a basic form
            this.formview = new form.CustomForm({
                el: $(this.template()),
                model: config.model,
                fields: [
                    {name: 'name', type: 'combo', options: this._options},
                ]
            });            
        },
    
        render: function() {
            this.$el.empty().append(this.formview.render().el);
            var field = this.formview.fieldsmap['name'];
            window.setTimeout(function() {
                field.focus()
            }, 100)
            // this.formview.form.fieldsmap['name'].focus();
            return this;
        },        
    })


    exp.Date = Filter.extend({    
        template: _.template2(''+
            '<div>'+
                '<div class="fields">'+
                    '<div name="name"></div>'+
                    '<div name="predicate"></div>'+
                    '<div name="value"></div>'+
                    '<div name="value2"></div>'+
                '</div>'+
                '<div class="tools">'+
                    '<button class="remove">Remove</button>'+
                '</div>'+
            '</div>'),
    
        initialize: function(config) {
            Filter.prototype.initialize.call(this, config)

            // Create a basic form
            options = [
                {id: 'is', text: 'exactly'},
                {id: 'between', text: 'between'},
                {id: 'atleast', text: 'At least'},
                {id: 'atmost', text: 'At most'}
            ];

            
            this.formview = new form.CustomForm({
                model: config.model,
                fields: [
                    {name: 'name', type: 'combo', options: this._options},
                    {name: 'predicate', type: 'combo', options: options},
                    {name: 'value', type: 'date'},
                    {name: 'value2', type: 'date'}                    
                ],
                el: $(this.template())
            });
            
            config.model.on('change:predicate', this.onPredicateChange, this)            
        },
    
        render: function() {
            this.$el.empty().append(this.formview.render().el);

            // Hide date2 if not applicable
            if(this.formview.model.get('predicate') != 'between') {
                this.formview.fieldsmap['value2'].$el.hide();
            }
            
            return this;
        },
        onPredicateChange: function(model, newval, changes) {
            this.formview.fieldsmap['value2'].$el.toggle(newval=='between');
        },

    });


    exp.Numeric = Filter.extend({
        template: _.template2(''+
            // '<div class="title">${obj.title}</div>'+
            '<div>'+
                '<div class="fields">'+
                    '<div name="name"></div>'+
                    '<div name="predicate"></div>'+
                    '<div name="value"></div>'+
                    '<div name="value2"></div>'+
                '</div>'+
                '<div class="tools">'+
                    '<button class="remove">Remove</button>'+
                '</div>'+
            '</div>'),
    
        initialize: function(config) {
            Filter.prototype.initialize.call(this, config)

            // Create a basic form
            options = [
                {id: 'is', text: 'exactly'},
                {id: 'between', text: 'between'},
                {id: 'atleast', text: 'At least'},
                {id: 'atmost', text: 'At most'}
            ];
            
            this.formview = new form.CustomForm({
                model: config.model,
                fields: [
                    {name: 'name', type: 'combo', options: this._options},
                    {name: 'predicate', type: 'combo', options: options},
                    {name: 'value', type: 'text'},
                    {name: 'value2', type: 'text'}
                ],
                el: $(this.template())
            });
            console.log('TEMPLATE: ', this.template())
            
            config.model.on('change:predicate', this.onPredicateChange, this)
        },
        render: function() {
            this.$el.empty().append(this.formview.render().el);
            console.log('TEMPLATE2: ', this.template())

            // Hide value2 if not applicable
            if(this.formview.model.get('predicate') != 'between')
                this.formview.fieldsmap['value2'].$el.hide();
        
            return this;
        },

        
        
        onPredicateChange: function(model, newval, changes) {
            this.formview.fieldsmap['value2'].$el.toggle(newval=='between');
        }        
    });

    exp.Text = Filter.extend({    
        template: _.template2(''+
            '<div>'+
                // '<div class="title">${obj.title}</div>'+
                '<div class="fields">'+
                    '<div name="name"></div>'+
                    '<div type="combo" name="predicate"></div>'+
                    '<div type="text" name="value"></div>'+
                '</div>'+
                '<div class="tools">'+
                    '<button class="remove">Remove</button>'+
                '</div>'+
            '</div>'),
    
        initialize: function(config) {
            Filter.prototype.initialize.call(this, config)

            // Create a basic form
            options = [
                {id: 'is', text: 'exactly'},
                {id: 'contains', text: 'contains'},
                {id: 'startswith', text: 'Starts with'},
                {id: 'endswith', text: 'Ends with'}
            ];
            
            this.formview = new form.CustomForm({
                model: config.model,
                fields: [
                    {name: 'name', type: 'combo', options: this._options},
                    {name: 'predicate', type: 'combo', options: options},
                    {name: 'value', type: 'text'}
                ],
                el: $(this.template())
            });
        },
        render: function() {
            this.$el.empty().append(this.formview.render().el);            
            return this;
        }
    });


    // exp.FilterRow = Backbone.View.extend({
    //     className: 'gui-filter',
    // 
    //     initialize: function(config) {
    //         this.form = config.form;
    //     },
    //     render: function() {
    //         return this;
    //     }
    // }); 

    exp.Enum = Filter.extend({    
        template: _.template2(''+
            // '<div class="title">${obj.title}</div>'+
            '<div>'+
                '<div class="fields">'+
                    '<div name="name"></div>'+
                    '<div name="value"></div>'+
                '</div>'+
                '<div class="tools">'+
                    '<button class="remove">Remove</button>'+
                '</div>'+
            '</div>'),
    
        initialize: function(config) {
            Filter.prototype.initialize.call(this, config);
            this.model.set({predicate: 'is'}, {silent: true});

            // Create a basic form
            this.formview = new form.CustomForm({
                model: config.model,
                fields: [
                    {name: 'name', type: 'combo', options: this._options},
                    {name: 'value', type: 'combo', options: this.filterspec.options}
                ],
                el: $(this.template())
            });
        },
        render: function() {
            this.$el.empty().append(this.formview.render().el);            
            return this;
        },
    });


    exp.parseUrl = function(url) {
        return _.map(jsuri.Uri(url).getParams(), function(param) {
            /* Example:
            [["transaction_date", "atleast,2011-11-04"], ...] */
            var name = param[0],
                values = param[1].split(',');
                                
            return new FilterModel({
                name: name,
                predicate: values[0],
                value: values[1],
                value2: values[2]
            });
        });
    };


    
    var typemap = {
        'date': exp.Date,
        'numeric': exp.Numeric,
        'text': exp.Text,
        'enum': exp.Enum
    }
    
    return _.extend(exp, {
        'FilterView': FilterView,
        'FilterModel': FilterModel,
        'typemap': typemap
    });
});





