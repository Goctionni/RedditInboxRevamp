var rir_default_cfg = {
    version: '0',
    pmInboxInitialized: false,
    replyInboxInitialized: false,
    maxContacts: 50,
    maxInitialMessagesShown: 50,
    pageTitle: 'reddit.com: Revamped inbox',
    deleted: [],
    saved: [],
    showModmail: true,
    conversationNewToOld: false,
    enhancedVisibility: false,
    deleteDraftAfterDays: 60,
    showDraftIndicator: true,
    doImport: true,
    rememberInputheight: false,
    inputHeight: 80,
    maxAjaxRetries: 5,
    ajaxRetryDelay: 5,
    max403Retries: 15
};
var rir_user_cfg = {};

if(typeof localStorage['RIR_USER_CONFIG'] !== "undefined") {
    rir_user_cfg = JSON.parse(localStorage['RIR_USER_CONFIG']);
    console.log("Config loaded from localstorage");
}
else {
    console.log("No config found in localstorage");
}

rir.cfg_import = function(cfg) {
    if(typeof cfg.pmInboxInitialized === "object" && cfg.pmInboxInitialized instanceof Array) {
        cfg.pmInboxInitialized = (cfg.pmInboxInitialized.indexOf(this.username) >= 0);
    }
    if(typeof cfg.replyInboxInitialized === "object" && cfg.replyInboxInitialized instanceof Array) {
        cfg.replyInboxInitialized = (cfg.replyInboxInitialized.indexOf(this.username) >= 0);
    }
    
    rir_user_cfg[this.username] = cfg;
    rir_cfg_save();
};

rir.cfg_set = function(prop, val) {
    rir_user_cfg[this.username][prop] = val;
    rir_cfg_save();
    this.callback();
};

rir.cfg_user_get = function(prop, username){
    if(typeof rir_user_cfg[username] === "undefined") {
        rir_user_cfg[username] = rir_default_cfg;
    }
    
    var cfg = rir_user_cfg[username];
    for(var attr in rir_default_cfg){
        if(typeof cfg[attr] === "undefined") cfg[attr] = rir_default_cfg[attr];
    }
    
    if(typeof prop === 'undefined') {
        return cfg;
    }
    return cfg[prop];
};

rir.cfg_get = function(prop){
    return rir.cfg_user_get(prop, this.username);
};

var rir_cfg_deleted = {
    add:function(id){
        var index = rir_user_cfg[this.username].deleted.indexOf(id);
        if(index >= 0) return;

        rir_user_cfg[this.username].deleted.push(id);
        rir_cfg_save();
    },
    remove: function(id){
        var index;
        while((index = rir_user_cfg[this.username].deleted.indexOf(id)) >= 0){
            rir_user_cfg[this.username].deleted.splice(index, 1);
        }
        rir_cfg_save();
    }
};

var rir_cfg_saved = {
    add: function(id){
        var index = rir_user_cfg[this.username].saved.indexOf(id);
        if(index >= 0) return;

        rir_user_cfg[this.username].saved.push(id);
        rir_cfg_save();
    },
    remove: function(id){
        var index;
        while((index = rir_user_cfg[this.username].saved.indexOf(id)) >= 0){
            rir_user_cfg[this.username].saved.splice(index, 1);
        }
        rir_cfg_save();
    }
};

rir_cfg_save = function(){
    localStorage['RIR_USER_CONFIG'] = JSON.stringify(rir_user_cfg);
};