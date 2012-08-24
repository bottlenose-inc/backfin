var http = require('http'),
  fs = require('fs'),
  readline = require('readline'),
  fs = require('fs'),
  ejs = require('ejs');
  
// -- Helper methods
  
String.prototype.titleize = function() {
	res = new Array();
	var parts = this.split(/[ \-\_]+/);
	parts.forEach(function(part) {
		res.push(part.charAt(0).toUpperCase() + part.slice(1));
	})
	return res.join(" ");
};

var utils = {
  walk: function(dir, done) {
    var results = [];
    fs.readdir(dir, function(err, list) {
      if (err) return done(err);
      var i = 0;
      (function next() {
        var file = list[i++];
        if (!file) return done(null, results);
        file = dir + '/' + file;
        fs.stat(file, function(err, stat) {
          if (stat && stat.isDirectory()) {
            utils.walk(file, function(err, res) {
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
}

// -- Backfin Server

var BackfinServer = function(options) {
  options = options || {};
  this.watchDir = options.watchDir || (__dirname + '/../public');
  this.watchDir = this.watchDir.replace(/scripts\/\.\.\//, '');
  this.changeChannels = {'less': {}, 'views': {}, 'plugins': {}}
  this.changesToFlush = false;
  this.defaultHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*, Content-Type'
  };
};

BackfinServer.prototype.listenHttp = function() {
  http.createServer(function (req, res) {

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

  }.bind(this)).listen(8077, 'localhost');
};

BackfinServer.prototype.listenFs = function() {
  var pathsWatching = [];
  var firstTime = true;
  setInterval(function() {
    utils.walk(this.watchDir, function(err, paths) {
      paths.forEach(function(path) {
        if(pathsWatching.indexOf(path) == -1) {
          this._hotswapWatch(path, !firstTime);
          pathsWatching.push(path);
        }
      }.bind(this));
      firstTime = false;
    }.bind(this));
  }.bind(this), 300);
};

BackfinServer.prototype._sendChanges = function(path, relativePath, mtime) {
  //console.log("File "+relativePath+" changed, passing along changes to browser");
  var channel = 'plugins';
  if(path.match(/\.less$/)) {
    channel = 'less';
  }
  this.changeChannels[channel][relativePath] = {mtime: mtime};
  fs.readFile(path, 'utf-8', function (err, data) {
    this.changeChannels[channel][relativePath].data = data;
    this.changesToFlush = true;
  }.bind(this));
};

BackfinServer.prototype._hotswapWatch = function(path, isNew) {
  //console.log("Watching: "+path+" (isNew="+isNew+")")
  var relativePath = path.replace(/.*\/public\//, '');
  if(isNew) {
    this._sendChanges(path, relativePath, (new Date()-0));
  }
  fs.watchFile(path, {interval: 100, persistent: true}, function (curr, prev) {
    if (curr && +curr.mtime !== +prev.mtime) {
      this._sendChanges(path, relativePath, curr.mtime);
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

// - Backfin CLI

//console.log("Creating a "+pluginType+" nano app scaffold");

var BackfinCli = function() {
  this.commands = {
    'help': {
      description: 'This help description'
    },
    'scaffold': {
      description: 'Create a skeleton Backfin Module',
      args: ['pluginId', 'pluginType']
    }
  }
  this.backfinConsole = null;
};

BackfinCli.prototype.scaffoldCmd = function(pluginId, pluginType) {
  if(arguments.length <= 1) {
    console.warn("Usage: scaffold <plugin id> [plugin type]");
    return;
  }
  var destinationJs = './public/js/'+pluginId+'.js';
  var destinationLess = './public/less/'+pluginId+'.less';
  fs.readFile(__dirname + '/../templates/'+pluginType+'.js', 'utf-8', function (err, data) {
    var fd, data = ejs.render(data, {id: pluginId, name: pluginId.titleize(), type: pluginType});

    fd = fs.openSync(destinationJs, 'w+');
    fs.writeSync(fd, data);
    fs.closeSync(fd);

    console.log("[Created]  "+destinationJs);
    fd = fs.openSync(destinationLess, 'w+');
    fs.writeSync(fd, '');
    fs.closeSync(fd);

    console.log("[Created]  "+destinationLess);
    this.backfinConsole.prompt();
  }.bind(this));
};

//help
BackfinCli.prototype.helpCmd = function() {
  var keys = Object.keys(this.commands);
  console.log("Available commands:");
  console.log("");
  keys.forEach(function(command) {
    console.log('  ' + command + ' - ' + this.commands[command].description);
  }.bind(this));
  console.log("");
};

BackfinCli.prototype.listen = function() {
  this.backfinConsole = readline.createInterface(process.stdin, process.stdout);
  this.backfinConsole.setPrompt('backfin> ');
  this.backfinConsole.prompt();
  this.backfinConsole.on('line', function(line) {
    var args = line.trim().split(/\s+/);
    switch(args[0]) {
      case '':
        break;
      case 'quit':
      case 'exit':
      case 'bye':
        process.exit(0);
        break;
      default:
        if(!this.commands[args[0]]) {
          console.log('Unknown command, see \'help\' for a full list of commands');
          break;
        }
        this[args[0]+'Cmd'].apply(this, args.slice(1));
        break;
    }
    this.backfinConsole.prompt();
  }.bind(this)).on('close', function() {
    process.exit(0);
  }.bind(this));
};

var backfinServer = new BackfinServer();
backfinServer.listenHttp();
backfinServer.listenFs();

console.log('Streaming code from directory '+backfinServer.watchDir);

var backfinCli = new BackfinCli();
backfinCli.listen();
