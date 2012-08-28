var utils = require(__dirname + '/../lib/utils'),
  BackfinCli = require(__dirname + '/../lib/cli'),
  BackfinServer = require(__dirname + '/../lib/server');

var backfinCli = new BackfinCli();
var backfinServer = new BackfinServer({backfinCli: backfinCli});
backfinServer.listenHttp();
backfinServer.listenFs();

console.log('Streaming code from directory '+backfinServer.watchDir);

backfinCli.listen();
