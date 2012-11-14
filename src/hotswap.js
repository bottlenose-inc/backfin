define('backfin-hotswap', ['backfin-core', 'backfin-unit'], function(backfin, unit){

  function Hotswap(options) {
    options || (options = {});
    options.rootPath =  options.rootPath || 'js/';
    options.server =  options.server || 'localhost';
    
    this.pluginsMap = {};

    this.options = options;
    this._increaseTimeout = 0;
    if(window.location.href.indexOf('local') != -1) this._connect();
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
      this.busyFiles[filePath] = false;
      return this._reloadPluginStyles(plugin.id, '/plugins'+filePath);
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
      Object.keys(res.less).forEach(function(key){
        less.refresh();
      });
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

  Hotswap.prototype._reloadPluginStyles = function(pluginId, stylePath) {
    var headNode = requirejs.s.head;
    var link = document.getElementById(stylePath);
    if(link) {
      link.href = stylePath + '?bust=' + Date.now();
      less.refresh();
      return;
    }

    var link = document.createElement('link');
    link.id = stylePath;
    link.setAttribute('rel', 'stylesheet/less');
    link.setAttribute('type', 'text/css');
    link.href = stylePath;
    headNode.appendChild(link);
    less.sheets.push(link);
    less.refresh();
  }

  Hotswap.prototype._reloadPlugin = function(pluginId) {
    if(!pluginId) return false;
    
    
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

    backfin.start(pluginId,  { hotswap : true });
  }

  return Hotswap;

});



