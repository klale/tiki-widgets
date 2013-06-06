define([
    'jquery',
    'underscore',
    'backbone',
    'globalize/globalize',
    'gui/base',
    'gui/tools',    
], function($, _, Backbone, Globalize, base, tools) {

    var traits = {};
    
    var make = function(proto) {
        if(_.has(proto, 'constructor'))
            var F = proto.constructor;
        else
            var F = Function();
        F.prototype = proto;
        return F;
    }
    
    traits.String = make({
        parse: function(v) {
            return String(v);
        },
        toJSON: function(v) {
            return v;
        }
    });
    
    traits.Number = make({
        parse: function(v) {
            if(!v && v !== 0) 
                return null;
            else if(_.isString(value))
                return Globalize.parseFloat(value) || null; // returns NaN on fail.
            else
                return _.isNumber(value) ? value : null;            
        },
        toJSON: function(v) {
            return v;
        }
    });
    
    traits.DateTime = make({
        parse: function(v) {
            return tools.interpretdate(v);
        },
        toJSON: function(v) {
            return v.toISOString();
        }
    });
    
    traits.Instance = make({
        constructor: function(type) {
            this.type = type;
        },
        parse: function(v) {
            return new this.type(v, {parse: true});
        },
        toJSON: function(v) {
            if(v)
                return v.toJSON();
        }
    })


    
    return traits;
});