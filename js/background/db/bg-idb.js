/* global db_mode, db_tables */

var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
var IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
var IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;

/**
 * @type Database Datebase
 */
var Database = (function(){
    
    var cfg = {
        DB_NAME: "RIR_Messages_",
        DB_VERSION: 1
    };
    
    var db_helper = {
        obj_to_key_value_array: function(object){
            var array = [];
            if(!isObj(object) || object === null) return array;
            
            var keys = Object.keys(object);
            for(var i = 0; i < keys.length; i++){
                array.push({key: keys[i], value: object[keys[i]]});
            }
            return array;
        },
        whereMatch: function(item, where){
            for(var j = 0; j < where.length; j++) {
                var key = where[j].key;
                var val = where[j].value;
                if(!isDef(item[key])      // Key not found in result
                ||(item[key] !== val)){   // Value did not match expected value
                    return false;
                }
            }
            return true;
        },
        sortResults: function(results, index) {
            var resultsClone = results.slice(0);
            function compareByIndex(a, b){
                for(var i = 0; i < index.length; i++) {
                    var sorting = index[i];
                    var column = sorting.key;
                    var reverse = (sorting.value === "DESC");
                    if(a[column] === b[column]) continue;
                    var result = (a[column] > b[column]) ? 1 : -1;
                    if(reverse) result *= -1;
                    return result;
                }
                return 0;
            }
            
            resultsClone.sort(compareByIndex);
            return resultsClone;
        }
    };
    
    var Database = function(username, promise){
        if(!username){
            debugger;
        }
        this.username = username;
        this.db = null;
        
        this.init(promise);
    };
    
    Database.prototype.init = function(promise){
        // Databases are username specific, make sure we have a username
        if(typeof this.username !== "string" || this.username === "") {
            return promise.fail("Database.init called with invalid username", this.username);
        }
        
        var _this = this;
        var fullDBName = cfg.DB_NAME + this.username;
        var req = indexedDB.open(fullDBName, cfg.DB_VERSION);
        req.onerror = function(){
            promise.fail("Failed to open/create database: " + fullDBName);
        };
        req.onsuccess = function(){
            _this.db = req.result;
            promise.pass();
        };
        req.onupgradeneeded = function(e){
            console.log("Database upgrade needed detected");
            var tables = Object.keys(db_tables);
            for(var i = 0; i < tables.length; i++) {
                var tableName = tables[i];
                var table = db_tables[tableName];
                var indexes = table.indexes;
                
                if(e.target.result.objectStoreNames.contains(tableName)) {
                    e.target.result.deleteObjectStore(tableName);
                }
                var store = e.target.result.createObjectStore(tableName, { keyPath: table.key });
                for(var j = 0; j < indexes.length; j++) {
                    store.createIndex(indexes[j], indexes[j], {unique: false});
                }
            }
        };
    };
    
    Database.prototype.getObjectStore = function(store_name, mode) {
        if(isObj(store_name)) store_name = store_name.name;
        return this.db.transaction(store_name, mode).objectStore(store_name);
    };
    
    Database.prototype.clearObjectStore = function(store_name){
        var store = this.getObjectStore(store_name, db_mode.readwrite);
        return new Promise(function(pass, fail){
            var req = store.clear();
            req.onsuccess = function(){
                pass();
            };
            req.onerror = function(e){
                fail("Failed to remove objects in store " + store_name);
            };
        });
    };
    
    /**
     * { table: str, where: {col: val}, index: {col: 'ASC'}, start: int, limit: int }
     * @param {type} queryObj
     * @returns {Promise}
     */
    Database.prototype.get = function(queryObj){
        var _this = this;
        var originalStart;
        return new Promise(function(pass, fail){
            // Create inner scope to avoid 'queryObj' getting overwritten
            // Might not be needed, but whatever
            (function(QueryObjCopy){
                var store = _this.getObjectStore(queryObj.table, db_mode.readonly);
                if(!isNum(queryObj.start)) queryObj.start = 0;
                if(!isNum(queryObj.limit)) queryObj.limit = -1;
                originalStart = queryObj.start;

                // If we have a where, use it
                var where = db_helper.obj_to_key_value_array(queryObj.where);
                var index = db_helper.obj_to_key_value_array(queryObj.index);

                var req;
                var requiresFilter = false;
                var requiresSorting = false;
                var canSkip =
                    (where.length === 0 && index.length <= 1) ? true :
                    (where.length === 1 && index.length === 0) ? true :
                    false;

                var storeIndex, keyRange, indexName;
                if(where.length > 0) {
                    var req;
                    var keyRange = IDBKeyRange.only(where[0].value);

                    indexName = where[0].key;
                    req = (indexName == store.keyPath)
                        ? req = store.openCursor(keyRange)
                        : store.index(indexName).openCursor(keyRange);

                    if(where.length > 1) requiresFilter = true;
                    if(index.length > 0) requiresSorting = true;
                }
                else if(index.length === 1) {
                    var direction = (index[0].value === "DESC") ? 'prev' : 'next';
                    req = store.index(index[0].key).openCursor(null, direction);
                }
                else {
                    if(index.length > 1) requiresSorting = true;
                    req = store.openCursor();
                }

                var resultPromise = new Promise(function(success, error){
                    var results = [];
                    req.onerror = function(e){
                        if(e instanceof window.DOMError && e.name === "InvalidStateError") {
                            return success(results);
                        }
                        else {
                            error("An error occured trying to fetch items.", e, req, QueryObjCopy);
                        }
                    };
                    req.onsuccess = function(e){
                        var cursor = e.target.result;
                        if(!cursor) return success(results);

                        if(canSkip && QueryObjCopy.start > 0) {
                            // If start is set, we first have to skip that number of results
                            if(where.length <= 1) {
                                // If we have 1 or fewer where clauses
                                // then our request will take care of all filtering
                                // and we can advance all the way in a single step
                                var start = QueryObjCopy.start;
                                QueryObjCopy.start = 0;
                                cursor.advance(start);
                            }
                            else { 
                                // Otherwise have to check each item to determine
                                // whether or not it would have matched our where clauses
                                // and only count it as skipped if it did
                                if(db_helper.whereMatch(cursor.value, where)) QueryObjCopy.start--;
                                cursor.continue();
                            }
                        }
                        else {
                            // Add our object to our list if it needs to meet no further criteria
                            // or it matches all further criteria
                            if(!requiresFilter || db_helper.whereMatch(cursor.value, where)){
                                results.push(cursor.value);
                            }
                            
                            // If no sorting is required
                            // And no filter is required
                            // and we have reached the maximum number of items
                            // We're done
                            if(!requiresFilter && !requiresSorting && results.length === QueryObjCopy.limit && QueryObjCopy.limit > 0) {
                                success(results);
                            }
                            else { // Otherwise we keep going
                                cursor.continue();
                            }
                        }
                    };
                });

                resultPromise.then(function(results){
                    // Function to call when the results have been counted
                    function resultsCounted(numResults) {
                        // Check if we have to sort the results
                        if(requiresSorting) results = db_helper.sortResults(results, index);

                        // If we still need to skip the first [x] results
                        if(!canSkip && originalStart > 0) results = results.slice(originalStart);

                        // Now we need to use queryObj.limit, if it is set
                        if(queryObj.limit > 0) results = results.slice(0, QueryObjCopy.limit);
                        
                        // Our results have been counted, filtered, sorted and limited as needed
                        // We can now give a response!
                        pass({ results: results, total: numResults, start: originalStart });
                    }
                    
                    // Count results
                    (function(){
                        // Count the results
                        if(where.length + index.length > 1) {
                            // If there is either an index and a where clause,
                            // Or multiple of either, we won't have used queryObj.limit
                            // Therefor we can simply count our current results
                            resultsCounted(results.length);
                        }
                        else {
                            var countReq;
                            if(where.length === 1) {
                                countReq = (indexName == store.keyPath)
                                    ? store.count(keyRange)
                                    : store.index(indexName).count(keyRange);
                            }
                            else {
                                countReq = store.count();
                            }
                            countReq.onsuccess = function(e) {
                                resultsCounted(e.target.result);
                            };
                            countReq.onerror = function(e){
                                fail("An error occured trying to count items in result set", e, countReq, queryObj);
                            };
                        }
                    })();
                }, function(){
                    fail(arguments); // resultPromise.fail
                });
            })(queryObj);
        });
    };
    
    Database.prototype.add = function(store_name, object){
        var store = this.getObjectStore(store_name, db_mode.readwrite);
        return new Promise(function(pass, fail){
            var req = store.add(object);
            req.onsuccess = function(e){
                pass(1);
            };
            req.onerror = function(e){
                if(this.error.message === "Key already exists in the object store.") {
                    pass(0);
                }
                else {
                    fail("Failed to add object to database", e, req, object);
                }
            };
        });
    };
    
    Database.prototype.update = function(store_name, object){
        var store = this.getObjectStore(store_name, db_mode.readwrite);
        return new Promise(function(pass, fail){
            var req = store.put(object);
            req.onsuccess = function(e){
                pass();
            };
            req.onerror = function(e){
                fail("Failed to update obj in DB", e, req, object);
            };
        });
    };
    
    return Database;
    
})();