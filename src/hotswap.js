define('backfin-hotswap', ['backfin-core'], function(){
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

  window.bfHotswap = new Hotswap();
});



