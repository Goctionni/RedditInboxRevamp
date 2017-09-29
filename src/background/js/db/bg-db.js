/* global db_tables */

rir.db = (function(){

    let db = {};
    db.for = {}; // DB instancess for each user are stored in here
    db.init = function(){
        return new Promise((pass, fail) =>{
            // Check if we already have an open database for this user, if not- open one
            if(typeof db.for[this.username] === "undefined") {
                db.for[this.username] = new Database(this.username, db_versions.V2, { pass: pass, fail: fail });
            }
            else {
                // If we do have one open already, use the callback
                pass();
            }
        });
    };

    /**
     * Clears all of a database's ObjectStores
     * @returns {Promise}
     */
    db.reset = function(){
        return new Promise((pass, fail) => {
            let promises = [];
            Object.keys(db_tables).forEach((storeName) => {
                promises.push(db.for[this.username].clearObjectStore(storeName));
            });

            Promise.all(promises).then(pass, fail);
        });
    };

    return db;

})();
