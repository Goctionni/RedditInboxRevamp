rir.legacy.db = {};
(function(undefined){
    
    var errorhandler = function(event) {
        console.error(event);
        alert('an error occured, check console');
    };
    
    var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
    
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
    
    rir.legacy.db.destroy = function(username){
        indexedDB.deleteDatabase(DB_NAME + username);
    };
    
    rir.legacy.db.openDb = function(username, callback){
        var req = indexedDB.open(DB_NAME + username, DB_VERSION);
        req.onerror = errorhandler;
        req.onsuccess = function(e){
            db = this.result;
            callback();
        };
        req.onupgradeneeded = function(e){
            console.log("openDb.onupgradeneeded");
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
        };
    };
    
    function getObjectStore(store_name, mode) {
        var tx = db.transaction(store_name, mode);
        return tx.objectStore(store_name);
    }
    
    rir.legacy.db.getAll = function(store_name, index, reverse, callback) {
        if(typeof reverse !== "boolean") reverse = true;
        var store = getObjectStore(store_name, mode.readonly);
        
        var all = [];
        var req = store.index(index).openCursor(null, reverse ? 'prev' : undefined);
        req.onsuccess = function(e){
            var cursor = e.target.result;
            if(!cursor){
                return callback(all);
            }
            
            var msg = cursor.value;
            rir.helper.fixPrivateMessage(msg);
            all.push(msg);
            cursor.continue();
        };
    };

})();