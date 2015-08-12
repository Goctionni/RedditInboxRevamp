var rir_cfg = {
    pmInboxInitialized: [],
    replyInboxInitialized: [],
    maxContacts: 50,
    maxInitialMessagesShown: 50,
    pageTitle: 'reddit.com: Revamped inbox',
    deleted: [],
    saved: [],
    showModmail: true
};

if(typeof localStorage['RIR_CONFIG'] !== "undefined") {
    ls_rir_cfg = JSON.parse(localStorage['RIR_CONFIG']);
    var keys = Object.keys(ls_rir_cfg);
    for(var i = 0; i < keys.length; i++) {
        var k = keys[i];
        rir_cfg[k] = ls_rir_cfg[k];
    }
}

rir_cfg_set = function(prop, val) {
    rir_cfg[prop] = val;
    rir_cfg_save();
};
rir_cfg_save = function(){
    localStorage['RIR_CONFIG'] = JSON.stringify(rir_cfg);
};

var logLevel = ERROR | INFO;