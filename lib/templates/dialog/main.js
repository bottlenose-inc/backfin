define(function(Dialog) {
  return function(sandbox, el) {

    var Dialog = sandbox.views.Dialog.extend({
      template : '<div class="inner"><p></p></div>',
      title : '<%= name %>',
      className: '<%= id %>',
      initialize : function(options) { 
        this.inherited('initialize');
        this.setBody(_.template(this.template, {}));
      }
    });

    sandbox.on('plugin:hotswap', function(){
      var dialog = new Dialog();
      dialog.open();
    });

  }
});