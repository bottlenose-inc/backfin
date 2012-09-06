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
    return key.replace('plugins/', '').replace(/\/[^/]*$/, '');
  }

  Hotswap.prototype._handleResponse = function(res) {
    var self = this;

    //xxx not perfect should allow for css to reload as well
    if(res.less && Object.keys(res.less) && window.less) Object.keys(res.less).forEach(function(key){
      var headNode = requirejs.s.head;
      var link = document.getElementById(key);
      if(link) {
        link.href = key + '?bust=' + Date.now();
        less.refresh();
        return;
      } 

      var link = document.createElement('link');
      link.id = key;
      link.setAttribute('rel', 'stylesheet/less');
      link.setAttribute('type', 'text/css');
      link.href = key;
      headNode.appendChild(link);
      less.sheets.push(link);
      less.refresh();
    })

    

    if(res.plugins) {
      var manifests = backfin.getManifests();
      var plugins = {};
      backfin.getActivityPlugins().forEach(function(plugin) {
        plugins[plugin.id] = plugin;
      });

      try {
        Object.keys(res.plugins).forEach(function(key) {
          var id = self._getRootPath(key);
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

  Hotswap.prototype._reloadPlugin = function(pluginId, isNew) {
    if(!pluginId) return false;
    backfin.stop(pluginId);
    backfin.unload(pluginId);
    backfin.start(pluginId);
  }

  return new Hotswap();

  return;
  if(!window.location.host || !window.location.host.match(/local/)) return;

  //var hotswapErrorDialog = null;

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
          backfin.start({ id: id});
        }
      });
    }
  };
  
  var processChanges = function(res) {
    if(res.less && _.keys(res.less).length && window.less) { less.refresh(); }
    if(res.plugins) {
      try {
        _.keys(res.plugins).forEach(function(key) {
          if(res.plugins[key].data) {
            hotswapByPath(res.plugins[key].path, res.plugins[key].isNew);
          }
          //if(hotswapErrorDialog) {
          //  hotswapErrorDialog.close();
          //  hotswapErrorDialog.remove();
          //  delete hotswapErrorDialog;
          //}
        });
      } catch(e) {
        //if(hotswapErrorDialog) {
          //hotswapErrorDialog.close();
          //hotswapErrorDialog.remove();
          delete hotswapErrorDialog;
        //}
        //hotswapErrorDialog = new bn.views.ErrorDialog('hotswap-error', e);
        //hotswapErrorDialog.open();
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
      //$.showNotice("New code streaming environment detected");
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



