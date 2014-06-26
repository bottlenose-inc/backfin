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