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
  var PLUGIN_PATH = 'plugins'; // Path to widgets


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
      var index = obj.eventsIds.indexOf(event.id);
      if(index != -1) {
        obj.eventsIds.splice(index, 1);
        obj.removeCallback && obj.removeCallback(event);
      }
    });
  }

  function _addEventHook(type, event) {
    (eventHooks[type] || []).forEach(function(obj){
      if(obj.eventsIds.indexOf(event.id) == -1) {
        obj.eventsIds.push(event.id);
        obj.addCallback && obj.addCallback(event);
      }
    });
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

  };

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
    core._injectStyles(styles);
    return;
  };

  core._injectStyles = function(styles) {
    if(!window.less) return;
    var less = window.less;
    styles.forEach(function(style){
      var path = '/plugins' + '/' + style.path;
      var link = document.createElement('link');
      link.id = path;
      link.setAttribute('rel', 'stylesheet/less');
      link.setAttribute('type', 'text/css');
      link.href = path;
      less.sheets.push(link);
    });
    less.refresh();
  };

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
        events[channel][i].callback.apply(this, args);
      } catch (e) {
        core.trigger('plugin:error', channel, { error: e, args: args });
      }
    }
    return true;
  };

  core.triggerPluginEvent = function(plugin, event, options) {
    var args = [].slice.call(arguments, 2), i, l;
    if(!events[event]) return;
    for (i = 0, l = events[event].length; i < l; i += 1) {
      if(events[event][i].subscriber == plugin) {
        events[event][i].callback.apply(this, args);
      }
    }
    return true;
  };


  // Empty the list with all stored publish events.
  core.emptyPublishQueue = function() {
    var i, len;
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
    var hotswap, context;
    if(args[0] && args[0].hotswap) {
      hotswap = true;
    }

    if(args[0] && args[0].context) {
      context = args[0].context;
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
          if(hotswap) core.triggerPluginEvent(channel, 'plugin:hotswap', context);
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
          if (!err) {
            return;
          }
          console.error(err);

          // If a timeout hasn't occurred and there was another module
          // related error, unload the module then throw an error
          var failedId = err.requireModules && err.requireModules[0];
          require.undef(failedId);

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

    var def = $.Deferred();
    $.when.apply($, promises).done(core.emptyPublishQueue).always(function(){
      def.resolve();
    });

    return def;
  };

  core.getCoreOptions = function(){
    return coreOptions;
  };

  // Unload a widget (collection of modules) by passing in a named reference
  // to the channel/widget. This will both locate and reset the internal
  // state of the modules in require.js and empty the widgets DOM element
  //
  // * **param:** {string} channel Event name
  // * **param:** {string} el Element name
  core.stop = function(channel) {

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

  // Get the context of a widget (collection of modules) to be passed on
  // to next instance after hotswap
  //
  // * **param:** {string} channel Event name
  // * **param:** {string} el Element name
  core.getContext = function(channel) {
    var plugin = plugins[channel];
    if(!plugin) {
      console.warn('backfin: Plugin not found', channel);
      return false;
    }

    return plugin.hotswapContext;
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
  };

  core.getManifests = function(options){
    var _manifests = [];
    Object.keys(manifests).forEach(function(key){
      _manifests.push(manifests[key]);
    });

    if(!options) return _manifests;

    var keys = Object.keys(options);
    return _manifests.filter(function(manifest){
      //every return true if they all passes
      return keys.every(function(key) {
        return manifest[key] == options[key];
      });
    });
  };


  core.getManifestById = function(id) {
    return manifests[id];
  };

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
      eventsIds : _events.map(function(e){ return e.id; }),
      addCallback : addCallback,
      removeCallback : removeCallback
    });
  };


  return core;
});
define('backfin-hotswap', ['backfin-core'], function(backfin, unit){

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
    clearInterval(this._statusInterval);
    // Create a socket instance
    var socket = new WebSocket('ws://localhost');
    var self = this;
    // Open the socket
    socket.onopen = function() {
      // Listen for messages
      socket.onmessage = function(e) {
        var data = {};
        try {
          data = JSON.parse(e.data);
        } catch(e) {}

        if (data.type == 'hotswap') {
          if (data.path.match(/\.less$/)) {
            less.refresh();
          } else if (data.pluginId) {
            self._processFileChanges(data.path, data);
          }
        }
      };
      // Listen for socket closes
      socket.onclose = function() {
        setTimeout(self._connect.bind(self), 1000);
      };
    };

    this._statusInterval = setInterval(function(){
      if (socket.readyState === undefined || socket.readyState > 1) {
        socket.close();
        self._connect();
      }
    }, 1000);
  };

  Hotswap.prototype._getRootPath = function(key) {
    return key.replace('/' + backfin.getPluginPath() + '/', '').replace(/\/[^/]*$/, '').replace('/', '');
  };

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
      if(pluginId == activePlugin.id) {
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


  Hotswap.prototype._reloadPlugin = function(pluginId) {
    if(!pluginId) return false;
    var context = backfin.getContext(pluginId);

    if(!this.pluginsMap[pluginId]){
      this.pluginsMap[pluginId] = {};
    }
    var cacheMap = this.pluginsMap[pluginId];
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

    backfin.start(pluginId,  { hotswap : true, context: context });
  }

  return Hotswap;

});
// Usage:
// Put this in a separate file and load it as the first module
// (See https://github.com/jrburke/requirejs/wiki/Internal-API:-onResourceLoad)
// Methods available after page load:
// rtree.map()
// - Fills out every module's map property under rtree.tree.
// - Print out rtree.tree in the console to see their map property.
// rtree.toUml()
// - Prints out a UML string that can be used to generate UML
// - UML Website: http://yuml.me/diagram/scruffy/class/draw
    requirejs.onResourceLoad = function (context, map, depMaps) {
        if (!window.rtree) {
            window.rtree = {
                tree: {},
                map: function() {
                    for (var key in this.tree) {
                        if (this.tree.hasOwnProperty(key)) {
                            var val = this.tree[key];
                            for (var i =0; i < val.deps.length; ++i) {
                                var dep = val.deps[i];
                                val.map[dep] = this.tree[dep];
                            }
                        }
                    }
                },
                toUml: function() {
                    var uml = [];
     
                    for (var key in this.tree) {
                        if (this.tree.hasOwnProperty(key)) {
                            var val = this.tree[key];
                            for (var i = 0; i < val.deps.length; ++i) {
                                uml.push("[" + key + "]->[" + val.deps[i] + "]");
                            }
                        }
                    }
     
                    return uml.join("\n");
                }
            };
        }
     
        var tree = window.rtree.tree;
     
        function Node() {
            this.deps = [];
            this.map = {};
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
     
    // For a simple dependency tree
     
    //    if (map.parentMap && map.parentMap.name) {
    //        if (!tree[map.parentMap.name]) {
    //            tree[map.parentMap.name] = new Node();
    //        }
    //
    //        if (map.parentMap.name !== map.name) {
    //            tree[map.parentMap.name].deps.push(map.name);
    //        }
    //    }
        
    };
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

  return Sandbox;
});