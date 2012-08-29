
var utils = require('./utils'),
  readline = require('readline'),
  fs = require('fs'),
  ejs = require('ejs');

// - Backfin CLI

//console.log("Creating a "+pluginType+" nano app scaffold");

var BackfinCli = function(options) {
  if(!options) { options = {}; }
  this.pluginDir = options.pluginDir || (__dirname + '/../public');
  this.commands = {
    'help': {
      description: 'This help description'
    },
    'scaffold': {
      description: 'Create a skeleton Backfin Module',
      args: ['pluginId', 'pluginType']
    },
    'generate-index': {
      description: 'Generate a plugins/manifest.json with all the available plugins',
    }
  }
  this.backfinConsole = null;
};

BackfinCli.prototype.parseArgv = function(callback) {
  var argv = process.argv;
  if(argv.length < 3) { return callback(new Error('No arguments given')); }
  var command = process.argv[2];
  this.execute(process.argv.slice(2), function() {
    callback();
  })
};

BackfinCli.prototype.generateIndexCmd = function(callback) {
  utils.generateIndex(this.pluginDir, function(err, plugins) {
    console.log("Found and indexed "+plugins.length+" plugin" + (plugins.length != 1 ? 's' : ''));
    callback();
  });
};

BackfinCli.prototype.scaffoldCmd = function(pluginId, pluginType, callback) {
  if(!pluginId) {
    console.warn("Usage: scaffold <plugin id> [plugin type]");
    return (arguments[arguments.length-1])();
  }

  pluginType = pluginType || 'dialog';

  var destinationDir = this.pluginDir + '/' + pluginId;
  var templateDir = __dirname + '/templates/' + pluginType;

  utils.walk(templateDir, function(err, paths) {
    try { fs.mkdirSync(destinationDir); } catch(e) {}
    paths.forEach(function(path) {
      var stat = fs.statSync(path);
      var destinationPath = destinationDir + path.slice(templateDir.length);
      if(stat.isDirectory()) {
        try { fs.mkdirSync(destinationDir); } catch(e) {}
      } else {
        var data = fs.readFileSync(path, 'utf-8');
        var fd = fs.openSync(destinationPath, 'w+');
        fs.writeSync(fd, ejs.render(data, {id: pluginId, name: pluginId.titleize(), type: pluginType}));
        fs.closeSync(fd);
      }
      console.log("[Created]  "+destinationPath);
    });
    this.backfinConsole && this.backfinConsole.prompt();
    callback();
  }.bind(this));
};

//help
BackfinCli.prototype.helpCmd = function(callback) {
  var keys = Object.keys(this.commands);
  console.log("Available commands:");
  console.log("");
  keys.forEach(function(command) {
    console.log('  ' + command + ' - ' + this.commands[command].description);
  }.bind(this));
  console.log("");
  callback();
};

BackfinCli.prototype.fileChanged = function(path) {
  var prompt = 'backfin> ';
  var i = prompt.length-1;
  var animatePrompt = function() {
    if(i <= 0) {
      this.backfinConsole.setPrompt(prompt);
      this.backfinConsole.prompt();
      return;
    }
    var nPrompt = prompt.concat();
    nPrompt = nPrompt.slice(0, i-1)+'-'+nPrompt.slice(i);
    this.backfinConsole.setPrompt(nPrompt);
    this.backfinConsole.prompt();
    i--;
    setTimeout(animatePrompt.bind(this), 50);
  }.bind(this);
  
  animatePrompt();
};

BackfinCli.prototype.prompt = function() {
  this.backfinConsole && this.backfinConsole.prompt();
};

BackfinCli.prototype.listen = function() {
  this.backfinConsole = readline.createInterface(process.stdin, process.stdout);
  this.backfinConsole.setPrompt('backfin> ');
  this.backfinConsole.prompt();
  this.backfinConsole.on('line', function(line) {
    var args = line.trim().split(/\s+/);
    this.execute(args);
    this.backfinConsole.prompt();
  }.bind(this)).on('close', function() {
    process.exit(0);
  }.bind(this));
};

BackfinCli.prototype.execute = function(args, callback) {
  switch(args[0]) {
    case '':
      break;
    case 'quit':
    case 'exit':
    case 'bye':
      process.exit(0);
      break;
    default:
      var methodName = args[0].titleize().replace(/\s/g, '');
      methodName = methodName.slice(0, 1).toLowerCase() + methodName.slice(1);
      if(!this.commands[args[0]]) {
        console.log('Unknown command '+methodName+', see \'help\' for a full list of commands');
        break;
      }
      args.push(callback);
      this[methodName+'Cmd'].apply(this, args.slice(1));
      break;
  }
};

module.exports = BackfinCli;
