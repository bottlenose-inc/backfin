// ## Sandbox
// Implements the sandbox pattern and set up an standard interface for modules.
// This is a subset of the mediator functionality.
//
// Note: Handling permissions/security is optional here
// The permissions check can be removed
// to just use the mediator directly.
define('backfin-unit', ['backfin-core', 'backfin-sandbox'], function(core, Sandbox) {
  function Unit() {
    
  }

  Unit.prototype._getTestRunnerPath = function(options) {
    return (core.getCoreOptions() || {}).testPath;
  };

  Unit.prototype.runTest = function(pluginId, testPath){
    var iframe = document.createElement('iframe');
    $(iframe).on("load", function(){
      var win = iframe.contentWindow;
      var options = _.extend(core.getCoreOptions(), {
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
    });
    var path = '/' + backfin.getPluginPath() + '/' + pluginId + '/' + testPath;
    iframe.src = this._getTestRunnerPath() + '?bust=' + new Date();
    core.trigger('plugin:test', pluginId, iframe);
  };
  
  return new Unit();
});