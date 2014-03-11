define([
    'jquery',
    'underscore',
    'backbone',
    'globalize/globalize',
    './traits'
], function($, _, Backbone, Globalize, Traits) {
    'use strict';
    
    /*    
    Example
    -------
    var s = new Selection({
        selectables: [
            {id: 'foo', text: 'Foo', amount: 1234},
            {id: 'bar', text: 'Bar', amount: 4567},
            {id: 'baz', text: 'Baz', amount: 8910}
        ],
        selected: ['foo', 'bar']
    });

    // Use the backbone Collection api to control the selection
    s.get('selection').set(['baz', 'bar']);
    
    // Or use any of the convenience methods
    s.selectOne('foo');
    s.selectAll();
    */
    var Selection = Traits.Model.extend({
        traits: {
            selectables: new Traits.Collection(),
            selected: new Traits.Subset('selectables')
        },
        defaults: {
            selectables: null,
            selected: null
        },

        selectOne: function(model, options) {
            this.get('selected').set(model, options);
        },
        selectFirst: function(options) {
            this.get('selected').set(this.get('selectables').at(0), options);
        },
        selectAll: function() {
            this.get('selected').set(this.get('selectables').models);
        },
        toggle: function(model) {
            if(this.get('selected').get(model))
                this.get('selected').remove(model);
            else
                this.get('selected').add(model);
        }
    });
    
    return {
        Selection: Selection
    };
});