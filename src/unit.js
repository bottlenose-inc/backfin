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
    return (core.getCoreOptions() || {}).testRunnerPath;
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
      win.run(core.getPluginPath() + '/' + pluginId + '/' + testPath);
    });

    var path = '/' + backfin.getPluginPath() + '/' + pluginId + '/' + testPath;
    iframe.src = this._getTestRunnerPath() + '?bust=' + Date.now();
    core.trigger('plugin:test', pluginId, iframe);
  };
  
  return new Unit();
});