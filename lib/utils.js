
var fs = require('fs');

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
  },
  generateIndex: function(pluginDir, callback) {
    var plugins = [];
    utils.walk(pluginDir, function(err, paths) {
      paths.forEach(function(path) {
        var relativePath = path.slice(pluginDir.length);
        var md = relativePath.match(/\/(.+)\/manifest\.json/)
        if(!md || !md[1]) { return; }

        var manifest = fs.readFileSync(path, 'utf-8');
        try {
          manifest = JSON.parse(manifest);
        } catch(e) {
          console.warn("Warning: Could not parse manifest.json file for "+md[1]);
          console.warn(e);
          console.warn(manifest)
          return;
        }

        manifest.id = md[1];
        plugins.push(manifest);
      }.bind(this));

      plugins = plugins.sort(function(b, a) {
        return b.name - a.name;
      });

      var indexManifest = {plugins: plugins};
      var fd = fs.openSync(pluginDir + '/manifest.json', 'w+');
      fs.writeSync(fd, JSON.stringify(indexManifest, null, 2));
      fs.closeSync(fd);
      callback && callback(null, plugins);
    }.bind(this));
  }
}

module.exports = utils;
