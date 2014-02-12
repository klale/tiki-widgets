define([
    'jquery',
    'underscore',
    'backbone',
    'tiki/util'
], function($, _, Backbone, util) {
    'use strict';

    /*
    A "singleton". Apply this view to the top-most element containing your
    UI elements. It's common to apply this view to document.body, eg:
    
        var body = new Body({
            el: document.body
        });

    It add a new event called "focusleave". This non-propagating event is
    triggered when focus leaves an element for an unrelated element.
    
    It also stores this._keyDownEvent for each keydown, reaching this 
    element - iseful in subsequent keypress and keyup handlers.
    */
    var Body = Backbone.View.extend({
        events: {
            'keydown': 'onKeyDown',
            'keyup': 'onKeyUp',
            'focusin': 'onFocusIn',
            'focusout': 'onFocusOut'
        },
        initialize: function(config) {
            this.$el.attr('tabindex', '-1');            
        },
        render: function() {
            return this;
        },
        onKeyDown: function(e) {
            var editable = $(e.target).attr('contenteditable'),
                isModifierKey = e.which in util.modifierKeys;

            if(!isModifierKey && !editable) {
                this._keyDownEvent = e;
                util._keyDownEvent = e;
            }
        },
        onKeyUp: function(e) {
            // this._keyDownEvent = null;
        },
        onFocusIn: function(e) {
            // Now a new element has received the focus, and we can compare the two
            this.newFocused = e.target;
            
            var newFocused = this.newFocused,
                justLostFocus = this.justLostFocus;

            if(!justLostFocus)
                return; // first ever focus, thus no focusleave

            $(justLostFocus).parents().andSelf().reverse().each(function(i, parent) {
                if($(parent).contains(newFocused) || parent === newFocused) {
                    return false; // break
                }
                else {
                    // fire a non-bubbling focusleave
                    $(parent).triggerHandler('focusleave', {newFocused: newFocused, justLostFocus: justLostFocus});                                    
                }
            });            
        },
        onFocusOut: function(e) {
            // Something that had focus, lost it, but we don't now to what yet            
            this.justLostFocus = e.target;
        }
    });


    return {
        Body: Body
    };
});