define(function() {
  module("backfin-hotswap");
  
  
  test("_reloadPlugin", function() {

    var stopSpy = this.spy(backfin, "stop");
    var unloadSpy = this.spy(backfin, "unload");
    var startSpy = this.spy(backfin, "start");

    hotswap._reloadPlugin('foobar');
    ok(stopSpy.called, 'should call backfin.stop');
    ok(stopSpy.calledWith('foobar'), 'should call backfin.stop with the foobar argument');


    ok(unloadSpy.called, 'should call backfin.unload');
    ok(unloadSpy.calledWith('foobar'), 'should call backfin.unload with the foobar argument');

    ok(startSpy.called, 'should call backfin.start');
    ok(startSpy.calledWith('foobar', { hotswap : true }), 'should call backfin.start with the foobar argument + hotswap option');
  });

  test("_reloadPluginStyles", function(){

  });

  test("_handleResponse", function(){

  })

})