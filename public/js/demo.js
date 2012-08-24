{
  id: 'demo',
  name: 'Demo',
  views: {
    'demo': {
      type: 'stream',
      displayName: 'Pictures',
      className: 'picture-view',
      initialize: function() {
        this.inherited('initialize');
      },
      render: function() {
        this.$el.html('<h1>Pictures</h1>');
        var messagesWithPictures = this.model.filter([
          ['notEmpty', ['object.image.url']],
          ['notEquals', ['provider.id', 'linkedin']]
        ]);
        messagesWithPictures.forEach(function(message) {
          this.$el.append('<img src="'+message.object.image.url+'" />')
        }.bind(this));
      }
    }
  },
  routes: {
    'demo-on-search': {
      type: 'stream-view',
      viewId: 'demo',
      contextTypes: ['search', 'stream']  
    }
  },
  events: {
    'plugin:hotswap': function() {
      _bn.activateView('stream', 'demo');
    }
  }
}