var all_drafts = {};
if(typeof localStorage['RIR_DRAFTS'] !== "undefined") {
    all_drafts = JSON.parse(localStorage['RIR_DRAFTS']);
}

var drafts = {
    getAllKeys: function(){
        var user = this.username;
        if(typeof all_drafts[user] === "undefined") {
            all_drafts[user] = [];
            localStorage['RIR_DRAFTS'] = JSON.stringify(all_drafts);
        }
        return all_drafts[user];
    },
    get: function(key){
        var user = this.username;
        var obj_raw = localStorage['RIR_DRAFT_' + user + '_' + key];
        if(!obj_raw) return false;
        
        // Update timestamp
        var obj = JSON.parse(obj_raw);
        obj.timestamp = (new Date()).getTime();
        localStorage['RIR_DRAFT_' + user + '_' + key] = JSON.stringify(obj);
        
        return obj.value;
    },
    set: function(key, value){
        if(!value) {
            return drafts.delete.call(this, key);
        }
        
        var user = this.username;
        localStorage['RIR_DRAFT_' + user + '_' + key] = JSON.stringify({
            key: key,
            timestamp: (new Date()).getTime(),
            value: value
        });
        
        if(typeof all_drafts[user] === "undefined") {
            all_drafts[user] = [key];
        }
        else if(all_drafts[user].indexOf(key) < 0) {
            all_drafts[user].push(key);
        }
        localStorage['RIR_DRAFTS'] = JSON.stringify(all_drafts);
        return true;
    },
    delete: function(key){
        var user = this.username;
        delete localStorage['RIR_DRAFT_' + user + '_' + key];
        
        var index = all_drafts[user].indexOf(key);
        if(index >= 0) {
            all_drafts[user].splice(index, 1);
            localStorage['RIR_DRAFTS'] = JSON.stringify(all_drafts);
            return true;
        }
        return false;
    },
    deleteOld: function(){
        // iterate through all users
        var users = Object.keys(all_drafts);
        for(var i = 0; i < users.length; i++) {
            var user = users[i];
            
            // set cut off time
            var currentDate = new Date();
            var cutOffTime = currentDate.setDate(currentDate.getDate() - rir.cfg_user_get('deleteDraftAfterDays', user));
            
            // walk through all of this user's drafts
            var userDrafts = all_drafts[user];
            for(var j = 0; j < userDrafts.length; j++) {
                var draftKey = userDrafts[j];
                var draft_raw = localStorage['RIR_DRAFT_' + user + '_' + draftKey];
                
                // If the draft doesn't exist, delete the index
                if(!draft_raw) {
                    userDrafts.splice(j--, 1);
                    continue;
                }
                
                // If it does exist, check if it's too old
                var draft = JSON.parse(draft_raw);
                if(draft.timestamp < cutOffTime) {
                    // If it is too old, delete it, and its index
                    delete localStorage['RIR_DRAFT_' + user + '_' + draftKey];
                    userDrafts.splice(j--, 1);
                }
            }
        }
        // Update the all_drafts object
        localStorage['RIR_DRAFTS'] = JSON.stringify(all_drafts);
    }
};

drafts.deleteOld();