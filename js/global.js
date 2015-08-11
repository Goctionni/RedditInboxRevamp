var rir = {
    init: {
        funcs: [],
        waitingCallbacks: [],
        completed: []
    }
};

(function($, undefined){
    
    rir.functions = {};
    
    var startTime;
    function checkCallbacksReady(){
        var callbacks = rir.init.waitingCallbacks;
        var completed = rir.init.completed;
        
        callbackLoop:
        for(var i = 0; i < callbacks.length; i++) {
            var keys = callbacks[i].keys;
            var callback = callbacks[i].callback;
            
            for(var j = 0; j < keys.length; j++) {
                if(completed.indexOf(keys[j]) < 0) continue callbackLoop;
            }
            
            callbacks.splice(i--, 1);
            callback();
        }
    }
    
    // Start executing all functions that can be preloaded
    rir.init.start = function(){
        startTime = getTime();
        for(var i = 0; i < rir.init.funcs.length; i++) {
            rir.init.funcs[i]();
        }
    };
    
    // An init function calls this function when it is done
    // The 'key' parameter is the name of the function
    rir.init.done = function(key){
        var delay = getTime() - startTime;
        log(DEBUG, "Initializing", key, "took", delay, "ms");
        
        rir.init.completed.push(key);
        checkCallbacksReady();
    };
    
    // Call this function and pass the names of the functions in an array
    // and a callback that needs to execute after those functions are done
    rir.init.executeAfter = function(keys, callback){
        if(typeof keys === "string") keys = [keys];
        
        rir.init.waitingCallbacks.push({ keys: keys, callback: callback });
        checkCallbacksReady();
    };
    
    // Wait until the DOM is ready
    rir.functions.DOMReady = function(){
        $(function(){
            rir.init.done("DOMReady");
        });
        return false;
    };
    
    // Preload HTML templates
    rir.functions.preloadTemplatesReady = function(){
        var tArray = Object.keys(rir.templates);
        var loadedTemplates = 0;
        for(var i = 0; i < tArray.length; i++) {
            (function(template){
                $.get(rir.templates[template])
                    .success(function(html){
                        rir.templates[template] = html;
                    })
                    .always(function(){
                        if(++loadedTemplates >= tArray.length) {
                            rir.init.done("preloadTemplatesReady");
                        }
                    });
            })(tArray[i]);
        }
        return false;
    };
    
})(jQuery);