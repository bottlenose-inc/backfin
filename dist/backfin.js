// ## Core
// Implements the mediator pattern and
// encapsulates the core functionality for this application.
// Based on the work by Addy Osmani and Nicholas Zakas.
//
// * [Patterns For Large-Scale JavaScript Application Architecture](http://addyosmani.com/largescalejavascript/)
// * [Large-scale JavaScript Application Architecture Slides](http://speakerdeck.com/u/addyosmani/p/large-scale-javascript-application-architecture)
// * [Building Large-Scale jQuery Applications](http://addyosmani.com/blog/large-scale-jquery/)
// * [Nicholas Zakas: Scalable JavaScript Application Architecture](http://www.youtube.com/watch?v=vXjVFPosQHw&feature=youtube_gdata_player)
// * [Writing Modular JavaScript: New Premium Tutorial](http://net.tutsplus.com/tutorials/javascript-ajax/writing-modular-javascript-new-premium-tutorial/)
// include 'deferred' if using zepto
define('backfin-core', function() {
  "use strict";

  var core = {}; // Mediator object
  var events = {}; // Loaded modules and their callbacks
  var plugins = {};
  var manifests = {};
  var coreOptions = {};
  var publishQueue = [];
  var isWidgetLoading = false;
  var WIDGETS_PATH = '../../../plugins'; // Path to widgets

 
  // The bind method is used for callbacks.
  //
  // * (bind)[https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Function/bind]
  // * (You don't need to use $.proxy)[http://www.aaron-powell.com/javascript/you-dont-need-jquery-proxy]
 if (!Function.prototype.bind ) {
    Function.prototype.bind = function( obj ) {
      if(typeof this !== 'function') // closest thing possible to the ECMAScript 5 internal IsCallable function
        throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable');
      var slice = [].slice,
          args = slice.call(arguments, 1),
          self = this,
          nop = function () {},
          bound = function () {
            return self.apply( this instanceof nop ? this : ( obj || {} ),
                                args.concat( slice.call(arguments) ) );
          };
      bound.prototype = this.prototype;
      return bound;
    };
  }


  // Uncomment if using zepto
  // Deferred.installInto($);

  // Decamelize a string and add a delimeter before any
  // previously capitalized letters
  function decamelize(camelCase, delimiter) {
    delimiter = (delimiter === undefined) ? '_' : delimiter;
    return camelCase.replace(/([A-Z])/g, delimiter + '$1').toLowerCase();
  }

  // Is a given variable an object? (via zepto)
  function isObject(obj) {
    return obj instanceof Object;
  }

  // Get the widgets path
  core.getWidgetsPath = function() {
    return WIDGETS_PATH;
  };

  core.config = function(options) {
    coreOptions = options;
    manifests = coreOptions.manifests || [];

    manifests.forEach(function(manifest){
      manifests[manifest.id] = manifest;
    });

    var ids = [];
    (manifests || []).forEach(function(manifest){
      if(manifest.buildIn) ids.push(manifest.id);
    });
    core.start(ids.map(function(id){ return { channel : id } }));
  };


  // Subscribe to an event
  //
  // * **param:** {string} subscriber Channel name
  // * **param:** {string} event Event name
  // * **param:** {function} callback Module callback
  // * **param:** {object} context Context in which to execute the module
  core.on = function(subscriber, event, callback, context) {
    if (event === undefined || callback === undefined || context === undefined) {
      throw new Error('Channel, callback, and context must be defined');
    }
    if (typeof subscriber !== 'string') {
      throw new Error('Subscriber must be a string');
    }
    if (typeof event !== 'string') {
      throw new Error('Event must be a string');
    }
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }

    events[event] = (!events[event]) ? [] : events[event];
    events[event].push({
      subscriber: subscriber,
      callback: callback.bind(context)
    });
  };

  core.getPublishQueueLength = function() {
    return publishQueue.length;
  };

  // Publish an event, passing arguments to subscribers. Will
  // call start if the channel is not already registered.
  //
  // * **param:** {string} channel Event name
  core.trigger = function(channel) {
    if (channel === undefined) {
      throw new Error('Channel must be defined');
    }
    if (typeof channel !== 'string') {
      throw new Error('Channel must be a string');
    }
    if (isWidgetLoading) { // Catch publish event!
      publishQueue.push(arguments);
      return false;
    }

    var i, l;
    var args = [].slice.call(arguments, 1);
    if (!events[channel]) {
      return false;
    }
    for (i = 0, l = events[channel].length; i < l; i += 1) {
      try {
        events[channel][i]['callback'].apply(this, args);
      } catch (e) {
        console.error(e.message);
      }
    }

    return true;
  };


  // Empty the list with all stored publish events.
  core.emptyPublishQueue = function() {
    var args, i, len;
    isWidgetLoading = false;

    for (i = 0, len = publishQueue.length; i < len; i++) {
      core.trigger.apply(this, publishQueue[i]);
    }

    // _.each(publishQueue, function(args) {
    //  core.publish.apply(this, args);
    // });

    publishQueue = [];
  };

  // Automatically load a widget and initialize it. File name of the
  // widget will be derived from the channel, decamelized and underscore
  // delimited by default.
  //
  // * **param:** {Object/Array} an array with objects or single object containing channel and element
  core.start = function(list) {
    var args = [].slice.call(arguments, 1);
    
    // Allow pair channel & element as params 
    if (typeof list === 'string' && args[0] !== undefined) {
      list = [{
        channel : list,
        element : args[0]
      }];
    }
    
    // Allow a single object as param
    if (isObject(list) && !Array.isArray(list)) {
      list = [list];
    }

    if (!Array.isArray(list)) {
      throw new Error('Channel must be defined as an array');
    }

    var i = 0;
    var l = list.length;
    var promises = [];

    function load(channel, element) {
      var dfd = new $.Deferred();
      var widgetsPath = core.getWidgetsPath();
      var requireConfig = require.s.contexts._.config;
      var manifest = manifests[channel];

      if (requireConfig.paths && requireConfig.paths.hasOwnProperty('widgets')) {
        widgetsPath = requireConfig.paths.widgets;
      }

      var paths = ['backfin-sandbox', widgetsPath + '/' + channel + '/main'];
      if(!manifest) paths.push('text!' + widgetsPath + '/' + channel + '/manifest.json');
      
      require(paths, function(Sandbox, main, manifestText) {
        manifest =  manifest || JSON.parse(manifestText || '{}');
        manifest.id = channel;
        
        var options = _.extend(coreOptions, {
          channel : channel, 
          element : element,
          manifest : manifest,
        });

        try {
          var sandbox = new Sandbox(options);
          plugins[channel] = sandbox;
          main(sandbox, element);
        } catch (e) {
          core.onError(e, channel);
        }

        dfd.resolve();
      }, function(err) {
        if (err.requireType === 'timeout') {
          console.warn('Could not load module ' + err.requireModules);
        } else {
          // If a timeout hasn't occurred and there was another module
          // related error, unload the module then throw an error
          var failedId = err.requireModules && err.requireModules[0];
          require.undef(failedId);
          throw err;
        }
        dfd.reject();
      });

      return dfd.promise();
    }

    isWidgetLoading = true;

    for (; i < l; i++) {
      var widget = list[i];
      var channel = decamelize(widget.channel);
      promises.push(load(channel, widget.element));
    }

    $.when.apply($, promises).done(core.emptyPublishQueue);
  };

  // Unload a widget (collection of modules) by passing in a named reference
  // to the channel/widget. This will both locate and reset the internal
  // state of the modules in require.js and empty the widgets DOM element
  //
  // * **param:** {string} channel Event name
  // * **param:** {string} el Element name
  core.stop = function(channel) {
    var file = decamelize(channel);

    for (var ch in events) {
      if (events.hasOwnProperty(ch)) {
        for (var i = 0; i < events[ch].length; i++) {
          if (events[ch][i].subscriber === channel) {
            events[ch].splice(i);
          }
        }
      }
    }

    // Remove all modules under a widget path (e.g widgets/todos)
    core.unload('plugins/' + file);

    var plugin = plugins[channel];
    if(!plugin) return console.log('plugin not found');

    plugin._registeredViews.forEach(function(view){
      view && view.destroy ? view.destroy() : view.remove();
    });

    plugin._registeredModels.forEach(function(model){
      model && model.destroy && model.destroy(); 
    });
    delete plugins[channel];
  };

  // Undefine/unload a module, resetting the internal state of it in require.js
  // to act like it wasn't loaded. By default require won't cleanup any markup
  // associated with this
  //
  // The interesting challenge with .stop() is that in order to correctly clean-up
  // one would need to maintain a custom track of dependencies loaded for each
  // possible channel, including that channels DOM elements per dependency.
  //
  // This issue with this is shared dependencies. E.g, say one loaded up a module
  // containing jQuery, others also use jQuery and then the module was unloaded.
  // This would cause jQuery to also be unloaded if the entire tree was being done
  // so.
  //
  // A simpler solution is to just remove those modules that fall under the
  // widget path as we know those dependencies (e.g models, views etc) should only
  // belong to one part of the codebase and shouldn't be depended on by others.
  //
  // * **param:** {string} channel Event name
  core.unload = function(channel) {
    var key;
    var contextMap = require.s.contexts._.defined;

    for (key in contextMap) {
      if (contextMap.hasOwnProperty(key) && key.indexOf(channel) !== -1) {
        require.undef(key);
      }
    }
  };

  core.getEvents = function() {
    return events;
  };

  core.onError = function(err, channel) {
    console.error('plugin :' + channel + '\n' + err.stack);
  }

  core.getActivityPlugins = function(){
    var results = [], key, plugin;
    for (key in plugins) {
      if (plugins.hasOwnProperty(key)) {
        plugin = plugins[key];
        results.push({ 
          manifest : plugin.manifest,
          id : key, 
          views : plugin._registeredViews, 
          models : plugins._registeredModels });
      }
    }
    return results;
  }

  core.getManifests = function(){
    return manifests
  }

  return core;
});
define('backfin-hotswap', ['backfin-core'], function(){
  /*
  console.log(1);
  
  function Hotswap(options) {
    options || (options = {});
    options.rootPath =  options.rootPath || 'js/';
    options.server =  options.server || 'localhost';
    this.options = options;
    if(window.location.href.indexOf('local') != -1) {
      this._connect();
    }
  }

  Hotswap.prototype._connect = function() {
    var socket = new WebSocket('ws://' + this.options.server.replace('http', ''));
    var self = this;
    socket.onclose = function(){
      console.log('[Hotswap] socket '+socket.readyState+' (Closed)');
      setTimeout(function(){
        self._connect();
      }, 1000);
      delete socket;
    };
    socket.onmessage = self._parseMessage.bind(this);
  }

  Hotswap.prototype._parseMessage = function(msg) {
    var str = msg.data, controlChar = str[0], data = str.slice(1);
    switch(controlChar){
      case 'c':
      if(str.indexOf('less/') != -1) {
        $('link').each(function(i,link) {
          console.log(link);
          if(link.href.indexOf('less') != -1) {
            link.href = link.href.replace(/\?.+/ig, 't=' + Date.now());
          }
        })
        return;
      }
      var path = str.slice(1).replace(this.options.rootPath, '').replace('.js','');
      this._reloadView(path);
      break;
    }
  }

  Hotswap.prototype._reloadView = function(path) {
    requirejs.undef(path);
    require([path], function(newView){
      return newView.prototype._onHotswap(newView);
    });
  }

  window.bfHotswap = new Hotswap();*/
  
  if(!window.location.host || !window.location.host.match(/local/)) { return; }
  
  var hotswapErrorDialog = null;
  var hotswapFirstTime = true;

  var hotswapByPath = function(path, isNew) {
    if(path.match(/manifest\.json$/) && isNew) {
      var md = path.match(/\/(.+)\/manifest\.json/);
      if(!md || !md[1]) { return; }
      console.log("Hotswapping [new] plugin: ", plugin.id);
      backfin.start({element: '#body', channel: md[1]});
    } else {
      backfin.getActivityPlugins().forEach(function(plugin) { 
        var id = path.slice(1, plugin.id.length+1);
        if(id == plugin.id) {
          console.log("Hotswapping [existing] plugin: ", plugin.id);
          backfin.stop(id)
          backfin.start({element: '#body', channel: id});
        }
      });
    }
  };
  
  var processChanges = function(res) {
    if(res.less && _.keys(res.less).length && less) { less.refresh(); }
    if(res.plugins && _.keys(res.plugins) && window.backfin) {
      try {
        _.keys(res.plugins).forEach(function(key) {
          if(res.plugins[key].data) {
            hotswapByPath(res.plugins[key].path, res.plugins[key].isNew);
          }
          if(hotswapErrorDialog) {
            hotswapErrorDialog.close();
            hotswapErrorDialog.remove();
            delete hotswapErrorDialog;
          }
        });
      } catch(e) {
        if(hotswapErrorDialog) {
          hotswapErrorDialog.close();
          hotswapErrorDialog.remove();
          delete hotswapErrorDialog;
        }
        hotswapErrorDialog = new bn.views.ErrorDialog('hotswap-error', e);
        hotswapErrorDialog.open();
      }
    }
  }

  var checkForChanges = function() {
    var start = new Date();
    
    var def = $.ajax({
       url: 'http://localhost:8077/update.json',
       contentType : 'application/json',
       type : 'GET'
    });

    def.done(function(res) {
      processChanges(res);
      //if((new Date() - start) < (50*1000)) {
      //  setTimeout(checkForChanges, 5000);
      //} else {
        checkForChanges();
      //}
    });
    
    def.error(function() {
      setTimeout(function() {
        startCodeStreaming();
      }, 1000)
    });
  };
  
  var startCodeStreaming = function() {

    var def = $.ajax({
       url: 'http://localhost:8077/init.json',
       contentType : 'application/json',
       type : 'GET'
    });
    
    def.done(function(res) {
      $.showNotice("New code streaming environment detected");
      checkForChanges();
    });
    
    def.error(function() {
      setTimeout(function() {
        startCodeStreaming();
      }, 300)
    });
  };

  startCodeStreaming();

});




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
        this.initialize && this.initialize.apply(this, arguments);
      }
    });

    this.Model = Backbone.Model.extend({
      constructor : function(){
        registerModel(this);
        this.initialize && this.initialize.apply(this, arguments);
      }
    });

    function configure(registerFn, object) {
      return object.extend({
        constructor : function(){
          registerFn(this);
          this.initialize && this.initialize.apply(this, arguments);
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
            self.views[k] = configure(registerView, options.views[k]);
          });
        break;
      }
    });
  }

  // * **param:** {string} subscriber Module name
  // * **param:** {string} channel Event name
  // * **param:** {object} callback Module
  Sandbox.prototype.on = function(eventName, callback, context) {
    mediator.on(this.channel, eventName, callback, context || this);
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