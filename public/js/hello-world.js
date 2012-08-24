{
  id: 'hello-world',
  name: 'Hello World',
  views: {
    'hello-world': {
      type: 'dialog',
      displayName: 'Hello World',
      initialize: function() {
        this.inherited('initialize');
      },
      render: function() {
        $(this.bodyEl).find('.dialog-body').html('<h1>Hello World!</h1>');
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