define([
    'jquery',
    'underscore',
    'backbone',
    './base',
    './form',
    './traits',
], function($, _, Backbone, base, form, traits) {
   

    var tmpOptions = [
        {id: 'title', text: 'Title'},
        {id: 'amount', text: 'Amount'},        
        {id: 'created_at', text: 'Created at'},
    ];
    
    function createFromQueryString(klass, name, s) {
        /* Example: s = "between,2011-11-04,2012-01-01" */        
        var values = s.split(',');
        return new klass({
            name: name,
            predicate: values[0],
            value: values[1],
            value2: values[2]
        });        
    }
    
    /*
    A Constraint is a model with traits and a set of options
    for its precidate-combo.
    
    It is used as the underlying model for the row views 
    (as: myrowview.form.model).
    
    A Constraint can be validated.
    */
    var Constraint = Backbone.Model.extend({
        parse: function(json) {
            return json;
        },
        toQueryString: function() {
            if(!this.get('name'))
                return '';
            
            var s = this.get('name')+'='+this.get('predicate')+'='+this.get('value');
            if(this.get('predicate') == 'between')
                s += ','+this.get('value2');
            return s;
        }      
        
        },{                
        fromQueryString: function(name, s) {
            return createFromQueryString(this, name, s);
        }
    });
    

    var NumberConstraint = Constraint.extend({
        traits: {
            'title': new traits.String(),
            'name': new traits.String(),
            'predicate': new traits.String(),
            'value': new traits.Number(),
            'value2': new traits.Number()
        },
        predicates: [
            {id: 'is', text: 'exactly'},
            {id: 'between', text: 'between'},
            {id: 'atleast', text: 'At least'},
            {id: 'atmost', text: 'At most'}
        ],
    });
    
    var DateTimeConstraint = Constraint.extend({
        traits: {
            'title': new traits.String(),
            'name': new traits.String(),
            'predicate': new traits.String(),
            'value': new traits.DateTime(),
            'value2': new traits.DateTime()
        },
        predicates: [
            {id: 'is', text: 'exactly'},
            {id: 'between', text: 'between'},
            {id: 'atleast', text: 'At least'},
            {id: 'atmost', text: 'At most'}
        ],
        toQueryString: function() {
            if(!this.get('name'))
                return '';
            
            var s = this.get('name')+'='+this.get('predicate')+'='+this.get('value').toISOString().substr(0,10);
            if(this.get('predicate') == 'between')
                s += ','+this.get('value2').toISOString().substr(0,10);
            return s;
        }        
    });


    var StringConstraint = Constraint.extend({
        traits: {
            'title': new traits.String(),
            'name': new traits.String(),
            'predicate': new traits.String(),
            'value': new traits.String(),
            'value2': new traits.String()
        },
        predicates: [
            {id: 'is', text: 'Is exactly'},
            {id: 'startswith', text: 'Starts with'},
            {id: 'endswith', text: 'Ends with'},
        ],
    });


    // =========
    // = Views =
    // =========
    var StringRow = Backbone.View.extend({
        tagName: 'li',
        template: _.template2(''+
            '<div class="title">${obj.title}</div>'+
            '<div class="fields">'+
                '<div name="name"></div>'+
                '<div name="predicate"></div>'+
                '<div name="value"></div>'+
                '<div name="value2"></div>'+                
            '</div>'+
            '<div class="tools">'+
                '<button class="remove">Remove</button>'+
            '</div>'
        ),    
        defaultmodel: StringConstraint,
        
        initialize: function(config) {
            this.model = config.model || new StringConstraint(config, {parse: true});
            this.$el.html(this.template(this.model.toJSON()));

            // Create a basic form            
            this.form = new form.CustomForm({
                model: this.model,
                fields: [
                    {name: 'name', type: 'combo', options: tmpOptions},
                    {name: 'predicate', type: 'combo', options: this.model.predicates},
                    {name: 'value', type: 'text'},
                    {name: 'value2', type: 'text'}                    
                ],
                el: this.el
            });
        },
        render: function() {
            this.form.render();
            this.$('>.title').text(this.model.get('title'));
            return this;
        }
    });
    
    var NumberRow = StringRow.extend({
        defaultmodel: NumberConstraint,
        initialize: function(config) {
            this.model = config.model || new NumberConstraint(config, {parse: true});
            this.$el.html(this.template(this.model.toJSON()));

            // Create a basic form            
            this.form = new form.CustomForm({
                model: this.model,
                fields: [
                    {name: 'name', type: 'combo', options: tmpOptions},
                    {name: 'predicate', type: 'combo', options: this.model.predicates},
                    {name: 'value', type: 'text', modeltype: 'number'},
                    {name: 'value2', type: 'text', modeltype: 'number'}                    
                ],
                el: this.el
            });
        },        
    })

    var DateRow = Backbone.View.extend({
        tagName: 'li',
        template: _.template2(''+
            '<div class="title">${obj.title}</div>'+
            '<div class="fields">'+
                '<div name="name"></div>'+
                '<div name="predicate"></div>'+
                '<div name="value"></div>'+
                '<div name="value2"></div>'+                
            '</div>'+
            '<div class="tools">'+
                '<button class="remove">Remove</button>'+
            '</div>'
        ),
        defaultmodel: DateTimeConstraint,
        
        initialize: function(config) {
            this.model = config.model || new DateTimeConstraint(config, {parse: true});
            this.$el.html(this.template(this.model.toJSON()));

            // Create a basic form
            this.form = new form.CustomForm({
                model: this.model,
                fields: [
                    {name: 'name', type: 'combo', options: tmpOptions},
                    {name: 'predicate', type: 'combo', options: this.model.predicates},
                    {name: 'value', type: 'date'},
                    {name: 'value2', type: 'date'}                    
                ],
                el: this.el
            });
        },
        render: function() {
            this.form.render();
            this.$('>.title').text(this.model.get('title'));
            return this;
        }
    });

    
    // =================
    // = Filter widget =
    // =================    
    var ConstraintTypes = Backbone.Collection.extend({
        // initialize: function(config) {
        // }
        // model: function(attrs, options) {
        //     // attrs = raw json
        //     // find a constructor
        //     return typemap[attrs.type];
        // }
    });
    var Constraints = Backbone.Collection.extend({
        initialize: function(config, options) {
            console.log('foo', options)
            this.types = options.types; // the Filter model instance
        },
        model: function(attrs, options) {
            // get the class
            var obj = options.types.findWhere({name: attrs.name});
            

            var viewclass = viewtypes[obj.get('type')]
            attrs.type = obj.get('type');
            attrs.title = obj.get('title');
            var Model = viewclass.prototype.defaultmodel;

            
            // add an implicit parse
            _.defs(options, {parse: true});

            // Return an instance
            return new Model(attrs, options);    
        }
    });

    var FilterModel = Backbone.Model.extend({
        parse: function(json) {
            json.constraintTypes = new ConstraintTypes(json.constraintTypes);
            json.constraints = new Constraints(json.constraints, {types: json.constraintTypes});
            return json;
        },
        toJSON: function() {
            var json = _.clone(this.attributes);
            json.constraintTypes = json.constraintTypes.toJSON();
            json.constraints = json.constraints.toJSON();
            return json;
        },
        toQueryString: function() {
            return this.get('constraints').map(function(model) {
                return model.toQueryString();
            }).join('&');
        }
    });


    /*
    var f = new Filter({
        // Declare a _specification_ of available filters, just raw dicts.
        constraintTypes: [
            {type: 'enum', name: 'company', title: 'Company', options: options},
            {type: 'numeric', name: 'amount' title: 'Amount'},
            {type: 'enum', name: '_class', title: '_class', options: [..]},
        ],
        
        //  Collection of models
        constraints: [
            {name: 'company', predicate: 'is', value="43857374"},
            {name: '_class', predicate: 'is', value="slappr.models:Bill"},
            {name: 'amount', predicate: 'atleast', value="1000"},
        ]
    })    
    */
    var FilterView = Backbone.View.extend({
        className: 'gui-filter',
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
            _.bindAll(this, 'addOne', 'removeOne', 'onNameChange');
            this.model = config.model || new FilterModel(config, {parse: true});
            this.views = {};
            this.$el.html(this.template());
            this.model.get('constraints').each(function(model) {
                this.addOne(model);
            }, this)            
            this.listenTo(this.model.get('constraints'), {
                'add': this.addOne,
                'remove': this.removeOne,
                'change:name': this.onNameChange
            });
        },
        render: function() {
            return this;
        },
        addOne: function(model) {
            var view = new viewtypes[model.get('type')]({model:model});
            this.$('>ul').append(view.render().el);
            this.views[model.cid] = view;
        },
        removeOne: function(model) {
            this.views[model.cid].remove();
        },
        
        onRemoveClick: function(e) {
            var constraints = this.model.get('constraints'),
                li = $(e.target).parents('li'),
                model = constraints.at(li.index())
            constraints.remove(model);
        },
        onApplyClick: function(e) {
            this.trigger('apply', {queryString: this.model.toQueryString()})
        },
        onAddClick: function(e) {
            this.model.get('constraints').add({});
        },        
        onNameChange: function(model, newval, changes) {
            var constraints = this.model.get('constraints'),
                index = constraints.indexOf(model);

            // create a new
            var view = new viewtypes[model.get('type')]({model:model});
            this.views[model.cid].$el.replaceWith(view.render().el)
            
            // trash the existing view
            this.views[model.cid].remove();            
            this.views[model.cid] = view;
            
            // 
            // console.log('FOOO: ', arguments)
            // model.set({value: '', value2: '', predicate: ''}, {silent: true});
            // this.views[model.cid].render();
        },
        
    });



    var viewtypes = {
        date: DateRow,
        string: StringRow,
        number: NumberRow
    };


    return {
        FilterView: FilterView,
        StringRow: StringRow,
        DateRow: DateRow,
        viewtypes: viewtypes
    }
    

});