

var utils = require('./utils'),
  http = require('http'),
  fs = require('fs');


// -- Backfin Server

var BackfinServer = function(options) {
  options = options || {};
  this.backfinCli = options.backfinCli;
  this.watchDir = options.pluginDir || (__dirname + '/../public');
  this.watchDir = this.watchDir.replace(/scripts\/\.\.\//, '');
  this.lessDir = options.lessDir;
  this.changeChannels = {'plugins': {}, 'less': {}}
  this.changesToFlush = false;
  this.defaultHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*, Content-Type'
  };
};

BackfinServer.prototype.listenHttp = function() {
  this.httpServer = http.createServer(function (req, res) {

    //console.log("Checking for changes....", req.url, req.method, changesToFlush)

    if(!req.url.match(/update\.json/) || req.method != 'GET') {
      return this._renderJSON(res, {});
    }

    if(this.changesToFlush) {
      //console.log("pre interval", changesToFlush, changeChannels);
      this._renderJSON(res, this.changeChannels);
      this._resetChanges();
      return
    }

    var numChecks = 0;
    var interval = setInterval(function() {
      if(this.changesToFlush) {
        clearInterval(interval);
        //console.log("during interval", changesToFlush, changeChannels);
        this._renderJSON(res, this.changeChannels);
        this._resetChanges();
        return
      }
      numChecks++;
      if(numChecks > 80) {
        clearInterval(interval);
        return this._renderJSON(res, {});
      }
    }.bind(this), 100);

  }.bind(this));
  this.httpServer.on('error', function(e) {
    console.log('Code streaming server already running');
    this.backfinCli && this.backfinCli.prompt();
  }.bind(this));
  this.httpServer.listen(8077, 'localhost', null, function() {
    console.log('Streaming code from directory '+this.watchDir);
    this.backfinCli && this.backfinCli.prompt();
  }.bind(this));
};

BackfinServer.prototype.listenFs = function() {
  utils.generateIndex(this.watchDir);
  var pathsWatching = [];
  var firstTime = true;
  try {
    fs.mkdirSync(this.watchDir);
  } catch(e) {
    
  }

  var dirs = [this.watchDir];

  if(this.lessDir) {
    dirs.push(this.lessDir);
  }
  var firstTime = {};
  dirs.forEach(function(dir) {
    firstTime[dir] = true;
  });

  setInterval(function() {
    dirs.forEach(function(dir) {
      utils.walk(dir, function(err, paths) {
        paths.forEach(function(path) {
          if(pathsWatching.indexOf(path) == -1) {
            this._hotswapWatch(dir, path, !firstTime[dir]);
            pathsWatching.push(path);
          }
        }.bind(this));
        firstTime[dir] = false;
      }.bind(this));
    }.bind(this))
  }.bind(this), 300);
};

BackfinServer.prototype._getPluginIn  = function(dir, path, callback){
  var curPath = path.replace(/\/[^/]*$/,''), self = this;
  if(curPath == dir) return callback(null, null);

  utils.walk(curPath, function(err, files){
    if(err) return callback(err);
    var isManifest = files.some(function(file){
      return file.match('manifest.json')
    })
    if(isManifest) {
      var pluginId = curPath.replace(dir, '').replace('/', '');
      return callback(null, pluginId);
    }
    self._getPluginIn(dir, curPath, callback);
  });
}

BackfinServer.prototype._sendChanges = function(dir, path, relativePath, mtime, isNew) {
  //console.log("File "+relativePath+" changed, passing along changes to browser");
  var channel = 'plugins', self = this;
  if(dir.match(/less/)) {
    channel = 'less';
  }

  this._getPluginIn(dir, path, function(err, pluginId){
    if(err) return;
    self.changeChannels[channel][relativePath] = { 
      mtime: mtime, 
      isNew: isNew, 
      path: relativePath, 
      pluginId : pluginId
    };  
    self.changesToFlush = true;
    if(self.backfinCli) {
      self.backfinCli.fileChanged(relativePath);
    };
  });
  utils.generateIndex(this.watchDir);
};

BackfinServer.prototype._hotswapWatch = function(dir, path, isNew) {
  //console.log("Watching: "+path+" (isNew="+isNew+")")
  var relativePath = path.slice(dir.length);
  if(relativePath == '/manifest.json') { return; }

  if(isNew) {
    this._sendChanges(dir, path, relativePath, (new Date()-0), true);
  }

  fs.watchFile(path, {interval: 100, persistent: true}, function (curr, prev) {
    if (curr && +curr.mtime !== +prev.mtime) {
      this._sendChanges(dir, path, relativePath, curr.mtime, false);
    }
  }.bind(this));
};

BackfinServer.prototype._renderJSON = function(res, data) {
  res.writeHead(200, this.defaultHeaders);
  res.end(JSON.stringify(data));
};

BackfinServer.prototype._resetChanges = function() {
  this.changesToFlush = false;
  var keys = Object.keys(this.changeChannels);
  keys.forEach(function(key) {
    this.changeChannels[key] = {};
  }.bind(this));
};

module.exports = BackfinServer;
