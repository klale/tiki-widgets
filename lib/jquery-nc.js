// define('jquery-nc', ['jquery'], function($){
//     return $.noConflict(true);  // requirejs will cache the returned value
// });

define(['jquery180'], function(){
    return jQuery.noConflict(true);  // requirejs will cache the returned value
});


// define(['/gui/lib/jquery-1.8.0.js'], function() {
//     return jQuery.noConflict(true);
// });