(function(){
    
    var loadedExtensions = [];
    var extensionCallbacks = {};
    window.onExtLoaded = function(tag, callback){
        if(loadedExtensions.indexOf(tag) >= 0) {
            callback();
        }
        else {
            if(typeof extensionCallbacks[tag] === "undefined") {
                extensionCallbacks[tag] = [];
            }
            extensionCallbacks[tag].push(callback);
        }
    };
    
    var extLoaded = function(tag){
        loadedExtensions.push(tag);
        if(extensionCallbacks[tag] instanceof Array){
            var callbacks = extensionCallbacks[tag];
            for(var i = 0; i < callbacks.length; i++) {
                callbacks[i]();
            }
        }
    };
    
    var watchExtensionList = ['res', 'mod-toolbox'];
    function bodyClasslistChanged(){
        for(var i = 0; i < watchExtensionList.length; i++){
            var tag = watchExtensionList[i];
            if(document.body.classList.contains(tag)) {
                watchExtensionList.splice(i--, 1);
                extLoaded(tag);
            }
        }
    }
    
    document.addEventListener("DOMContentLoaded", function() {
        var mutationFilter = {attributes: true, attributeFilter: ['class']};
        var observer = new MutationObserver(bodyClasslistChanged);
        observer.observe(document.body, mutationFilter);
        bodyClasslistChanged();
    });
    
})();