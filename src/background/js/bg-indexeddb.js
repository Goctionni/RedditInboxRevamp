(function(undefined){
    
    var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
    var IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
    var IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;
    
    var DB_VERSION = 4;
    var DB_NAME = "RIR_Messages";
    
    function errorhandler(event){
        console.error(this, event);
    };
    
    function DBInstance(username, callback){
        this.username = username;
        this.db = null;
        
        this.open(callback);
    }
    
    DBInstance.prototype.open = function(callback){
        var _this = this;
        var req = indexedDB.open(DB_NAME + this.username, DB_VERSION);
        req.onerror = errorhandler;
        req.onsuccess = function(e){
            _this.db = req.result;
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
            
            rir_user_cfg[_this.username].pmInboxInitialized = false;
            rir_user_cfg[_this.username].replyInboxInitialized = false;
        };        
    };
    
    DBInstance.prototype.getObjectStore = function(store_name, mode){
        return this.db.transaction(store_name, mode).objectStore(store_name);
    };
    
    DBInstance.prototype.clearObjectStore = function(store_name){
        var store = this.getObjectStore(store_name, db_mode.readwrite);
        return new Promise(function(callback){
            var req = store.clear();
            req.onsuccess = function(){
                callback();
            };
            req.onerror = function(e){
                console.error("Failed to remove objects in store", e, req);
            };
        });
    };
    
    DBInstance.prototype.countObjectsInStore = function(store_name){
        var store = this.getObjectStore(store_name, db_mode.readonly);
        return new Promise(function(callback) {
            var req = store.count();
            req.onsuccess = function(e){
                callback(e.target.result);
            };
            req.onerror = function(e){
                console.error("Failed to count objects in store", e, req);
            };
        });
    };
    
    DBInstance.prototype.get = function(store_name, index, reverse, from, limit){
        if(typeof limit !== "number") limit = -1;
        if(typeof from !== "number") from = 0;
        if(typeof reverse !== "boolean") reverse = true;
        var store = this.getObjectStore(store_name, db_mode.readonly);
        
        var keyRange = null;
        if(typeof index === "object") {
            keyRange = IDBKeyRange.only(index.value);
            index = index.key;
        }
        
        var results = [];
        return new Promise(function(callback){
            var req = store.index(index).openCursor(keyRange, reverse ? 'prev' : undefined);
            req.onerror = function(e){
                if(e instanceof InvalidStateError) {
                    callback(results);
                }
                else {
                    callback(null);
                    errorhandler(e);
                }
            };
            req.onsuccess = function(e){
                var cursor = e.target.result;
                if(!cursor) return callback(results);
                if(from > 0) {
                    cursor.advance(from);
                    from = 0;
                    return;
                }
                results.push(cursor.value);

                if(--limit === 0) return callback(results);
                cursor.continue();
            };
        });        
    };
    
    DBInstance.prototype.add = function(store_name, obj){
        var store = this.getObjectStore(store_name, db_mode.readwrite);
        return new Promise(function(callback){
            var req = store.add(obj);
            req.onsuccess = function(e){
                callback(true);
            };
            req.onerror = function(e){
                if(this.error.message === "Key already exists in the object store.") {
                    callback(false);
                }
                else {
                    console.error("Failed to add to DB", e, req, obj);
                }
            };
        });
    };
    
    DBInstance.prototype.update = function(store_name, obj) {
        var store = this.getObjectStore(store_name, db_mode.readwrite);
        return new Promise(function(callback){
            var req = store.put(obj);
            req.onsuccess = function(e){
                callback();
            };
            req.onerror = function(e){
                console.error("Failed to update obj in DB", e, req, obj);
            };
        });
    };
    
    // Update function missing
    
    var dbInstances = {};
    
    rir.db = {
        init: function(){
            if(dbInstances[this.username] === undefined) {
                dbInstances[this.username] = new DBInstance(this.username, this.callback);
            }
            else {
                this.callback();
            }
        },
        clearObjectStore: function(store_name){
            return dbInstances[this.username].clearObjectStore(store_name);
        },
        countObjectsInStore: function(store_name){
            return dbInstances[this.username].countObjectsInStore(store_name);
        },
        'get': function(store_name, index, reverse, from, limit){
            return dbInstances[this.username].get(store_name, index, reverse, from, limit);
        },
        add: function(store_name, obj){
            return dbInstances[this.username].add(store_name, obj);
        },
        addAll: function(store_name, arr){
            var callback = this.callback;
            var _this = this;
            var index = 0;
            var added = 0;
            
            var next = function(){
                rir.db.add.call(_this, store_name, arr[index++]).then(function(r){
                    if(r) added++;
                    if(index < arr.length) next();
                    else callback(added);
                });
            };
            next();
        },
        update: function(store_name, obj) {
            return dbInstances[this.username].update(store_name, obj);
        },
        updateAll: function(store_name, arr){
            var callback = this.callback;
            var _this = this;
            var index = 0;
            
            var next = function(){
                rir.db.update.call(_this, store_name, arr[index++]).then(function(){
                    if(index < arr.length) next();
                    else callback();
                });
            };
            next();
        }
    };
    
})();