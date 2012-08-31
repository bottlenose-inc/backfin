(function() {
  module("backfin-core");
  
  var backfin,
      channels,
      TEST_CHANNEL = 'test';

  QUnit.testStart(function(){
    backfin = window.core;
    
    backfin.config({
      manifests : {
        'test' : {}
      }
    });

    channels = backfin.getChannels();
    //verify setup
    ok(backfin);
    ok(channels);

    delete channels[TEST_CHANNEL]; 
  });

  test('subscribe', function(){ 
    throws(
      function() {
        backfin.subscribe();
      },
      "should throw an error if all the params are not specified"
    );
    throws(
      function() {
        backfin.subscribe({}, 'subscriber', function () {}, {})
      },
      "should throw an error if typeof channel is NOT string"
    );
    throws(
      function() {
       backfin.subscribe('channel', {}, function(){}, {})
      },
      "should throw an error if typeof subscriber is NOT string"
    );
    throws(
      function() {
        backfin.subscribe('channel', 'subscriber', 'callback', {})
      },
      "should throw an error if typeof callback is NOT a function"
    );

    backfin.subscribe(TEST_CHANNEL, 'spec', function() {}, this);
    ok(channels[TEST_CHANNEL], "should allow an event to be subscribed");
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
    channels[TEST_CHANNEL] = [
      { callback:callback }
    ];
    backfin.trigger(TEST_CHANNEL, argument);
    ok(callback.calledWith(argument), 'should pass additional arguments to every call callback for a channel');

    var called = backfin.trigger("FOOBAR");
    ok(!called, 'should return false if channel has not been defined');

    channels[TEST_CHANNEL] = [
      { callback:function() {} }
    ];

    backfin.start({ channel:TEST_CHANNEL, element : '#nothing' });
    backfin.trigger(TEST_CHANNEL);
    equal(backfin.getPublishQueueLength(), 1, "should add to publish queue if widget is loading");
  });
  

  test('start', function(){
    var el = document.createElement('div');
       return;
    expect(3);

    backfin.subscribe('load', '', function(event){
      equal(event,'hello-world');
    }, {});

 

    
    backfin.start({
      element : el, 
      channel : "hello-world"
    });
    
    
    /*
    it('should throw an error if all the params are not specified', function () {});
    it('should throw an error if all the params are not the correct type', function () {});
    it('should load (require) a widget that corresponds with a channel', function () {});
    it('should call every callback for the channel, within the correct context', function () {});
    it('should trigger a requirejs error if the widget does not exist', function (){});
    */ 
  })

  return;
  describe('backfin', function () {

 
    describe('subscribe', function() {


      it('', function() {
       
        expect(channels[TEST_CHANNEL]).toBeDefined();
      });

      it('should be able assign a specific callback for subscribed event', function() {
        var callback,
            callbackResult = 'callback';
        backfin.subscribe(TEST_CHANNEL, 'spec', function() { return callbackResult; }, this);
        callback = channels[TEST_CHANNEL][0].callback;
        expect(callback()).toBe(callbackResult);
      });

      it('should allow subscribing multiple callbacks for single event channel', function() {
        var callback1 = function() {};
        var callback2 = function() {};

        backfin.subscribe(TEST_CHANNEL, 'spec', callback1, this);
        backfin.subscribe(TEST_CHANNEL, 'spec', callback2, this);

        //expect(channels[TEST_CHANNEL]).toContain(callback1, callback2);
        expect(channels[TEST_CHANNEL].length).toBe(2);
      });
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
              channels[TEST_CHANNEL] = [
                  {callback:callback}
              ];

              backfin.publish(TEST_CHANNEL);

              expect(callback).toHaveBeenCalled();
          });

      it('should pass additional arguments to every call callback for a channel', function () {
              var callback = sinon.spy();
              var argument = {};
              channels[TEST_CHANNEL] = [
                  {callback:callback}
              ];

              backfin.publish(TEST_CHANNEL, argument);

              expect(callback).toHaveBeenCalledWith(argument);
          });

      it('should return false if channel has not been defined', function () {
              var called = backfin.publish(TEST_CHANNEL);
              expect(called).toBe(false);
          });

          it('should add to publish queue if widget is loading', function() {
              channels[TEST_CHANNEL] = [
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