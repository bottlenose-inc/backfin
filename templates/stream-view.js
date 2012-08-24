{
  id: '<%= id %>',
  name: '<%= name %>',
  views: {
    '<%= id %>': {
      type: 'stream',
      displayName: '<%= name %>',
      initialize: function() {
        this.inherited('initialize');
      },
      render: function() {
        this.$el.html('<h1>Hello World!</h1>');
      }
    }
  },
  routes: {
    '<%= id %>-on-search': {
      type: 'stream-view',
      viewId: '<%= id %>',
      contextTypes: ['search', 'stream']  
    }
  },
  events: {
    'plugin:hotswap': function() {
      _bn.activateView('stream', '<%= id %>');
    }
  }
}