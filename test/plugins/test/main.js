define(function() {
  return function(sandbox, options){
    var args = [].slice.call(arguments, 1);
    sandbox.trigger('loaded', args);
  }
});