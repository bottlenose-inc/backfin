(function() {
  module("backfin-core");
  
  var backfin,
      events,
      TEST_CHANNEL = 'test';
      
  QUnit.testStart(function(){
    backfin = window.core;
    requirejs.undef()
    backfin.config({
      manifests : [
        { id : 'foobar' },
        { id : TEST_CHANNEL }
      ]
    });

    events = backfin.getEvents();
    //verify setup
    ok(backfin);
    ok(events);
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
  })

  return;

  describe('backfin', function () {

 
    describe('subscribe', function() {

    });

    describe('publish', function() {

          describe('verification of parameters', function() {
              it('should throw an error if all the params are not specified', function () {
                  expect(function () {
                      backfin.publish();
                  }).toThrow(new Error('Channel must be defined'));
              });

              it('should throw an error if typeof channel param is not string', function () {
                  expect(function () {
                      backfin.publish({});
                  }).toThrow(new Error('Channel must be a string'));
              });
          });

      it('should call every callback for a channel, within the correct context', function () {
              var callback = sinon.spy();
              events[TEST_CHANNEL] = [
                  {callback:callback}
              ];

              backfin.publish(TEST_CHANNEL);

              expect(callback).toHaveBeenCalled();
          });

      it('should pass additional arguments to every call callback for a channel', function () {
              var callback = sinon.spy();
              var argument = {};
              events[TEST_CHANNEL] = [
                  {callback:callback}
              ];

              backfin.publish(TEST_CHANNEL, argument);

              expect(callback).toHaveBeenCalledWith(fment);
          });

      it('should return false if channel has not been defined', function () {
              var called = backfin.publish(TEST_CHANNEL);
              expect(called).toBe(false);
          });

          it('should add to publish queue if widget is loading', function() {
              events[TEST_CHANNEL] = [
                  {callback:function() {}}
              ];
              backfin.start({ channel:TEST_CHANNEL, element:'#nothing' });

              backfin.publish(TEST_CHANNEL);

              expect(backfin.getPublishQueueLength()).toBe(1);
          })
    });

    xdescribe('start', function() {
    
    });

    xdescribe('stop', function() {
      it('should throw an error if all the params are not specified', function () {});
      it('should throw an error if all the params are not the correct type', function () {});
      it('should call unload with the correct widget to unload from the app', function () {});
      it('should empty the contents of a specific widget\'s container div', function () {});
    });

    // This one will need to be researched a little more to determine exactly what require does
    xdescribe('unload', function () {
      it('should throw an error if all the params are not specified', function () {});
      it('should throw an error if all the params are not the correct type', function () {});
      it('should unload a module and all modules under its widget path', function () {});
    });

  });

})()