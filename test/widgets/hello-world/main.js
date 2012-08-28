define(['backfin-sandbox'], function(sandbox) {
  return function(el){
    el.innerHTML = 'Hello World';
    sandbox.publish('load', 'hello-world');
  }
})