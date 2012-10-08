define(['./view'],function(view){
  test('test view', function(){
    equal('div' , view.tagName.toLowerCase());
  });
});