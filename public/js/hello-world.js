{
  id: 'hello-world',
  name: 'Hello World',
  views: {
    'hello-world': {
      type: 'dialog',
      title: 'Hello World',
      displayName: 'Hello World',
      initialize: function(options) {
        options = options || {};
        this.inherited('initialize', options);
        $(this.bodyEl).html('<div class="inner"><p></p></div>');
      }
    }
  },
  events: {
    'plugin:unload': function() {
      if(this.dialog) {
        this.dialog.close();
        this.dialog.remove();
      }
    },
    'plugin:hotswap': function() {
      this.dialog = _bn.createView('hello-world');
      this.dialog.open();
    }
  }
}