rir.helper = {
    createUserboundContext(context, username) {
        return new Proxy({ username, context }, {
            get: function(target, prop){
                if(prop === 'username') return target.username;
                return target.context[prop];
            },
            set: function(target, prop, value){
                if(prop === 'username') return target.username = value;
                return target.context[prop] = value;
            }
        });
    }
};