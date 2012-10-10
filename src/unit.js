// ## Sandbox
// Implements the sandbox pattern and set up an standard interface for modules.
// This is a subset of the mediator functionality.
//
// Note: Handling permissions/security is optional here
// The permissions check can be removed
// to just use the mediator directly.
define('backfin-unit', ['backfin-core', 'backfin-sandbox'], function(backfin, Sandbox) {
  function Unit() {
    backfin.on('run-test', this._handleRunTest.bind(this));
  }

  Unit.prototype._getTestRunnerPath = function(options) {
    var result = (backfin.getCoreOptions() || {}).testRunnerPath;
    if(!result) {
      console.warn('no testRunnerPath path define in backfin.configure')
      return false;
    }
    return result;
  };

  Unit.prototype._handleRunTest = function(options) {
    var pluginId = options.pluginId;
    var testPath = options.testPath;
    this.runTest(pluginId, testPath, options);
  },

  Unit.prototype.runTest = function(pluginId, testPath, options){
    var runnerPath  = this._getTestRunnerPath();
    if(!runnerPath) return;
    var iframe = options.iframe || document.createElement('iframe');
    console.log(options,iframe);
    $(iframe).on("load", function(){
      var win = iframe.contentWindow;
      var options = _.extend(backfin.getCoreOptions(), {
        channel : pluginId, 
        manifest : {}
      });

      if(!win.backfinUnit) {
        console.error('Test runner is not configured correctly backfinUnit is not available')
      } else {
        if(options.onProgress) win.backfinUnit.onProgress = options.onProgress;
        if(options.onDone) win.backfinUnit.onDone = options.onDone;
        if(options.onBegin) win.backfinUnit.onBegin = options.onBegin;
      }
      
      win.sandbox = new Sandbox(options);
      win.run('/' + backfin.getPluginPath() + '/' + pluginId + '/' + testPath);
    });

    var path = '/' + backfin.getPluginPath() + '/' + pluginId + '/' + testPath;
    iframe.src = runnerPath + '?bust=' + Date.now();
    return iframe;
  };
  
  return new Unit();
});