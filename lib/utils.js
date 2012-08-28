
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
  }
}

module.exports = utils;
