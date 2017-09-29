// rir_default_cfg comes from global/js/defaultConfig
var rir_user_cfg = {};

if(typeof localStorage['RIR_USER_CONFIG'] !== "undefined") {
    rir_user_cfg = JSON.parse(localStorage['RIR_USER_CONFIG']);
    console.log("User-configs loaded from localstorage");
}
else {
    console.log("No user-configs found in localstorage");
}

rir.config = {
    'import'(cfg) {
        if(typeof cfg.pmInboxInitialized === "object" && cfg.pmInboxInitialized instanceof Array) {
            cfg.pmInboxInitialized = (cfg.pmInboxInitialized.indexOf(this.username) >= 0);
        }
        if(typeof cfg.replyInboxInitialized === "object" && cfg.replyInboxInitialized instanceof Array) {
            cfg.replyInboxInitialized = (cfg.replyInboxInitialized.indexOf(this.username) >= 0);
        }

        rir_user_cfg[this.username] = cfg;
        rir.config.save();
    },
    'get'(prop) {
        // Get the user's config
        let cfg = rir_user_cfg[this.username];
        if(typeof cfg === "undefined") {
            cfg = rir_user_cfg[this.username] = rir_default_cfg;
        }

        // If the user's config has unset values (ie: newly added variables) set them to the default value
        for(let attr in rir_default_cfg){
            if(typeof cfg[attr] === "undefined") cfg[attr] = rir_default_cfg[attr];
        }

        // If a specific property is requested, return it
        if(typeof prop !== 'undefined') {
            let val = cfg[prop];

            if(typeof val === "undefined") throw { message: `Property '${prop}' does not exist in config` };
            return cfg[prop];
        }

        // Otherwise return the whole config
        return cfg;
    },
    'set'(prop, val) {
        // If the user does not have a config yet, initialize from default
        let cfg = rir_user_cfg[this.username];
        if(typeof cfg === "undefined") {
            cfg = rir_user_cfg[this.username] = rir_default_cfg;
        }

        // If the user's config has unset values (ie: newly added variables) set them to the default value
        for(let attr in rir_default_cfg){
            if(typeof cfg[attr] === "undefined") cfg[attr] = rir_default_cfg[attr];
        }

        if(typeof prop === "undefined") throw { message: 'Property argument missing' };
        if(typeof cfg[prop] === "undefined") throw { message: `Property '${prop}' does not exist in config` };
        if(typeof val === "undefined") throw { message: 'Property value argument missing' };

        // Set the property and save changes
        cfg[prop] = val;
        rir.config.save();
    },
    'save'() {
        localStorage['RIR_USER_CONFIG'] = JSON.stringify(rir_user_cfg);
    }
};