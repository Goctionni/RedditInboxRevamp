rir.background = (() => {

    const funcProxyFactory = (() => {
        // Creates functions that are extended at every level
        const proxyFuncFactory = (callback, path = []) => {
            const proxyFunc = function(){
                let args = Array.from(arguments);
                // If a function is called as a .then from a Promise
                // But nothing was returned in the promise func, then the payload becomes undefined
                if(args.length === 1 && typeof args[0] === "undefined"){
                    args = [];
                }
                return callback(proxyFunc.__path, args);
            };
            proxyFunc.__callback = callback;
            proxyFunc.__path = path;
            return proxyFunc;
        };

        // Handler to recursively provide sub-proxies when properties are accessed
        const handler = {
            get: (target, prop) => {
                let callback = target.__callback;
                let path = [ ...target.__path, prop ];
                return new Proxy(proxyFuncFactory(callback, path), handler);
            }
        };

        // Return a factory function that instantiates funcProxies
        return function(callback){
            return new Proxy(proxyFuncFactory(callback), handler);
        };

    })();

    const backgroundProxy = funcProxyFactory((path, args) => {
        return new Promise((resolve, reject) => {
            const username = rir.model.user.username;
            if(path.length === 0) return reject({ message: 'rir.background (proxy) called without path' });
            if(!username) return reject({ message: 'rir.background (proxy) called, but no username could be resolved', path, args });

            const cmdObj = {
                action: 'proxyCmd',
                username: username,
                path: path,
                args: args
            };
            chrome.runtime.sendMessage(cmdObj, (response) => {
                if(typeof response !== 'object') return reject({ message: 'No response received from background-page', path, args});
                if(response.success) return resolve(response.data);
                return reject(response.data);
            });
        });
    });

    return backgroundProxy;

})();