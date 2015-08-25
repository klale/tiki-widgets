// ES6
// import Sticky from './sticky-elements/Sticky';
// import HorizontallyFixed from './sticky-elements/HorizontallyFixed';
// import ContextMixin from './sticky-elements/ContextMixin';
// import Watcher from './sticky-elements/Watcher';

// export default {
//   Sticky: Sticky,
//   HorizontallyFixed: HorizontallyFixed,
//   ContextMixin: ContextMixin,
//   Watcher: Watcher
// }

define([
  './sticky-elements/Sticky',
  './sticky-elements/HorizontallyFixed',
  './sticky-elements/ContextMixin',
  './sticky-elements/Watcher'
], function(Sticky, HorizontallyFixed, ContextMixin, Watcher) {
'use strict';

return {
  Sticky: Sticky,
  HorizontallyFixed: HorizontallyFixed,
  ContextMixin: ContextMixin,
  Watcher: Watcher
}


});