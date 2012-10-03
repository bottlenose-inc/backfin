// ## Sandbox
// Implements the sandbox pattern and set up an standard interface for modules.
// This is a subset of the mediator functionality.
//
// Note: Handling permissions/security is optional here
// The permissions check can be removed
// to just use the mediator directly.
define('backfin-unit', ['backfin-core', 'backfin-sandbox'], function(mediator, Sandbox) {

  function Qunit() {
    mediator.on('qunit', 'qunit:runTests', this.runTests.bind(this), this);
  }

  Qunit.prototype.runTests = function(options) {
    var manifests = mediator.getManifests(), testPaths = [], paths;
    for(var i = 0; i < manifests.length;i++) {
      paths = (manifests[i].tests || []);
      paths = paths.map(function(path){
        return  '/' + backfin.getPluginPath() + '/' + manifests[i].id + '/' + path;
      });
      testPaths = testPaths.concat(paths);
    }
    for(var i = 0; i < testPaths.length;i++) {
      this.runTest(testPaths[i])
    }
  };

  Qunit.prototype.runTest = function(path){
    var iframe = document.createElement('iframe');
    document.body.appendChild(iframe);

    $(iframe).on("load", function(){
      var win = iframe.contentWindow;
      var options = _.extend(mediator.getCoreOptions(), {
        channel : 'authoring', 
        manifest : {}
      });
      win.sandbox = new Sandbox(options);
      var scripts = window.__scriptGroups.base.concat(window.__scriptGroups.app);
      scripts = scripts.filter(function(file){
        return file.indexOf('multi-tab-monitor') == -1;
      })
      win.importScripts(scripts, function(){
        console.log('done');
      });
      win.QUnit.log(function(data) { 
        console.log(data);
      });
      win.QUnit.done(function() {
        // start the wrapper test from the main page
        console.log('complete');
      });
    });
    iframe.src = path + '?bust=' + new Date();
    return iframe;
  };
  
  return new Qunit();
});