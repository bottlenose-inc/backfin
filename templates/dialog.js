{
  id: '<%= id %>',
  name: '<%= name %>',
  views: {
    '<%= id %>': {
      type: 'dialog',
      title: '<%= name %>',
      displayName: '<%= name %>',
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
      this.dialog = _bn.createView('<%= id %>');
      this.dialog.open();
    }
  }
}