(function enableContextMenu(){
  try{
    window.oncontextmenu = null;
    document.oncontextmenu = null;
    document.addEventListener('contextmenu', function(e){
      e.stopImmediatePropagation();
    }, { capture: true });
  }catch(_){}
})();


