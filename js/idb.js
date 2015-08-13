var rir_db = {};
(function(undefined){
    
    var errorhandler = function(event) {
        log(ERROR, event);
        alert('an error occured, check console');
    };
    
    var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
    var IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
    var IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;
    
    var DB_VERSION = 4;
    var DB_NAME = "RIV_Messages";
    
    var db;
    var db_tables = {
        'privateMessages': { name: 'privateMessages', key: 'id', indexes: ['author', 'created_utc', 'first_message_name'], "columns": ["id", "author", "body", "body_html", "new", "created_utc", "name", "dest", "subject", "first_message_name", "distinguished"]},
        'commentReply': { name: 'commentReply', key: 'id', indexes: ['author', 'created_utc'], "columns": ["id", "author", "body", "body_html", "new", "created_utc", "name", "context", "link_title", "subreddit", "parent_id", "distinguished"]},
        'postReply': { name: 'postReply', key: 'id', indexes: ['author', 'created_utc'], "columns": ["id", "author", "body", "body_html", "new", "created_utc", "name", "context", "link_title", "subreddit", "parent_id", "distinguished"]},
    };
    
    var mode = {
        readonly: 'readonly',
        readwrite: 'readwrite',
        versionchange: 'versionchange'
    };
    
    rir_db.openDb = function(username, callback){
        log(DEBUG, "Open DB");
        var req = indexedDB.open(DB_NAME + username, DB_VERSION);
        req.onerror = errorhandler;
        req.onsuccess = function(e){
            db = this.result;
            log(DEBUG, "DB Opened");
            callback();
        };
        req.onupgradeneeded = function(e){
            log(INFO, "openDb.onupgradeneeded");
            var tables = Object.keys(db_tables);
            for(var i = 0; i < tables.length; i++) {
                var tableName = tables[i];
                var table = db_tables[tableName];
                var indexes = table.indexes;
                
                if(e.currentTarget.result.objectStoreNames.contains(tableName)) {
                    e.currentTarget.result.deleteObjectStore(tableName);
                }
                var store = e.currentTarget.result.createObjectStore(tableName, { keyPath: table.key });
                for(var j = 0; j < indexes.length; j++) {
                    store.createIndex(indexes[j], indexes[j], {unique: false});
                }
            }
            rir_cfg.pmInboxInitialized = [];
            rir_cfg.replyInboxInitialized = [];
        };
    };
    
    var numPages = 0;
    var numErrors = 0;
    rir_db.init = function(callback) {
        numPages = 0;
        numErrors = 0;
        indexed = [];
        
        if(rir_cfg.pmInboxInitialized.indexOf(getUsername()) < 0) {
            log(DEBUG, "Initializing private messages");
            rir_db.indexAllPrivateMessages(null, function(){
                rir_cfg.pmInboxInitialized.push(getUsername());
                rir_cfg_save();
                callback();
            });
        }
        else {
            rir_db.indexNewPrivateMessages(function(){
                callback();
            });
        }
    };
    
    function status(message){
        if(typeof rir_db.statusFunc === "function")
        rir_db.statusFunc(message);
    }
    
    function getObjectStore(store_name, mode) {
        var tx = db.transaction(store_name, mode);
        return tx.objectStore(store_name);
    }
    
    function clearObjectStore(store_name, callback) {
        var store = getObjectStore(store_name, mode.readwrite);
        var req = store.clear();
        
        if(typeof callback === "function") {
            req.onsuccess = callback;
        }
    }
    
    function fixMessage(msg){
        if(!msg.author) msg.author = "[unknown]";
        if(isMessageHTMLEncoded(msg)) {
            msg.subject = htmlDecode(msg.subject);
            msg.body_html = htmlDecode(msg.body_html);
            msg.body = htmlDecode(msg.body);
        }
        if(msg.created) delete msg.created;
    }
    
    function getObjAttributes(obj, attributes) {
        var r = {};
        for(var i = 0; i < attributes.length; i++){
            var attr = attributes[i];
            if(typeof obj[attr] !== "undefined") {
                r[attr] = obj[attr];
            }
        }
        return r;
    }
    
    rir_db.getAllPMConversations = function(callback){
        var store = getObjectStore(db_tables.privateMessages.name, mode.readonly);
        getAll(store, 'created_utc', true, function(privateMessages){
            var conversations = privateMessagesToConversations(privateMessages);
            callback(conversations);
        });
    };
    
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
            conversations[obj.first_message_name].messages.push(obj);
            conversations[obj.first_message_name].subject = obj.subject;
            
            if(obj['new']){
                conversations[obj.first_message_name]['new'] = true;
            }
            
            if(obj.author === getUsername()) { // Sent by me
                conversations[obj.first_message_name].correspondent = obj.dest;
            }
            else if(obj.dest === getUsername()){ // Sent to me
                conversations[obj.first_message_name].correspondent = obj.author;
            }
            else {
                conversations[obj.first_message_name].modmail = true;                
                if(obj.author[0] === '#') {     // Sent by a subreddit I moderate
                    conversations[obj.first_message_name].correspondent = obj.dest;
                }
                else {                          // Sent to a subreddit I moderate
                    conversations[obj.first_message_name].correspondent = obj.author;
                }
            }
            // If the first message is distinguished as 'moderator' we'll also flag it modmail
            if(obj.first_message_name === obj.name && obj.distinguished && obj.distinguished === "moderator") {
                conversations[obj.first_message_name].modmail = true;
            }
        }
        return ObjectValues(conversations);
    }
    
    function getLastMessage(store, index, reverse, callback, offset) {
        if(typeof reverse !== "boolean") reverse = true;
        if(typeof offset === "undefined") offset = 0;
        
        var req = store.index(index).openCursor(null, reverse ? 'prev' : undefined);
        req.onsuccess = function(e){
            var cursor = e.target.result;
            
            if(!cursor) {
                callback(null);
            }
            else if(offset-- > 0) {
                cursor.continue();
            }
            else {
                fixMessage(cursor.value);
                callback(cursor.value);
            }
        };
    }
    
    function getAll(store, index, reverse, callback) {
        if(typeof reverse !== "boolean") reverse = true;
        
        var all = [];
        var req = store.index(index).openCursor(null, reverse ? 'prev' : undefined);
        req.onsuccess = function(e){
            var cursor = e.target.result;
            if(!cursor){
                return callback(all);
            }
            
            var obj = cursor.value;
            fixMessage(obj);
            
            all.push(obj);
            cursor.continue();
        };
    }
    
    function getObjectCountInStore(store, callback) {
        var req = store.count();
        req.onsuccess = function(e){
            callback(e.target.result);
        };
        req.onerror = function(e){
            log(ERROR, "Failed to count objects in store", e);
        };
    }
    
    function addPrivateMessage(obj, callback){
        if(!obj.author) obj.author = "[unknown]";
        
        var store = getObjectStore(db_tables.privateMessages.name, mode.readwrite);
        try {
            var req = store.add(obj);
            req.onsuccess = function(e){
                log(DEBUG, "Added to PM DB", obj);
                callback();
            };
            req.onerror = function(e){
                if(this.error.message === "Key already exists in the object store.") {
                    log(DEBUG, "PM already in DB", obj);
                    callback();
                }
                else {
                    log(ERROR, "Failed to add PM to DB", e, this, obj);
                }
            };
        } catch(e){
            log(ERROR, e);
            return;
        }
    }
    
    function addPrivateMessages(obj, callback) {
        var message = getObjAttributes(obj, db_tables.privateMessages.columns);
        message.first_message_name = (message.first_message_name) ? message.first_message_name : message.name;
        
        var messages = [message];
        if(obj.replies) {
            var replies = obj.replies.data.children;
            for(var i = 0; i < replies.length; i++) {
                messages.push(getObjAttributes(replies[i].data, db_tables.privateMessages.columns));
            }
        }
        
        var messagesAdded = 0;
        for(var i = 0; i < messages.length; i++) {
            addPrivateMessage(messages[i], function(){
                if(++messagesAdded >= messages.length) {
                    callback();
                }
            });
        }
    }
    
    function addMessage(obj) {
        if(obj.kind === "t1") {
            if(obj.data.subject === "post reply") {
                //console.log("Post reply", obj.data);
            }
            else if(obj.data.subject === "comment reply") {
                //console.log("Comment reply", obj.data);
            }
        }
        if(obj.kind === "t4") {
            //console.log("Private message", obj.data);
            addPrivateMessages(obj.data);
        }
        if(obj.kind === "t3") {
            
        }
    }
    
    var indexed = [];
    
    function parseListItems(data) {
        var listItems = [];
        var listing = data.data.children;
        if(!listing.length) return listItems;
        
        for(var i = 0; i < listing.length; i++) {
            var item = listing[i];
            if(indexed.indexOf(item.data.id) === -1) {
                indexed.push(item.data.id);
                listItems.push(item.data);
            }
        }
        return listItems;
    }
    
    rir_db.indexAllPrivateMessages = function(reference, callback, before, forbiddenCallback) {
        // Get private messages
        var url = '/message/messages.json?raw_json=1&limit=100';
        var beforeAfter = (!before ? 'after' : 'before');
        if(!!reference) url += "&" + beforeAfter + "=" + reference;
        $.get(url)
            .success(function(response){
                var executeCallback = false;
                var newReference = response.data[beforeAfter];
                if(newReference) {
                    rir_db.indexAllPrivateMessages(newReference, callback, before, forbiddenCallback);
                }
                else {
                    executeCallback = true;
                }
                
                var listItems = parseListItems(response);
                if(!listItems.length) {
                    return callback();
                }
                
                var conversationsAdded = 0;
                for(var i = 0; i < listItems.length; i++) {
                    addPrivateMessages(listItems[i], function(){
                        if(++conversationsAdded >= listItems.length) {
                            // Page added
                            log(DEBUG, "Page added");
                            if(executeCallback && typeof callback === "function") {
                                status("All messages have been indexed");
                                return callback();
                            }
                            else {
                                var message = (++numPages === 1) ? ' page has been indexed' : ' pages have been indexed';
                                status(numPages + message);
                            }
                        }
                    });
                }
            })
            .fail(function(e, textStatus, errorThrown){
                if(errorThrown === "Forbidden") {
                    if(typeof forbiddenCallback === "function") forbiddenCallback();
                    return;
                }
                
                log(ERROR, "Error occured trying to load inbox messages", e);
            
                numErrors++;
                if(++numErrors >= 5) {
                    status(false);
                }
                else {
                    status("An error occured trying to load more messages, trying again in 3 seconds");
                    setTimeout(function(){
                        status("Retrying to load more messages");
                        rir_db.indexAllPrivateMessages(reference, callback, before);
                    }, 3000);
                }
            });
    };
    
    rir_db.clearInbox = function(callback){
        clearObjectStore(db_tables.privateMessages.name, callback);
    };
    
    rir_db.indexNewPrivateMessages = function(callback, offset){
        if(typeof offset === "undefined") offset = 0;
        indexed = [];
        
        function retry(){
            rir_db.indexNewPrivateMessages(callback, offset + 1);
        }
        
        var store = getObjectStore(db_tables.privateMessages.name, mode.readonly);
        getLastMessage(store, 'created_utc', true, function(msg){
            if(!msg) {
                // If there isnt a last message, simply start from the beginning
                rir_db.indexAllPrivateMessages(null, function(){
                    rir_cfg.pmInboxInitialized.push(getUsername());
                    rir_cfg_save();
                    callback();
                });
                return;
            }
            
            rir_db.indexAllPrivateMessages(msg.name, function(){
                log(DEBUG, "All new private messages indexed");
                $.get('/message/messages');
                callback();
            }, true, retry);
        }, offset);
    };
    
    rir_db.indexAll = function(after, callback){
        rir_db.indexAllPrivateMessages(after, callback);
    };
    
    rir_db.setStatusFunction = function(func){
        rir_db.statusFunc = func;
    };
})();