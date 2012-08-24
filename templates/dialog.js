{
  id: '<%= id %>',
  name: '<%= name %>',
  views: {
    '<%= id %>': {
      type: 'dialog',
      displayName: '<%= name %>',
      initialize: function() {
        this.inherited('initialize');
      },
      render: function() {
        this.$el.find('.body').html('<h1>Hello World!</h1>');
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
      this.dialog = _bn.createView('<%= id %>');
      this.dialog.open();
    }
  }
}