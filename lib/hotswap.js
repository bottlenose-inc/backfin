// Not used yet

var fs = require('fs'),
    _ = require('underscore'),
    WebSocket = require('faye-websocket');

function Hotswap() {
  this.paths = [];
  this.clients = [];
  this._fsWatches = [];
}

Hotswap.prototype.start = function(ws) {
  this.clients.push(ws);
  this._startWatching();
}

Hotswap.prototype.stop = function(ws) {
  if(this.clients.length) return;
  this._fsWatches.forEach(function(fs){ fs.stop(); })
}

Hotswap.prototype.setPaths = function(paths) {
  this.paths = this.paths.concat(paths);
}

Hotswap.prototype._watchFile = function(path) {
  var self = this;
  var emit = _.debounce(function(){
    self._emit('c' + path.replace('public/',''));
  }, 400);

  this._fsWatches.push(fs.watchFile(path, {interval: 200, persistent: true}, function (curr, prev) {
    if (curr && +curr.mtime !== +prev.mtime) emit();
  }));
}

Hotswap.prototype._emit = function(data) {
  this.clients.forEach(function(c){
    c.send(data);
  });
}

Hotswap.prototype._getFiles = function(dir,callback) {
  var results = [], self = this;
  fs.readdir(dir, function(err, list) {
    if (err) return callback(err);
    var i = 0;
    (function next() {
      var file = list[i++];
      if (!file) return callback(null, results);
      file = dir + '/' + file;
      fs.stat(file, function(err, stat) {
        if (stat && stat.isDirectory()) {
          self._getFiles(file, function(err, res) {
            results = results.concat(res);
            next();
          });
        } else {
          results.push(file);
          next();
        }
      });
    })();
  });
}

Hotswap.prototype._startWatching = function() {
  var self = this;
  self.paths.forEach(function(rootPath) {
    self._getFiles(rootPath, function(err, paths) {
      if(err) return console.error('[Hotswap] Bad Path: ' + path);
      paths.forEach(function(path) {
        self._watchFile(path, rootPath);
      });
    });
  });
}

module.exports = Hotswap;