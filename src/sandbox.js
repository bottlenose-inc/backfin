// ## Sandbox
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
    
    var self = this;
    var registerView = this.registerView.bind(this),
        registerModel = this.registerModel.bind(this);
    
    this._registeredViews = [];
    this._registeredModels = [];

    this.views = {};
    this.models = {};

    this.View = Backbone.View.extend({
      constructor : function(){
        registerView(this);
        this.initialize.apply(this, arguments);
      }
    });

    this.Model = Backbone.Model.extend({
      constructor : function(){
        registerModel(this);
        this.initialize.apply(this, arguments);
      }
    });

    function configure(registerFn, object) {
      return object.extend({
        constructor : function(){
          registerFn(this);
          this.initialize.apply(this, arguments);
        }
      });
    }
    
    Object.keys(options).forEach(function(key){
      switch(key) {
        case 'models':
          Object.keys(options.models || {}).forEach(function(k) {
            self.models[k] = configure(registerModel, options.models[k]);
          });
        break;
        case 'views' :
          Object.keys(options.views || {}).forEach(function(k) {
            console.log(k, options.views[k], registerView);
            self.views[k] = configure(registerView, options.views[k]);
          });
        break;
      }
    });
  }

  // * **param:** {string} subscriber Module name
  // * **param:** {string} channel Event name
  // * **param:** {object} callback Module
  Sandbox.prototype.subscribe = function(){
    mediator.subscribe(channel, subscriber, callback, context || this);
  }
  // * **param:** {string} channel Event name
  Sandbox.prototype.trigger = function(channel) {
    mediator.trigger.apply(mediator, arguments);
  }

  // * **param:** {Object/Array} an array with objects or single object containing channel and element
  Sandbox.prototype.start = function(list) {
    mediator.start.apply(mediator, arguments);
  }

  // * **param:** {string} channel Event name
  // * **param:** {string} el Element name
  Sandbox.prototype.stop = function(channel, el) {
    mediator.stop.apply(mediator, arguments);
  };

  Sandbox.prototype.registerView = function(view) {
    this._registeredViews.push(view);
  };

  Sandbox.prototype.registerModel = function(model) {
    this._registeredModels.push(model);
  };

  return Sandbox;
});