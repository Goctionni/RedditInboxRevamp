(function(){
    
    /* request:
     * {
     *    action: 'proxyCmd',
     *    path: [str, ...],
     *    params: array,
     *    username: username
     * }
     */
    
    const logRequest = (request, sender) => {
        const paramsClone = JSON.parse(JSON.stringify(request.args));
        for(let i = 0; i < paramsClone.length; i++) {
            if(typeof paramsClone[i] === "string") paramsClone[i] = '"' + paramsClone[i] + '"';
            else if(paramsClone[i] instanceof Array) paramsClone[i] = 'Array[' + paramsClone[i].length + ']';
            else if(typeof paramsClone[i] === "object") paramsClone[i] = JSON.stringify(paramsClone[i]);
            
            if(typeof paramsClone[i] === "string" && paramsClone[i].length > 30) {
                paramsClone[i] = paramsClone[i].substring(0, 26) + " ...";
            }
        }
        console.log("Received proxyCmd:", request.path.join('.') + '(' + paramsClone.join(', ') + ');');
    };
    
    const messageListener = function(request, sender, sendResponse) {
        if(request.action && request.action === 'proxyCmd') {
            logRequest(request, sender);

            // Find the function that should be called, rir being the base
            let context;
            let func = rir;
            for(let subPath of request.path) {
                context = func;
                func = context[subPath];

                if(typeof func === "undefined") {
                    sendResponse({ success: false, data: { error: `Requested function (${request.path.join('.')}) does not exist` }});
                    return;
                }
            }

            if(typeof func !== "function") {
                sendResponse({ success: false, data: { error: `Requested function (${request.path.join('.')}) is not of type 'function'` }});
                return;
            }

            context = rir.helper.createUserboundContext(context, request.username);

            // Execute the function and store the returned value
            try {
                const response = func.apply(context, request.args);

                // If the function called does not return anything
                if(typeof response === "undefined"){
                    sendResponse({ success: true, data: null });
                    return;
                };

                // If the function called returns a promise
                if(response instanceof Promise) {
                    let responseFunc = (success, data) => {
                        let path = request.path.join('.');
                        let responseData = { success, data };
                        sendResponse(responseData);
                    };
                    let pass = responseFunc.bind(null, true);
                    let fail = responseFunc.bind(null, false);
                    response.then(pass, fail);
                    return true;
                }

                // If the function called returned something, but not a promise
                sendResponse({ success: true, data: response });
            }
            catch(data) {
                console.error(data);
                if(data.message) data = data.message;
                else if(data.error) data = data.error;
                sendResponse({ success: false, data: data });
                return;
            }
        }
    };

    chrome.runtime.onMessage.addListener(messageListener);
    
})();