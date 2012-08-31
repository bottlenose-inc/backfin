define(function() {
  return function(sandbox, el){
    el.innerHTML = 'Hello World';
    sandbox.trigger('load', 'hello-world');
  }
});