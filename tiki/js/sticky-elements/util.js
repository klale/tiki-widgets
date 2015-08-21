import $ from 'jquery';



export function extend(protoProps) {
  var parent = this;
  var child;

  // The constructor function for the new subclass is either defined by you
  // (the "constructor" property in your `extend` definition), or defaulted
  // by us to simply call the parent's constructor.
  if (protoProps && _.has(protoProps, 'constructor')) {
    child = protoProps.constructor;
  } else {
    child = function(){ return parent.apply(this, arguments); };
  }

  // Set the prototype chain to inherit from `parent`, without calling
  // `parent`'s constructor function.
   child.prototype = Object.create(parent.prototype);

  // Add prototype properties (instance properties) to the subclass,
  // if supplied.
  if (protoProps) _.extend(child.prototype, protoProps);

  return child;
}



export function mixin(Parent, Mixin) {
  Mixin = Mixin.prototype;

  class Mixed extends Parent {}

  Object.getOwnPropertyNames(Mixin).forEach(function (name) {
    if (name !== "constructor") {
      Object.defineProperty(Mixed.prototype, name, Object.getOwnPropertyDescriptor(Mixin, name));
    }
  });

  return Mixed;
}


export function getRelativeRect(el, scrollEvent) {
  var rect = cloneRect(el.getBoundingClientRect());
  rect.top -= scrollEvent.viewportRect.top;
  rect.bottom = rect.top + rect.height;
  rect.left -= scrollEvent.viewportRect.left;
  return rect;
}


export function cloneRect(rect) {
  return {
    bottom: rect.bottom,
    height: rect.height,
    left: rect.left,
    right: rect.right,
    top: rect.top,
    width: rect.width
  }
}


export class ScrollEvent {
  constructor(config) {
    this._mutated = [];

    this.direction = config.direction;
    this.viewportWidth = config.viewportWidth;
    this.viewportHeight = config.viewportHeight;
    this.viewportRect = config.viewportRect;
    this.stackHeight = config.stackHeight;
    this.scrollTop = config.scrollTop;
    this.scrollLeft = config.scrollLeft;
    this.scrollWidth = config.scrollWidth;
    this.e = config.e;
  }
  hasMutated(cid) {
    return this._mutated.indexOf(cid) !== -1;
  }
  addMutated(cid) {
    this._mutated.push(cid);
  }
}


