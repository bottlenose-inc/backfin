var Hotswap = require('./hotswap');
var utils = require('./utils');
var WebSocket = require('faye-websocket');

module.exports = function(options) {
  var hotswap = new Hotswap(options);
  utils.generateIndex(options.pluginDir);
  options.httpServer.on('upgrade', function(request, socket, head) {
    var ws = new WebSocket(request, socket, head);
    ws.onclose = function(event) {
      hotswap.stop(ws);
      ws = null;
    };
    hotswap.addClient(ws);
  });
};