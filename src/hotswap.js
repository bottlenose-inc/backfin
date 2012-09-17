define('backfin-hotswap', ['backfin-core'], function(backfin){

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
    return key.replace('/plugins/', '').replace(/\/[^/]*$/, '').replace('/', '');
  }

  Hotswap.prototype._handleResponse = function(res) {
          console.log("Hotswapping _handleResponse: ", res)
    var self = this;
    //xxx not perfect should allow for css to reload as well
    if(res.less && Object.keys(res.less) && window.less) {
      Object.keys(res.less).forEach(function(key){
        less.refresh();
      });
    }

    if(res.plugins) {
      var plugins = {};
      backfin.getActivityPlugins().forEach(function(plugin) {
        plugins[plugin.id] = plugin;
      });

      try {
        Object.keys(res.plugins).forEach(function(key) {
          var id = self._getRootPath(key);
          if(key.match(/\.less/)) {
            return self._reloadPluginStyles(id, '/plugins'+key);
          }
          var plugin = plugins[id];
          if(plugin) {
            self._reloadPlugin(id);
          } else {
            backfin.start(id, { hotswap : true });
          }
        });
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

  Hotswap.prototype._reloadPlugin = function(pluginId, isNew) {
    if(!pluginId) return false;
    backfin.stop(pluginId);
    backfin.unload(pluginId);
    backfin.start(pluginId,  { hotswap : true });
  }

  return new Hotswap();
});



