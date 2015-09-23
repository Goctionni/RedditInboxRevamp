var eventCmd;
(function(){
    
    eventCmd = {
        extensionNamespace: 'Unknown',
        whitelist: [
            'eventCmd.ping'
        ]
    };
    
    var HelperFuncs = {
        argsToArr: function(args){
            var arr = [];
            for(var i = 0; i < args.length; i++) {
                arr.push(args[i]);
            }
            return arr;
        },
        generateKey: function(){
            var chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-';
            var output = "";
            for(var i = 0; i < 10; i++) {
                output += chars[Math.floor(Math.random() * chars.length)];
            }
            return output;
        },
        whitelistCheck: function(path){
            if(!(path instanceof Array)) return false;
            var pathStr = path.join('.');
            return (eventCmd.whitelist.indexOf(pathStr) >= 0);
        },
        getPathTarget: function(path){
            var context, target = window;
            var pathCopy = path.slice();
            
            while(pathCopy.length > 0) {
                var attr = pathCopy.shift();
                if(target[attr] === undefined) {
                    return false;
                }
                context = target;
                target = target[attr];
            }
            return {function: target, context: context};
        },
        isValidTarget: function(target){
            if(target === "PingToAll") return true;
            return eventCmd.endPoints.contains(target);
        }
    };
    
    var responseCallbacks = {};
    eventCmd.successCallback = '{{SUCCESSCALLBACK}}';
    eventCmd.errorCallback = '{{ERRORCALLBACK}}';
    eventCmd.endPoints = {
        list: [],
        add: function(target){
            if(!eventCmd.endPoints.contains(target)) {
                eventCmd.endPoints.list.push(target);
            }
        },
        contains: function(target){
            return (eventCmd.endPoints.list.indexOf(target) >= 0);
        }
    };
    
    // Send
    eventCmd.send = function(target, path, params, success, error){
        if(!params) params = [];
        if(!HelperFuncs.isValidTarget(target)){
            console.error("EventCmd target", target, "does not seem to exist");
        }
        
        var eventData = {
            target: target,
            path: path,
            params: params,
            cmdKey: HelperFuncs.generateKey()
        };
        
        responseCallbacks[eventData.cmdKey] = {
            success: success,
            error: error,
            persist: false
        };

        if(params.indexOf(eventCmd.successCallback) >= 0 || params.indexOf(eventCmd.errorCallback) >= 0) {
            responseCallbacks[eventData.cmdKey].persist = true;
        }

        var event = new CustomEvent('EventCmd', { detail: eventData });
        window.dispatchEvent(event);
    };
    
    // Send response functions
    var response = {
        success: function(){
            response.send(this.detail.cmdKey, true, HelperFuncs.argsToArr(arguments));
        },
        error: function(){
            response.send(this.detail.cmdKey, false, HelperFuncs.argsToArr(arguments));
        },
        send: function(cmdKey, success, args){
            var returnData = {
                args: args,
                cmdKey: cmdKey,
                success: success
            };
            var responseEvent = new CustomEvent('EventResponse', { detail: returnData});
            window.dispatchEvent(responseEvent);
        }
    };
    
    // Receive
    window.addEventListener('EventCmd', function(e){
        if(e.detail.target !== eventCmd.extensionNamespace && e.detail.path.join('.') !== 'eventCmd.ping') return;
        var success = response.success.bind(e);
        var error = response.error.bind(e);
        
        if(!HelperFuncs.whitelistCheck(e.detail.path)) {
            return error("The requested path or function is not whitelisted.");
        }
        
        var target = HelperFuncs.getPathTarget(e.detail.path);
        if(!target) {
            return error("The requested path or function does not exist.");
        }
        if(typeof target.function !== 'function') {
            return error("The requested path does not lead to a function.");
        }
        
        var params = e.detail.params;
        for(var i = 0; i < params.length; i++){
            if(params[i] === eventCmd.successCallback) params[i] = success;
            if(params[i] === eventCmd.errorCallback) params[i] = error;
        }
        var returnValue = target.function.apply(target.context, params);
        if(!returnValue) return;
        if(returnValue instanceof Promise) {
            returnValue.then(success, error);
        }
        else {
            success(returnValue);
        }
    });
    
    // Receive response
    window.addEventListener('EventResponse', function(e){
        var responseCallback = responseCallbacks[e.detail.cmdKey];
        if(responseCallback === undefined) return;
        
        if(e.detail.success){
            if(typeof responseCallback.success === "function")
            responseCallback.success.apply(null, e.detail.args);
        }
        else {
            if(typeof responseCallback.error === "function")
            responseCallback.error.apply(null, e.detail.args);
        }
        if(!responseCallback.persist) {
            delete responseCallbacks[e.detail.cmdKey];
        }
    });
    
    // Ping Pong to determine eventCmd endpoints
    eventCmd.ping = function(sender){
        eventCmd.endPoints.add(sender);
        var responseEvent = new CustomEvent('EventCmdPong', { detail: eventCmd.extensionNamespace });
        window.dispatchEvent(responseEvent);
    };
    
    window.addEventListener('EventCmdPong', function(e){
        if(!e.detail) return;
        eventCmd.endPoints.add(e.detail);
    });
    
    eventCmd.send('PingToAll', ['eventCmd', 'ping'], [eventCmd.extensionNamespace]);
})();