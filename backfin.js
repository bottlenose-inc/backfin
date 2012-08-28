
var checkForChanges = function() {
  var start = new Date();
  
  var def = $.ajax({
     url: 'http://localhost:8077/update.json',
     contentType : 'application/json',
     type : 'GET'
  });

  def.done(function(res) {
    existingModule.emit('unload');
    var module = require('/aaa');
    module.emit('hotswap')
    //if((new Date() - start) < (50*1000)) {
    //  setTimeout(checkForChanges, 5000);
    //} else {
      checkForChanges();
    //}
  });
  
  def.error(function() {
    setTimeout(function() {
      startCodeStreaming();
    }, 300)
  });
};

var startCodeStreaming = function() {
  var def = $.ajax({
     url: 'http://localhost:8077/init.json',
     contentType : 'application/json',
     type : 'GET'
  });
  
  def.done(function(res) {
    $.showNotice("New code streaming environment detected");
    checkForChanges();
  });
  
  def.error(function() {
    setTimeout(function() {
      startCodeStreaming();
    }, 300)
  });
};

startCodeStreaming();