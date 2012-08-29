define(function() {
  return function(sandbox, el){
    el.innerHTML = 'Hello World';
    sandbox.publish('load', 'hello-world');
  }
});