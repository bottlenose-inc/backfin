var Hotswap = require('./hotswap.js');
module.exports = function(options) {
  var hotswap = new Hotswap();
  options.httpServer.addListener('upgrade', function(request, socket, head) {
    var ws = new WebSocket(request, socket, head);
    ws.onclose = function(event) {
      hotswap.stop(ws);
      ws = null;
    };
    ws.send('o');
    hotswap.start(ws);
  });
  hotswap.setPaths(options.paths);
}