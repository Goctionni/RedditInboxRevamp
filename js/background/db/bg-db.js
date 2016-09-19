/* global db_tables */

rir.db = (function(){

    var db = {};
    db.for = {};
    db.init = function(){
        var _this = this;
        return new Promise(function(pass, fail){
            // Check if we already have an open database for this user, if not- open one
            if(typeof db.for[_this.username] === "undefined") {
                db.for[_this.username] = new Database(_this.username, { pass: pass, fail: fail });
            }
            else {
                // If we do have one open already, use the callback
                pass();
            }
        });
    };

    return db;

})();
