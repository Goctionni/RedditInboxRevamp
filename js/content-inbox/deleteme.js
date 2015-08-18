    
    rir_db.getConversation = function(key, callback){
        var store = getObjectStore(db_tables.privateMessages.name, mode.readonly);
        var index = store.index("first_message_name");
        var keyRange = IDBKeyRange.only(key);
        
        var messages = [];
        index.openCursor(keyRange).onsuccess = function(e){
            var cursor = e.target.result;
            if(!cursor) {
                if(messages.length === 0) return callback(null);
                messages.sort(function(a, b){
                    if(a.created_utc > b.created_utc) return -1;
                    if(a.created_utc < b.created_utc) return 1;
                    return 0;
                });
                
                return callback(privateMessagesToConversations(messages)[0]);
            };
            
            fixMessage(cursor.value);
            messages.push(cursor.value);
            cursor.continue();
        };
    };
    
    rir_db.updateMessages = function(messages, callback, store){
        if(store === undefined) {
            store = getObjectStore(db_tables.privateMessages.name, mode.readwrite);
        }
        if(!(messages instanceof Array)) {
            messages = [messages];
        }
        
        var numMessagesUpdated = 0;
        for(var i = 0; i < messages.length; i++) {
            var msg = messages[i];
            var req = store.put(msg);
            req.onerror = function(e){
                log(ERROR, req);
                errorhandler(e);
            };
            req.onsuccess = function(e){
                if(++numMessagesUpdated >= messages.length) {
                    callback();
                }
            };
        }
    };
    
    function privateMessagesToConversations(privateMessages){
        var conversations = {};
        for(var i = 0; i < privateMessages.length; i++) {
            var obj = privateMessages[i];
            if(!conversations[obj.first_message_name]) {
                conversations[obj.first_message_name] = {id: obj.first_message_name, modmail: false, subject: '', messages: [], text: obj.body, 'new': false, last_update: obj.created_utc };
            }
            var conversaion = conversations[obj.first_message_name];
            conversaion.messages.push(obj);
            conversaion.subject = obj.subject;
            
            if(obj['new']) conversaion['new'] = true;   // If any message is new, then the conversation is new
            
            if(obj.first_message_name === obj.name) {
                // This is the first message in the conversation, try get the correspondent from it
                conversaion.correspondent = getCorrespondentFromMsg(obj);
            }
            // If the first message is distinguished as 'moderator' we'll flag it modmail
            if(obj.first_message_name === obj.name && obj.distinguished && obj.distinguished === "moderator") {
                conversaion.modmail = true;
            }
        }
        return ObjectValues(conversations);
    }
    
    function getCorrespondentFromMsg(msg){
        if(msg.author === getUsername()) {          // Sent by me
            return msg.dest;
        }
        else if(obj.dest === getUsername()){        // Sent to me
            return msg.author;
        }
        else {
            return (obj.author[0] === '#') ? msg.dest : msg.author;
        }
    }