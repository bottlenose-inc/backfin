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



