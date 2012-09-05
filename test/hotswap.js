(function() {
  module("backfin-hotswap");
  
  var backfin,
      events,
      TEST_CHANNEL = 'test';
  

  test("_reloadView", function() {
    ok(!hotswap._reloadView(), 'should return false if no view path specified');
  });

})()