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

  function _removeEventHook(type, event) {
    (eventHooks[type] || []).forEach(function(obj){
      if(obj.eventsIds.indexOf(event.id) != -1) {
        obj.removeCallback && obj.removeCallback(event);
      }
    })
  }

  function _addEventHook(type, event) {
    console.log('_addEventHook', type, event);
    (eventHooks[type] || []).forEach(function(obj){
      if(obj.eventsIds.indexOf(event.id) == -1) {
        obj.addCallback && obj.addCallback(event);
      }
    })
  }

  function _normalizeEvents(manifest) {
    var events = [];
    Object.keys(manifest.events || {}).forEach(function(key) {
      events = manifest.events[key].map(function(e){
        e.eventType = key;
        return e;
      });
    });
    return events;
  }

  // Get the widgets path
  core.getWidgetsPath = function() {
    return WIDGETS_PATH;
  };

  core.config = function(options) {
    var ids = [], styles = [];
    coreOptions = options;
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
    if (channel === undefined) throw new Error('Channel must be defined');
    if (typeof channel !== 'string') throw new Error('Channel must be a string');

    if (isWidgetLoading) { // Catch publish event!
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
        console.error(e.message);
      }
    }
    return true;
  };

  core.triggerPluginEvent = function(plugin, event) {
    var args = [].slice.call(arguments, 2), i, l;
    if(!events[event]) return;
    for (i = 0, l = events[event].length; i < l; i += 1) {
      try {
        if(events[event][i].subscriber == plugin) {
          events[event][i]['callback'].apply(this, args);
        }
      } catch (e) {
        console.error(e.message);
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
          manifest : manifest
        });

        try {
          if(plugins[channel]) core.stop(channel);
          var sandbox = new Sandbox(options);
          plugins[channel] = sandbox;
          //if hotswap we take the args from the manifest if any
          main.apply(null, [sandbox].concat(args));
          if(hotswap) core.triggerPluginEvent(channel, 'plugin:hotswap');
        } catch (e) {
          core.onError(e, channel);
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
          console.error('failed to load ' + failedId);
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
    $.when.apply($, promises).done(core.emptyPublishQueue);
    return promises.length == 1 ? promises[0] : promises;
  };

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
  };

  core.getEvents = function() {
    return events;
  };

  core.onError = function(err, channel) {
    console.error('plugin :' + channel + '\n' + err.stack);
  }

  core.getActivityPlugins = function(args){
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
        return manifest[key] == args[key];
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