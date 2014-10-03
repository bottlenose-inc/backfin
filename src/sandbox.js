// Sandbox
// Implements the sandbox pattern and set up an standard interface for modules.
// This is a subset of the mediator functionality.
//
// Note: Handling permissions/security is optional here
// The permissions check can be removed
// to just use the mediator directly.
define('backfin-sandbox',['backfin-core'], function(mediator) {
  "use strict";

  function Sandbox(options) {
    options = options || {};
    this.channel = options.channel;
    this.manifest = options.manifest;
  }


  Sandbox.prototype.on = function(eventName, callback, context) {
    mediator.on(eventName, callback, this.channel, context || this);
  }

  Sandbox.prototype.trigger = function(channel) {
    mediator.trigger.apply(mediator, arguments);
  }

  Sandbox.prototype.start = function(list) {
    mediator.start.apply(mediator, arguments);
  }

  Sandbox.prototype.stop = function(channel, el) {
    mediator.stop.apply(mediator, arguments);
  };

  return Sandbox;
});
