define('backfin-hotswap', ['backfin-core', 'backfin-unit'], function(backfin, unit){

  function Hotswap(options) {
    options || (options = {});
    options.rootPath =  options.rootPath || 'js/';
    options.server =  options.server || 'localhost';
    this.options = options;
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
    def.then(function(res){
      this._connect();
      this._handleResponse(res);
    }.bind(this), this._connect.bind(this)); 
  }

  Hotswap.prototype._getRootPath = function(key) {
    return key.replace('/' + backfin.getPluginPath() + '/', '').replace(/\/[^/]*$/, '').replace('/', '');
  }

  Hotswap.prototype._processFileChanges = function(filePath) {
    
    if(this.busyFiles[filePath]) {
      return setTimeout(function() { this._processFileChanges(filePath) }.bind(this), 100);
    }

    var possiblePluginId = this._getRootPath(filePath);
    
    var manifest = backfin.getManifestById(possiblePluginId);
    if(manifest && manifest.tests) {
      var testPath = filePath.replace('/' +possiblePluginId + '/', '');
      if(manifest.tests.indexOf(testPath) != -1) {
        unit.runTest(possiblePluginId, testPath);
        return;
      }
    }
    this.busyFiles[filePath] = true;

    var plugin = null;
    backfin.getActivePlugins().forEach(function(activePlugin) {
      if(possiblePluginId.indexOf(activePlugin.id) == 0) {
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
      console.log("Starting fresh newly detected plugin: ", possiblePluginId);
      this._reloadPlugin(possiblePluginId);
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
          this._processFileChanges(key);
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
    backfin.stop(pluginId);
    backfin.unload(pluginId);
    backfin.start(pluginId,  { hotswap : true });
  }

  return Hotswap;

});



