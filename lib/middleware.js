var Hotswap = require('./hotswap');
var WebSocket = require('faye-websocket');

module.exports = function(options) {
  var hotswap = new Hotswap(options);
  options.httpServer.addListener('upgrade', function(request, socket, head) {
    var ws = new WebSocket(request, socket, head);
    ws.onclose = function(event) {
      hotswap.stop(ws);
      ws = null;
    };
    hotswap.addClient(ws);
  });
};