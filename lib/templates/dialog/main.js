define(function(Dialog) {
  return function(sandbox, el) {

    var Dialog = sandbox.views.Dialog.extend({
      template : '<div class="inner"><p></p></div>',
      title : '<%= name %>',
      initialize : function(options) { 
        this.inherited('initialize');
        this.setBody(_.template(this.template, {}));
      }
    });

    var dialog = new Dialog();
    dialog.open();

  }
});