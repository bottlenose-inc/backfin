// ## Sandbox
// Implements the sandbox pattern and set up an standard interface for modules.
// This is a subset of the mediator functionality.
//
// Note: Handling permissions/security is optional here
// The permissions check can be removed
// to just use the mediator directly.
define('backfin-sandbox',['backfin-core'], function(mediator) {
  "use strict";
  
  var sandbox = {};

  // * **param:** {string} subscriber Module name
  // * **param:** {string} channel Event name
  // * **param:** {object} callback Module
  sandbox.subscribe = function(channel, subscriber, callback, context) {
    //if (permissions.validate(channel, subscriber)) {
      mediator.subscribe(channel, subscriber, callback, context || this);
    //}
  };

  // * **param:** {string} channel Event name
  sandbox.publish = function(channel) {
    mediator.publish.apply(mediator, arguments);
  };

  // * **param:** {Object/Array} an array with objects or single object containing channel and element
  sandbox.start = function(list) {
    mediator.start.apply(mediator, arguments);
  };

  // * **param:** {string} channel Event name
  // * **param:** {string} el Element name
  sandbox.stop = function(channel, el) {
    mediator.stop.apply(mediator, arguments);
  };

  return sandbox;
});