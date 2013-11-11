// ## Core
// Implements the mediator pattern and
// encapsulates the core functionality for this application.
// Based on the work by Addy Osmani and Nicholas Zakas.
//
// * [Patterns For Large-Scale JavaScript Application Architecture](http://addyosmani.com/largescalejavascript/)
// * [Large-scale JavaScript Application Architecture Slides](http://speakerdeck.com/u/addyosmani/p/large-scale-javascript-application-architecture)
// * [builtIng Large-Scale jQuery Applications](http://addyosmani.com/blog/large-scale-jquery/)
// * [Nicholas Zakas: Scalable JavaScript Application Architecture](http://www.youtube.com/watch?v=vXjVFPosQHw&feature=youtube_gdata_player)
// * [Writing Modular JavaScript: New Premium Tutorial](http://net.tutsplus.com/tutorials/javascript-ajax/writing-modular-javascript-new-premium-tutorial/)
// include 'deferred' if using zepto
define('backfin-core', function() {
  "use strict";

  var core = {}; // Mediator object
  var events = {}; // Loaded modules and their callbacks
  var plugins = {};
  var eventHooks = {};
  var manifests = {};
  var coreOptions = {};
  var publishQueue = [];
  var isWidgetLoading = false;
  var PLUGIN_PATH = '/plugins'; // Path to widgets

 
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
  
  var lastGlobalError;

  function globalErrorlogger(message, url, line){
    var clientErr;
    if(message instanceof Error) {
      clientErr = message;
    } if(typeof(message) == 'string' && typeof(url) == 'string' && typeof(line) == 'number') {
      clientErr = new Error(message);
      clientErr.stack = 'File : ' + url + '\nline : ' + line;
    }
    lastGlobalError = clientErr;
  }

  function enableGlobalErrorLogger() {
    if(!window.onerror) {
      window.onerror = globalErrorlogger;
    }
  }

  function disableGlobalErrorLogger() {
    if(window.onerror ==  globalErrorlogger) {
      window.onerror = null;
    }
    globalErrorlogger = null;
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

  function _removeEventHook(type, event) {
    (eventHooks[type] || []).forEach(function(obj){
      var index = obj.eventsIds.indexOf(event.id)
      if(index != -1) {
        obj.eventsIds.splice(index, 1);
        obj.removeCallback && obj.removeCallback(event);
      }
    })
  }

  function _addEventHook(type, event) {
    (eventHooks[type] || []).forEach(function(obj){
      if(obj.eventsIds.indexOf(event.id) == -1) {
        obj.eventsIds.push(event.id);
        obj.addCallback && obj.addCallback(event);
      }
    })
  }

  function _normalizeEvents(manifest) {
    var _events = [];
    Object.keys(manifest.events || {}).forEach(function(key) {
      _events = _events.concat(manifest.events[key].map(function(e){
        e.eventType = key;
        return e;
      }));
    });
    return _events;
  }

  core.registerModule = function(module) {

  }

  // Get the widgets path
  core.getPluginPath = function() {
    var requireConfig = require.s.contexts._.config;
    var pluginPath = PLUGIN_PATH;

    if (requireConfig.paths && requireConfig.paths.hasOwnProperty('widgets')) {
      pluginPath = requireConfig.paths.widgets;
    }
    return pluginPath;
  };

  core.config = function(options) {
    var ids = [], styles = [];
    coreOptions = options;
    manifests = {};
    (coreOptions.manifests || []).forEach(function(manifest){
      manifests[manifest.id] = manifest;
      if(manifest.builtIn) {
        ids.push(manifest.id);
        (manifest.stylesheets && manifest.stylesheets.less || []).forEach(function(style){
          styles.push({ path : manifest.id + '/' + style, type : 'less'  });
        });
      }
    });
    core._injectStyles(styles)
    core.start(ids.map(function(id){ return { id : id } }));
  };

  core._injectStyles = function(styles) {
    if(!window.less) return;
    styles.forEach(function(style){
      var path = '/plugins' + '/' + style.path;
      var link = document.createElement('link');
      link.id = path;
      link.setAttribute('rel', 'stylesheet/less');
      link.setAttribute('type', 'text/css');
      link.href = path;
      document.head.appendChild(link);
      less.sheets.push(link);
    });
    less.refresh();
  }

  // Subscribe to an event
  //

  // * **param:** {string} event Event name
  // * **param:** {function} callback Module callback
  // * **param:** {string} subscriber subscriber name
  // * **param:** {object} context Context in which to execute the module
  core.on = function(event, callback, subscriber, context) {
    if (event === undefined || callback === undefined) {
      throw new Error('Channel, callback, and must be defined');
    }
    subscriber = subscriber || 'backfin';
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
    if (channel === undefined) throw new Error('Channel must be defined');
    if (typeof channel !== 'string') throw new Error('Channel must be a string');

    if (['plugin:error'].indexOf(channel) == -1 && isWidgetLoading) { // Catch publish event!
      publishQueue.push(arguments);
      return false;
    }

    var i, l;
    var args = [].slice.call(arguments, 1);
    if (!events[channel]) return false;
    
    for (i = 0, l = events[channel].length; i < l; i += 1) {
      try {
        events[channel][i]['callback'].apply(this, args);
      } catch (e) {
        console.warn("Plugin callback error. Channel="+channel);
        console.error(e.stack);
      }
    }
    return true;
  };

  core.triggerPluginEvent = function(plugin, event) {
    var args = [].slice.call(arguments, 2), i, l;
    if(!events[event]) return;
    for (i = 0, l = events[event].length; i < l; i += 1) {
      if(events[event][i].subscriber == plugin) {
        events[event][i]['callback'].apply(this, args);
      }
    }
    return true;
  }


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
    var hotswap;
    if(args[0] && args[0].hotswap) {
      hotswap = true;
    }
    
    // Allow pair channel & element as params 
    if (typeof list === 'string') {
      list = [{
        id : list,
        options : args
      }];
    }
    
    // Allow a single object as param
    if (isObject(list) && !Array.isArray(list)) list = [list];

    if (!Array.isArray(list)) {
      throw new Error('Channel must be defined as an array');
    }

    var i = 0;
    var l = list.length;
    var promises = [];

    function load(channel, args) {
      var dfd = new $.Deferred();
      var widgetsPath = core.getPluginPath();
      var manifest = manifests[channel];
      coreOptions.clearError && coreOptions.clearError();

      var paths = ['backfin-sandbox', widgetsPath + '/' + channel + '/main'];
      if(!manifest) paths.push('text!' + widgetsPath + '/' + channel + '/manifest.json');
      require(paths, function(Sandbox, main, manifestText) {

        manifest =  manifest || JSON.parse(manifestText || '{}');
        manifest.id = channel;
        
        var options = _.extend(coreOptions, {
          channel : channel, 
          manifest : manifest
        });

        function _load(){
          if(plugins[channel]) core.stop(channel);
          var sandbox = new Sandbox(options);
          plugins[channel] = sandbox;
          //if hotswap we take the args from the manifest if any
          main.apply(null, [sandbox].concat(args));
          if(hotswap) core.triggerPluginEvent(channel, 'plugin:hotswap');
        }

        if (coreOptions.environment == 'development') {
          _load();
        } else {
          try {
           _load();
          } catch (e) { 
            core.trigger('plugin:error', channel, e);
          }
        }

        try {
          if(manifest.events) {
            //normalizing the hash object
            _normalizeEvents(manifest).forEach(function(e){
              if(hotswap) _removeEventHook(e.eventType, e);
              _addEventHook(e.eventType, e);
            });
          }
        } catch(e) {
          console.log(e.stack);
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
          console.error(err.stack);
          if (coreOptions.environment != 'development') {
            core.trigger('plugin:error', failedId, lastGlobalError || err);
          }
          console.warn('failed to load ' + failedId); 
        }
        dfd.reject();
      });
      return dfd.promise();
    }

    isWidgetLoading = true;

    for (; i < l; i++) {
      var plugin = list[i];
      var id = decamelize(plugin.id);
      promises.push(load(id, plugin.options));
    }

    enableGlobalErrorLogger();
    $.when.apply($, promises).done(core.emptyPublishQueue).always(function(){
      disableGlobalErrorLogger();
    });

    return promises.length == 1 ? promises[0] : promises;
  };

  core.getCoreOptions = function(){
    return coreOptions;
  }

  // Unload a widget (collection of modules) by passing in a named reference
  // to the channel/widget. This will both locate and reset the internal
  // state of the modules in require.js and empty the widgets DOM element
  //
  // * **param:** {string} channel Event name
  // * **param:** {string} el Element name
  core.stop = function(channel) {
    var file = decamelize(channel);

    var plugin = plugins[channel];
    if(!plugin) {
      console.warn('backfin: Plugin not found', channel);
      return false;
    }

    plugin._registeredViews.forEach(function(view){
      view && view.destroy ? view.destroy() : view.remove();
    });

    plugin._registeredModels.forEach(function(model){
      model && model.destroy && model.destroy(); 
    });
    core.triggerPluginEvent(channel, 'plugin:destroy');

    var manifest = plugin.manifest;
    if(manifest.events) {
      //normalizing the hash object
      _normalizeEvents(manifest).forEach(function(e){
        _removeEventHook(e.eventType, e);
      });
    }

    for (var ch in events) {
      if (events.hasOwnProperty(ch)) {
        for (var i = 0; i < events[ch].length; i++) {
          if (events[ch][i].subscriber === channel) {
            events[ch].splice(i);
          }
        }
      }
    }

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
    var widgetsPath = this.getPluginPath();
    require.undef(widgetsPath + '/' + channel + '/main');
  };

  core.getEvents = function() {
    return events;
  };

  core.getActivePlugins = function(args){
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

  core.getManifests = function(options){
    var _manifests = []
    Object.keys(manifests).forEach(function(key){
      _manifests.push(manifests[key]);
    });

    if(!options) return _manifests;

    var keys = Object.keys(options);
    return _manifests.filter(function(manifest){
      //every return true if they all passes
      return keys.every(function(key) {
        return manifest[key] == options[key];
      })
    });
  }


  core.getManifestById = function(id) {
    return manifests[id];
  }

  core.registerEventHook = function(eventId, addCallback, removeCallback) {
    eventHooks[eventId] = (eventHooks[eventId] ? eventHooks[eventId] : []);
   
    var _events = [];
    this.getManifests().forEach(function(manifest){
      if(!manifest.builtIn) return;
      _events = _events.concat(_normalizeEvents(manifest)); 
    });
    
    _events.forEach(function(e){
      if(e.eventType == eventId) addCallback(e);
    });

    eventHooks[eventId].push({
      eventsIds : _events.map(function(e){ return e.id }),
      addCallback : addCallback, 
      removeCallback : removeCallback 
    });
  }


  return core;
});
define('backfin-hotswap', ['backfin-core', 'backfin-unit', 'require-tree'], function(backfin, unit){
  function Hotswap(options) {
    options || (options = {});
    options.rootPath =  options.rootPath || 'js/';
    options.server =  options.server || 'localhost';
    
    this.pluginsMap = {};

    this.options = options;
    this._increaseTimeout = 0;
    if(window.location.href.indexOf('local') != -1) this._connect();
    if(window.location.href.indexOf('staging.bottlenose.com') != -1) this._connect();
    this.busyFiles = {};
  }

  Hotswap.prototype._connect = function() {
    var start = new Date();
    var def = $.ajax({
       url: 'http://localhost:8077/update.json',
       contentType : 'application/json',
       type : 'GET'
    });
    var self = this;
    def.then(function(res){
      self._increaseTimeout = 0;
      self._connect();
      self._handleResponse(res);
    }, function(){
      self._increaseTimeout++;
      if(self._increaseTimeout > 20) {
        self._increaseTimeout = 20;
      }
      setTimeout(self._connect.bind(self), self._increaseTimeout * 500);
    }); 
  }

  Hotswap.prototype._getRootPath = function(key) {
    return key.replace('/' + backfin.getPluginPath() + '/', '').replace(/\/[^/]*$/, '').replace('/', '');
  }

  Hotswap.prototype._processFileChanges = function(filePath, data) {
    if(this.busyFiles[filePath]) {
      return setTimeout(function() { this._processFileChanges(filePath) }.bind(this), 100);
    }
    //the pluginId is always set as far i can tell, in all correct uses atleast
    var pluginId =  data.pluginId;
    
    var manifest = backfin.getManifestById(pluginId);
    if(manifest && manifest.tests) {
      var testPath = filePath.replace('/' +pluginId + '/', '');
      if(manifest.tests.indexOf(testPath) != -1) {
        var iframe = unit.runTest(pluginId, testPath);
        return backfin.trigger('plugin:test', pluginId, iframe);
      }
    }
    this.busyFiles[filePath] = true;

    var plugin = null;
    backfin.getActivePlugins().forEach(function(activePlugin) {
      if(pluginId.indexOf(activePlugin.id) == 0) {
        plugin = activePlugin;
      }   
    });

    if(filePath.match(/\.less/)) {
      return;
    }

    if(plugin) {
      console.log("Reloading existing plugin: ", plugin.id);
      this._reloadPlugin(plugin.id);
    } else {
      console.log("Starting fresh newly detected plugin: ", pluginId);
      this._reloadPlugin(pluginId);
    }
    this.busyFiles[filePath] = false;
  }

  Hotswap.prototype._handleResponse = function(res) { 
    //xxx not perfect should allow for css to reload as well
    if(res.less && Object.keys(res.less) && window.less) {
      less.refresh(); 
    }

    if(res.plugins) {
      try {
        Object.keys(res.plugins).forEach(function(key) {
          if(key.match(/\.swp$/)) return;
          if(key.match(/\~$/)) return;
          this._processFileChanges(key, res.plugins[key]);
        }.bind(this));
      } catch(e) {
        console.warn(e.stack);
      }
    }
  }

  Hotswap.prototype._reloadPlugin = function(pluginId) {
    if(!pluginId) return false;
    
    if(!this.pluginsMap[pluginId]){
      this.pluginsMap[pluginId] = {};
    }
    var cacheMap = this.pluginsMap[pluginId];

    var tree = window.rtree.tree;
    var treeKeys = Object.keys(window.rtree.tree);
    var affectedPlugins = [];
    treeKeys.forEach(function(key){
      if (tree[key].deps.indexOf(key) != -1) {
        
        affectedPlugins.push(key);
      }
    });

    if (affectedPlugins.length) {
      console.log('Affected Plugins ', affectedPlugins);
    }

    backfin.stop(pluginId);

    var contextMap = require.s.contexts._.defined;
    for (key in contextMap) {
      if (contextMap.hasOwnProperty(key) && key.indexOf(pluginId) !== -1) {
        cacheMap[key] = true;
      }
    }
    
    backfin.unload(pluginId);
    //when you make a syntax bug, in some nested plugin module, 
    //we need to be very explicit about the files we undef
    //therefor before we reload any plugin we build a cache of all 
    //the dependencies the module have so we can undef all them later
    Object.keys(cacheMap).forEach(function(path){
      requirejs.undef(path)
    });

    backfin.start(pluginId,  { hotswap : true });
  }

  return Hotswap;

});




define(function(){
  requirejs.onResourceLoad = function (context, map, depMaps) {
    if (!window.rtree) {
      window.rtree = {
        tree: {}
      };
    }

    var tree = window.rtree.tree;

    function Node() {
      this.deps = [];
    }

    if (!tree[map.name]) {
      tree[map.name] = new Node();
    }

    // For a full dependency tree
    if (depMaps) {
      for (var i = 0; i < depMaps.length; ++i) {
        tree[map.name].deps.push(depMaps[i].name);
      }
    }
  };
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
      constructor : function(options){
        this.cid = _.uniqueId('view');
        this._configure(options || {});
        this._ensureElement();
        this.initialize && this.initialize.apply(this, arguments);
        this.delegateEvents();
        this.el.className = this.className;
        registerView(this);
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
    mediator.on(eventName, callback, this.channel, context || this);
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
// ## Sandbox
// Implements the sandbox pattern and set up an standard interface for modules.
// This is a subset of the mediator functionality.
//
// Note: Handling permissions/security is optional here
// The permissions check can be removed
// to just use the mediator directly.
define('backfin-unit', ['backfin-core', 'backfin-sandbox'], function(backfin, Sandbox) {
  function Unit() {
    backfin.on('run-test', this._handleRunTest.bind(this));
  }

  Unit.prototype._getTestRunnerPath = function(options) {
    var result = (backfin.getCoreOptions() || {}).testRunnerPath;
    if(!result) {
      console.warn('no testRunnerPath path define in backfin.configure')
      return false;
    }
    return result;
  };

  Unit.prototype._handleRunTest = function(options) {
    var pluginId = options.pluginId;
    var testPath = options.testPath;
    this.runTest(pluginId, testPath, options);
  },

  Unit.prototype.runTest = function(pluginId, testPath, options){
    options = options || (options = {});
    var runnerPath  = this._getTestRunnerPath();
    if(!runnerPath) return;
    var iframe =  options.iframe || document.createElement('iframe');
    $(iframe).on("load", function(){
      var win = iframe.contentWindow;
      var args = _.extend(backfin.getCoreOptions(), {
        channel : pluginId, 
        manifest : {}
      });

      if(!win.backfinUnit) {
        console.error('Test runner is not configured correctly backfinUnit is not available')
      } else {
        if(options.onProgress) win.backfinUnit.onProgress = options.onProgress;
        if(options.onDone) win.backfinUnit.onDone = options.onDone;
        if(options.onBegin) win.backfinUnit.onBegin = options.onBegin;
      }
      
      win.sandbox = new Sandbox(args);
      win.run('/' + backfin.getPluginPath() + '/' + pluginId + '/' + testPath);
    });

    var path = '/' + backfin.getPluginPath() + '/' + pluginId + '/' + testPath;
    iframe.src = runnerPath + '?bust=' + Date.now();
    return iframe;
  };
  
  return new Unit();
});