define(function() {
  module("backfin-unit");

  QUnit.testStart(function(e){
    if(e.module != "backfin-unit") return;
    backfin.config({
      testRunnerPath : '/test/runner.html',
      manifests : [
        { id : 'foobar', featured : true},
        { id : 'test' }
      ]
    });
  });

  test("runTest", function(){
    backfin.on('plugin:test', function(pluginId, iframe){
      equal(pluginId, 'test', 'should have a pluginId');
      ok(iframe instanceof HTMLElement,'should return an iframe');
      document.body.appendChild(iframe);
    });
    unit.runTest('test', 'test.js');
  });
});