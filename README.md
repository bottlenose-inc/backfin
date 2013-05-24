
# Backfin

Backfin is a Javascript/HTML5 framework on top of Backbone that enables Live Coding. It's developed by the development team at Bottlenose, Inc.

More to come!

backfin.config({
  manifests : [manifest],
  devMode: Boolean //default false
});

backfin.getManifests()
backfin.getManifestById()

backfin.start(ManifestIdString, OptionObject);
backfin.on('error', function(err, pluginId) { });
backfin.on('hotswap:choice', function(pluginsIdArray, callback){
  //display ui to make the user pick what pluginId to hotswap
  //state is remembered until the browser is reloaded
  //or backfin.clearUserSettings();
  callback();
});
backfin.clearUserSettings();

Plugin file Structure
  main.js //required
  manifest.json //required

Manifest
{
  "id" : String
  "stylesheets": {
    "less": [
      "main.less"
    ]
  },
  "disabled": Boolean, //default true
  "foo" : "bar"
}

main.js 

define(['view']function(View){
  var view;
  return {
    'start': function(el, options) {
      view = new View(options);
    },
    'stop': function(){
      view && view.close();
    },
    'reload': function(){
      write code that triggers a start 
      app.select({ view : i });
      or something else that will cause the view to show
    },
    'resize' : function() {

    },
    'foobar' : function(options) {

    }
  }
});