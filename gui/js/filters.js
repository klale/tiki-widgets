define([
    'jquery',
    'underscore',
    'backbone',
    './base',
    './form',
    './traits',
    './simpleform',
    './menu'
], function($, _, Backbone, base, form, traits, simpleform, menu) {
   

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
    (as: myrowview.form.values).
    
    A Constraint can be validated.
    */
    var Constraint = Backbone.Model.extend({
        parse: function(json) {
            return json;
        },
        toQueryString: function() {
            if(!this.get('name'))
                return '';
                
            console.log('toQueryString', this.attributes)
            
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
        defaults: {
            predicate: 'atleast'
        },
        predicates: [
            {id: 'eq', text: 'Is'},
            {id: 'atleast', text: 'At least'},
            {id: 'atmost', text: 'At most'},
            {id: 'between', text: 'Between', isrange: true}
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
            {id: 'eq', text: 'Is'},
            {id: 'atleast', text: 'At least'},
            {id: 'atmost', text: 'At most'},
            {id: 'between', text: 'Between', isrange: true}
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
            {id: 'eq', text: 'Is'},
            {id: 'startswith', text: 'Starts with'},
            {id: 'endswith', text: 'Ends with'},
        ],
    });

    var EnumConstraint = Constraint.extend({
        traits: {
            'title': new traits.String(),
            'name': new traits.String(),
            'predicate': new traits.String(),
            // 'options': new traits.Collection(),
            'value': new traits.String(),
        },
        defaults: {
            predicate: 'eq'
        },
        predicates: [
            {id: 'eq', text: 'Is'},
            {id: 'ne', text: 'Is not'},
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
                // '<div name="name"></div>'+
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
            this.form = new simpleform.CustomForm({
                values: this.model,
                fields: {
                    // 'name': {type: 'combo', options: tmpOptions},
                    'predicate': {type: 'combo', options: this.model.predicates},
                    'value': {type: 'text'},
                    'value2': {type: 'text'}                    
                },
                el: this.el
            });
        },
        render: function() {
            this.form.render();
            this.$('>.title').text(this.model.get('title'));
            
            var pred = this.model.get('predicate');
            if(pred) {
                var isrange = _.findWhere(this.model.predicates, {id:pred}).isrange
                console.log('IS: ', pred, isrange)
                if(isrange)
                    this.$('*[name=value2]').show();
                else 
                    this.$('*[name=value2]').hide();
                
            }
            else {
                this.$('*[name=value2]').hide();
            }
            
            return this;
        }
    });
    
    var NumberRow = StringRow.extend({
        defaultmodel: NumberConstraint,
        initialize: function(config) {
            this.model = config.model || new NumberConstraint(config, {parse: true});
            this.$el.html(this.template(this.model.toJSON()));

            // Create a basic form            
            this.form = new simpleform.CustomForm({
                values: this.model,
                fields: {
                    // 'name': {type: 'combo', options: tmpOptions},
                    'predicate': {type: 'combo', options: this.model.predicates},
                    'value': {type: 'text', modeltype: 'number'},
                    'value2': {type: 'text', modeltype: 'number'}                    
                },
                el: this.el
            });
            
            this.form.form.values.on('change', function(e) {
               console.log('yey', arguments) 
            })            
            
        },        
    })

    var DateRow = Backbone.View.extend({
        tagName: 'li',
        template: _.template2(''+
            '<div class="title">${obj.title}</div>'+
            '<div class="fields">'+
                // '<div name="name"></div>'+
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
            this.form = new simpleform.CustomForm({
                values: this.model,
                fields: {
                    // 'name': {type: 'combo', options: tmpOptions},
                    'predicate': {type: 'combo', options: this.model.predicates},
                    'value': {type: 'date'},
                    'value2': {type: 'date'}                    
                },
                el: this.el
            });
        }
        // render: function() {
        //     this.form.render();
        //     this.$('>.title').text(this.model.get('title'));
        //     return this;
        // }
    });


    var EnumRow = Backbone.View.extend({
        tagName: 'li',
        template: _.template2(''+
            '<div class="title">${obj.title}</div>'+
            '<div class="fields">'+
                '<div name="predicate"></div>'+
                '<div name="value"></div>'+
            '</div>'+
            '<div class="tools">'+
                '<button class="remove">Remove</button>'+
            '</div>'
        ),
        defaultmodel: EnumConstraint,
        
        initialize: function(config) {
            this.model = config.model || new EnumConstraint(config, {parse: true});
            this.$el.html(this.template(this.model.toJSON()));


            var constraintType = this.model.collection.types.findWhere({name: this.model.get('name')});

            // Create a basic form
            this.form = new simpleform.CustomForm({
                values: this.model,
                fields: {
                    'predicate': {type: 'combo', options: this.model.predicates},
                    'value': {type: 'combo', options: constraintType.get('options')},
                },
                el: this.el
            });
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
            // `options.collection` is what you would expect `this` to be.
            var obj = options.collection.types.findWhere({name: attrs.name});
            

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
            // this.model.get('constraints').add({});
            var m = new menu.Menu({
                options: this.model.get('constraintTypes').map(function(o) {
                    return {id: o.get('name'), text: o.get('title')}
                })
            });
            console.log('FOO2', this.model.get)
            m.show().alignTo(this.el)
            var model = this.model;
            m.selectable.on('choose', function(e) {
                console.log('NAME: ', e.model.get('id'))
                model.get('constraints').add({
                    name: e.model.get('id')
                })
            })
            
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
        'date': DateRow,
        'string': StringRow,
        'number': NumberRow,
        'enum': EnumRow
    };


    return {
        FilterView: FilterView,
        StringRow: StringRow,
        DateRow: DateRow,
        EnumRow: EnumRow,
        viewtypes: viewtypes
    }
    

});