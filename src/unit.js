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
    var result = (core.getCoreOptions() || {}).testRunnerPath;
    if(!result) {
      console.warn('no testRunnerPath path define in backfin.configure')
      return false;
    }
    return result;
  };

  Unit.prototype.runTest = function(pluginId, testPath){
    var runnerPath  = this._getTestRunnerPath();
    if(!runnerPath) return;
    var iframe = document.createElement('iframe');
    
    $(iframe).on("load", function(){
      var win = iframe.contentWindow;
      var options = _.extend(core.getCoreOptions(), {
        channel : 'authoring', 
        manifest : {}
      });
      win.sandbox = new Sandbox(options);
      console.log(core.getPluginPath() + '/' + pluginId + '/' + testPath);
      win.run('/' + core.getPluginPath() + '/' + pluginId + '/' + testPath);
    });

    var path = '/' + backfin.getPluginPath() + '/' + pluginId + '/' + testPath;
    iframe.src = runnerPath + '?bust=' + Date.now();
    console.log(iframe.src);
    core.trigger('plugin:test', pluginId, iframe);
  };
  
  return new Unit();
});