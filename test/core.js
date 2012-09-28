define(function() {
  module("backfin-core");
  
  var events,
      TEST_CHANNEL = 'test';
  

  QUnit.testStart(function(e){
    if(e.module != "backfin-core") return;
    console.log(1);
    backfin.config({
      manifests : [
        { id : 'foobar', featured : true},
        { id : TEST_CHANNEL }
      ]
    });
    events = backfin.getEvents();
  });

  test('on', function(){ 
    throws(
      function() {
        backfin.on();
      },
      "should throw an error if all the params are not specified"
    );
    throws(
      function() {
        backfin.on({}, 'subscriber', function () {}, {})
      },
      "should throw an error if typeof subscriber is NOT string"
    );
    throws(
      function() {
       backfin.on('channel', {}, function(){}, {})
      },
      "should throw an error if typeof event is NOT string"
    );
    throws(
      function() {
        backfin.on('subscriber', 'channel', 'callback', {})
      },
      "should throw an error if typeof callback is NOT a function"
    );

    backfin.on(TEST_CHANNEL, 'spec', function() {}, this);
    ok(events['spec'], "should allow an event to be subscribed");

    var callback,
        callbackResult = 'callback';

    backfin.on(TEST_CHANNEL, 'foobar', function(){ return callbackResult; }, this);
    callback = events['foobar'][0].callback; 
    equal(callback(), callbackResult, 'should be able assign a specific callback for subscribed event');

    var callback1 = function() {};
    var callback2 = function() {};
    backfin.on(TEST_CHANNEL, 'twocallbacks', callback1, this);
    backfin.on(TEST_CHANNEL, 'twocallbacks', callback2, this);
    equal(events['twocallbacks'].length, 2 , 'should allow subscribing multiple callbacks for single event channel');
  });

  test('trigger', function(){    
    throws(
      function() { backfin.trigger()},
      "should throw an error if all the params are not specified"
    );

    throws(
      function() { backfin.trigger({}) },
      "should throw an error if typeof channel param is not string"
    );

    var callback = sinon.spy();
    var argument = { foo : 'bar' }
    events[TEST_CHANNEL] = [
      { callback:callback }
    ];
    
    backfin.trigger(TEST_CHANNEL, argument);
    ok(callback.calledWith(argument), 'should pass additional arguments to every call callback for a channel');

    var called = backfin.trigger("FOOBAR");
    ok(!called, 'should return false if channel has not been defined');

    events[TEST_CHANNEL] = [
      { callback:function() {} }
    ];

    requirejs.undef('plugins/' + TEST_CHANNEL + '/main');

    equal(backfin.getPublishQueueLength(), 0);
    //fake fetching of the foobar 
    backfin.start(TEST_CHANNEL);
    backfin.trigger(TEST_CHANNEL);
    equal(backfin.getPublishQueueLength(), 1, "should add to publish queue if widget is loading");
  });


  test('start', function(){

    throws(
      function() { backfin.start()},
      "should throw an error if all the params are not specified"
    );

    throws(
      function() { backfin.start({})},
      "should throw an error if params is an empty object no id" 
    );

    var promises = backfin.start([{id : 'foo'}, { id : 'bar' }]);
    equal(promises.length, 2, 'Should return 2 promises when given two plugins to load');
    var promise = backfin.start([{id : 'foo'}]);
    ok(promise.fail, 'Should return 1 promise when given one plugin to load'); 

    requirejs.undef('plugins/' + TEST_CHANNEL + '/main');
    var callback = this.spy();
    define('plugins/' + TEST_CHANNEL + '/main', function() {
      return callback;
    });
    backfin.on('main', 'loaded', callback, {});
    backfin.start(TEST_CHANNEL);
    ok(callback.called, 'should load (require) a widget that corresponds with a channel');

    requirejs.undef('plugins/' + TEST_CHANNEL + '/main');
    var callback = this.spy();
    define('plugins/' + TEST_CHANNEL + '/main', function() {
      return function(sandbox, args1, args2){
        callback(args1, args2);
      }
    });
    var args = { foo : 'bar' };
    backfin.on('main', 'loaded', callback, {});
    backfin.start(TEST_CHANNEL, 'foo', 'bar');

    ok(callback.calledWith('foo', 'bar'), 'should pass on the arguments specified to the widget');

    var promise = backfin.start([{id : 'foo'}]);
    stop();
    promise.fail(function() {
      equal(promise.state(), 'rejected', 'Should reject promise for plugins that are not defined');
      start();
    }); 
  });

  test("stop", function() {
    
  });

  test("unload", function(){
    define('plugins/monster/main', function(){
      return function(){};
    });

    backfin.config({
      manifests : [ {  id : 'monster', featured : true }]
    });

    backfin.start('monster');
    ok(require.s.contexts._.defined['plugins/monster/main'], 'make sure that the plugin is defined before unloading it');
    backfin.unload('monster');
    ok(!require.s.contexts._.defined['plugins/monster/main'], 'should remove the plugin ');
  });

  test("config", function(){

  });
  
  test("getManifests", function(){
    console.log(backfin.getManifests());
    equal(backfin.getManifests().length, 2, "Should find the to manifest we load by default");
    ok(backfin.getManifests()[0].id, "The full object should be available");
    equal(backfin.getManifests({ featured : true }).length, 1, "Should allow for filtering on attributes");
  });

  test("getActivePlugins", function(){

  });

  test("getPublishQueueLength", function(){

  })

  test("getEvents", function(){

  })

  test("onError", function(){

  })

  test("getManifestById", function(){
    ok(backfin.getManifestById('foobar'));
    ok(!backfin.getManifestById('bar'));
  })

  test("registerEventHook", function(){
    define('plugins/foobar/main', function() { return function(){} });

    backfin.config({
      manifests : [ { 
          id : 'foobar', featured : true, builtIn:true,
          events: { foobar : [{ id: "foobar" }]} 
      },{ 
          id : TEST_CHANNEL,
          events: { foobar : [{ id: "barfoo" }]} 
      }]
    });

    var addCallback = this.spy(), removeCallback = this.spy();

    backfin.registerEventHook('foobar', addCallback,removeCallback);
    ok(addCallback.calledOnce, 'should trigger an event right after register the hook if theres is events');
    equal(addCallback.args[0].length, 1, 'should filter out manifest that is not builtIn');
    equal(addCallback.args[0][0].eventType, 'foobar', 'should trigger a addCallback on manifest that contains that eventId');
    
    addCallback.reset();
    backfin.start(TEST_CHANNEL);
    ok(addCallback.called, 'should trigger new callback when a new plugin is started with that eventid');
    equal(addCallback.args[0].length, 1, 'should only return one manifest as the other has already been added');
    equal(addCallback.args[0][0].id, 'barfoo', 'should return the id of the new manifest event id');
    

    backfin.stop('foobar');
    ok(removeCallback.called, 'should trigger new callback when a new plugin is removed with that eventid');
    equal(removeCallback.args[0][0].id, 'foobar', 'should remove the right event');
  })
})