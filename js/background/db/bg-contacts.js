rir.db.contacts = (function(undefined){

    var db = rir.db;
    var apiObj = {};

    apiObj.isValidContact = function(name){
        if(name.substr(0, 1) === "#") return false;
        if(name.substr(0, 1) === "[") return false;
        if(name === this.username) return false;
        if(name === "reddit") return false;
        return true;
    };

    apiObj.getMostPopular = function(start = 0, limit = 30) {
        // The action that we need to perform for this function
        let index = (rir.cfg_user_get('show_friends_first', this.username))
            ? { reddit_friend: 'DESC' }
            : { };

        index.popularity = 'DESC';
        index.last_message_at = 'DESC';

        var _this = this;
        var action = function(){
            return db.for[_this.username].get({
                table: db_tables.contacts,
                where: { block: 0 },
                index: index,
                start: start,
                limit: limit
            });
        };

        // Check whether or not we need to update our contacts first
        if(apiObj.updateNeeded.call(this)) {
            // If we need to update our contacts first, do that; after that perform our action
            return new Promise(function(pass, fail){
                var updatePromise = apiObj.update.call(_this);
                updatePromise.then(function(){
                    action().then(pass, fail);
                }, fail);
            });
        }
        else {
            // If we do not need to update our contacts, simply perform our action
            return action();
        }
    };

    apiObj.getMostThreads = function(start = 0, limit = 30){
        return db.for[_this.username].get({
            table: db_tables.contacts,
            where: { block: 0 },
            index: { favorite: 'DESC', reddit_friend: 'DESC', thread_count: 'DESC'},
            start: start,
            limit: limit
        });
    };

    apiObj.getMostMessages = function(start = 0, limit = 30){
        return db.for[_this.username].get({
            table: db_tables.contacts,
            where: { block: 0 },
            index: { favorite: 'DESC', reddit_friend: 'DESC', message_count: 'DESC'},
            start: start,
            limit: limit
        });
    };

    apiObj.getMostRecent = function(start = 0, limit = 30){
        return db.for[_this.username].get({
            table: db_tables.contacts,
            where: { block: 0 },
            index: { favorite: 'DESC', reddit_friend: 'DESC', last_message_at: 'DESC'},
            start: start,
            limit: limit
        });
    };

    apiObj.getAlphabetic = function(start = 0, limit = 30){
        return db.for[this.username].get({
            table: db_tables.contacts,
            where: { block: 0 },
            index: { favorite: 'DESC', reddit_friend: 'DESC', username: 'ASC'},
            start: start,
            limit: limit
        });
    };

    // This function should be called periodically to update the popularity score
    // of all contacts
    apiObj.update = function(){
        var _this = this;
        return new Promise(function(pass, fail){
            apiObj.getAlphabetic.call(_this, 0, -1).then(function(contacts){
                var promises = [];
                for(var i = 0; i< contacts.results.length; i++) {
                    var contact = contacts.results[i];
                    var numDaysElapsed = 1 + (((new Date()).getTime() - contact.last_message_at) / 1000 / 60 / 60 / 24);
                    var popularityModifier = Math.pow(1 / numDaysElapsed, 0.2);

                    var popularity = contact.message_count + (2 * contact.thread_count);
                    popularity *= popularityModifier;
                    contact.popularity = popularity;

                    var savePromise = db.for[_this.username].update(db_tables.contacts, contact);
                    promises.push(savePromise);
                }
                Promise.all(promises).then(function(result){
                    // Update lastUpdatePopular value
                    rir.cfg_set.call(_this, 'lastUpdatePopular', (new Date()).getTime(), false);
                    // Resolve promise
                    pass(result);
                }, fail);
            }, fail);
        });
    };

    apiObj.updateNeeded = function(){
        // Check if popular contacts need to be updated
        var updateInterval = rir.cfg_get('updatePopularInterval', this.username) * 1000;
        var lastUpdate = rir.cfg_get('lastUpdatePopular', this.username);
        var now = (new Date()).getTime();
        return ((now - lastUpdate) > updateInterval);
    };

    apiObj.registerNewMessage = function(conversation){
        var _this = this;
        return new Promise(function(pass, fail){
            if(!apiObj.isValidContact.call(_this, conversation.correspondent)) {
                return pass();
            }

            db.for[_this.username].get({
                table: db_tables.contacts,
                where: { username: conversation.correspondent },
                index: {},
                start: 0,
                limit: 1
            })
            .then(function(contacts){
                if(contacts.results.length === 0) {
                    // have to create a new contact
                    return apiObj.registerNewContact.call(_this, conversation).then(pass, fail);
                }

                var contact = contacts.results[0];
                contact.message_count++;

                db.for[_this.username]
                    .update(db_tables.contacts, contact)
                    .then(pass, fail);

            }, fail);
        });
    };

    apiObj.registerNewConversation = function(conversation){
        var _this = this;
        return new Promise(function(pass, fail){
            if(!apiObj.isValidContact.call(_this, conversation.correspondent)) {
                return pass();
            }

            db.for[_this.username].get({
                table: db_tables.contacts,
                where: { username: conversation.correspondent },
                index: {},
                start: 0,
                limit: 1
            })
                .then(function(contacts){
                    if(contacts.results.length === 0) {
                        // have to create a new contact
                        return apiObj.registerNewContact.call(_this, conversation).then(pass, fail);
                    }

                    var contact = contacts.results[0];
                    contact.thread_count++;
                    contact.message_count++;
                    contact.last_message_at = Math.max(contact.last_message_at, conversation.last_update_at);
                    contact.popularity = 3;

                    db.for[_this.username]
                        .update(db_tables.contacts, contact)
                        .then(pass, fail);

                }, fail);
        });
    };

    apiObj.registerNewContact = function(conversation){
        var contact = {
            username: conversation.correspondent,
            message_count: 1,
            thread_count: 1,
            last_message_at: conversation.last_update_at,
            popularity: 3,
            favorite: 0,
            res_user_tag: null,
            reddit_friend: 0,
            block: 0
        };
        return db.for[this.username].add(db_tables.contacts, contact);
    };

    apiObj.createContact = function(username, favorite = 0, reddit_friend = 0) {
        var contact = {
            username: username,
            message_count: 0,
            thread_count: 0,
            last_message_at: 0,
            popularity: 0,
            favorite: favorite,
            res_user_tag: null,
            reddit_friend: reddit_friend,
            block: 0
        };
        return db.for[this.username].add(db_tables.contacts, contact);
    };

    apiObj.updateFriends = function(friends){
        let _this = this;
        return new Promise(function(pass, fail){

            // First, get all current friends
            let oldFriendPromise = db.for[_this.username].get({
                table: db_tables.contacts,
                where: { reddit_friend: 1 }
            });

            oldFriendPromise.then(function(oldFriends){
                let hasErrors = 0;
                let promises = [];

                // Set the friends mentioned here to reddit_friend = 1
                friends.forEach(function(username){
                    if(!apiObj.isValidContact.call(_this, username)) return;
                    promises.push(new Promise(function(success){
                        var getUserPromise = db.for[_this.username].get({
                            table: db_tables.contacts,
                            where: { username: username },
                            index: {},
                            start: 0,
                            limit: 1
                        });
                        getUserPromise.then(function(users){
                            function registerError(){
                                hasErrors++;
                                success();
                            }

                            if(users.results.length === 0) {
                                // If contact not found, create it
                                return apiObj.call(_this, username, 0, 1).then(success, registerError);
                            }

                            // If this user was already a friend, do nothing
                            let friend = users.results[0];
                            if(friend.reddit_friend == 1) return success(0);

                            friend.reddit_friend = 1;
                            db.for[_this.username].update(db_tables.contacts, friend).then(success, registerError);
                        });
                    }));
                });

                Promise.all(promises).then(function(){

                    var removeFriendPromises = [];
                    // Remove all friends that were not on the list
                    oldFriends.results.forEach(function(oldFriend) {
                        if(friends.indexOf(oldFriend.username) < 0) {
                            oldFriend.reddit_friend = 0;
                            removeFriendPromises.push(db.for[_this.username].update(db_tables.contacts, oldFriend));
                        }
                    });

                    Promise.all(removeFriendPromises).then(function(){
                        var message = (hasErrors === 0)
                            ? "Friends updated without issue"
                            : "Friends updated, with errors / warnings";

                        pass(message);
                    });

                }, fail);
            }, fail);
        });
    };

    return apiObj;

})();
