// Not used yet

var fs = require('fs');
var _ = require('underscore');

function Hotswap(options) {
  this.paths = options.paths;
  this.ignore = options.ignore;
  this.clients = [];
  this._fsWatches = [];
  this._startWatching();
}

Hotswap.prototype.addClient = function(ws) {
  this.clients.push(ws);
};

Hotswap.prototype.stop = function(ws) {
  if(this.clients.length) return;
  this._fsWatches.forEach(function(fs){
    fs.stop();
  });
};

Hotswap.prototype._getPluginId = function(path, dir, callback) {
  var curPath = path.replace(/\/[^/]*$/,'');
  var self = this;
  if (curPath == dir) return callback(null, null);

  fs.readdir(curPath, function(err, files) {
    if(err) return callback(err);

    var isManifest = files.some(function(file){
      return file.match('manifest.json');
    });

    if (isManifest) {
      return callback(null, curPath.replace(dir, '').replace('/', ''));
    }
    self._getPluginId(curPath, dir, callback);
  });
};



Hotswap.prototype._watchFile = function(path, dir) {
  var self = this;

  if (!this._modTimes) {
    this._modTimes = {};
  }

  var emit = _.debounce(function(){
    self._getPluginId(path, dir, function(err, pluginId) {
      if (err) return;
      if (!pluginId) return;
      self._emit(JSON.stringify({
        type: 'hotswap',
        pluginId: pluginId,
        path :path.slice(dir.length)
      }));
    });
  }, 400);

  try {
    var index = this._fsWatches.push(fs.watch(path, {persistent: false}, function (eventName, filename) {
      if (eventName == 'change') {
        fs.stat(path, function(err, stats) {
          var prevMtime = self._modTimes[path];
          var currMtime = stats.mtime;
          if (!prevMtime || +prevMtime !== +currMtime) {
            self._modTimes[path] = currMtime;
            emit();
          }
        });
      }
      var watch = self._fsWatches[index - 1];
      if (!watch) return;
      watch.close();
      self._fsWatches.splice(index-1, 1);
      self._watchFile(path, dir);
    }));
  } catch(e) {
    if ((e.message || '').indexOf('EMFILE')) {
      console.warn('Please run "ulimit -n 2048" in your terminal, the same terminal you see this message in');
    } else {
      throw e;
    }
  }
};


Hotswap.prototype._emit = function(data) {
  this.clients.forEach(function(c){
    c.send(data);
  });
};

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
};

Hotswap.prototype._startWatching = function() {
  var self = this;
  var ignores = this.ignore;
  var files = [];

  setInterval(function(){
    self.paths.forEach(function(rootPath) {
      self._getFiles(rootPath, function(err, paths) {
        if(err) return console.error('[Hotswap] Bad Path: ' + paths, err);
        paths.forEach(function(path) {
          if (files.indexOf(path) != -1) return;
          var ignore = (ignores || []).some(function(regex){
            return path.match(regex);
          });
          if (ignore) return;
          files.push(path);
          self._watchFile(path, rootPath);
        });
      });
    });
  }, 5000);
};


module.exports = Hotswap;