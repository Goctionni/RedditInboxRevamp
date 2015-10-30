var rir = {
    init: {
        funcs: [],
        waitingCallbacks: [],
        completed: []
    },
    cfg: {
        data: {}
    },
    proxy: function(path, params, callback){
        if(typeof callback === "undefined") callback = function(){};
        if(typeof params === "undefined") params = [];
        else if(!(params instanceof Array)) params = [params];
        
        // Add username to cmdObj
        
        var cmdObj = {
            action: "proxyCmd",
            username: getUsername(),
            path: path,
            params: params
        };
        
        if(!cmdObj.username) {
            console.error("rir.proxy(...); requires the username (from DOM) for most features");
        }
        
        chrome.runtime.sendMessage(cmdObj, function(response){
            callback.apply(this, response);
        });
    },
    helper: {},
    manifest: chrome.runtime.getManifest()
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
    rir.templates = {
        add: function(obj){
            var objKeys = Object.keys(obj);
            for(var i = 0; i < objKeys.length; i++) {
                var k = objKeys[i];
                rir.templates[k] = obj[k];
            }
        }
    };
    rir.functions.preloadTemplatesReady = function(){
        var tArray = Object.keys(rir.templates);
        var loadedTemplates = 0;
        for(var i = 0; i < tArray.length; i++) {
            (function(template){
                var url = rir.templates[template];
                if(typeof url !== "string") {
                    return ++loadedTemplates;
                }
                
                $.get(url)
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
    
    // Note: This function requires DOMReady because it requires getUsername() for rir.proxy()
    rir.functions.initConfig = function(callback){
        rir.proxy(['rir', 'cfg_get'], [], function(cfg){
            if(!cfg.doImport) {
                rir.cfg.data = cfg;
            }
            else {
                // An import needs to be attempted
                if(typeof localStorage['RIR_CONFIG'] !== "undefined") {
                    // There is something to import
                    rir.cfg.data = JSON.parse(localStorage['RIR_CONFIG']);
                    //console.log("Importing old data");
                }
                else {
                    // There is nothing to import
                    rir.cfg.data = cfg;
                }
                rir.cfg.data.doImport = false;
                rir.proxy(['rir', 'cfg_import'], rir.cfg.data);
            }
            rir.init.done("CFGReady");
            if(typeof callback === "function") callback();
        });
    };
    
})(jQuery);