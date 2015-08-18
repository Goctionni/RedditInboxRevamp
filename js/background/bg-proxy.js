(function(){
    
    function argsToArr(args){
        var arr = [];
        for(var i = 0; i < args.length; i++) {
            arr.push(args[i]);
        }
        return arr;
    }
    
    /* request:
     * {
     *    action: 'proxyCmd',
     *    path: [str, ...],
     *    params: array
     * }
     */
    
    function logRequest(request, sender){
        var paramsClone = JSON.parse(JSON.stringify(request.params));
        for(var i = 0; i < paramsClone.length; i++) {
            if(typeof paramsClone[i] === "string") paramsClone[i] = '"' + paramsClone[i] + '"';
            else if(paramsClone[i] instanceof Array) paramsClone[i] = 'Array[' + paramsClone[i].length + ']';
            else if(typeof paramsClone[i] === "object") paramsClone[i] = JSON.stringify(paramsClone[i]);
            
            if(typeof paramsClone[i] === "string" && paramsClone[i].length > 30) {
                paramsClone[i] = paramsClone[i].substring(0, 26) + " ...";
            }
        }
        console.log("Received proxyCmd:", request.path.join('.') + '(' + paramsClone.join(', ') + ');', sender);
    }
    
    var messageListener = function(request, sender, sendResponse) {
        if(request.action && request.action === 'proxyCmd') {
            logRequest(request, sender);
            
            var func = window;
            for(var i = 0; i < request.path.length; i++) {
                var key = request.path[i];
                func = func[key];
            }

            var context = {
                username: request.username,
                callback: function(){
                    var args = argsToArr(arguments);
                    sendResponse(args);
                }
            };
            
            var response = func.apply(context, request.params);
            if(typeof response === "undefined") return true;
            if(response instanceof Promise) {
                response.then(function(){
                    var args = argsToArr(arguments);
                    sendResponse(args);
                });
                return true;
            }
            sendResponse([response]);
        }
    };
    
    // sender.tab.id = unique identifier
    
    var messageBroadcaster = function(user, data){
        
    };
    
    var messageSender = function(){
        
    };
    
    chrome.runtime.onMessage.addListener(messageListener);
    
})();