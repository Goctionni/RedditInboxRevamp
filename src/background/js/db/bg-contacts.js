rir.db.contacts = (function(undefined){

    let apiObj = {};
    let db = rir.db;

    const helper_funcs = {
        isValidContactName: (name, username) => {
            if(name.substr(0, 1) === "#") return false;
            if(name.substr(0, 1) === "[") return false;
            if(name === username) return false;
            if(name === "reddit") return false;
            return true;
        },
        contactExists: (name, username) => {
            return new Promise((yes, no) => {
                db.for[username].get({
                    table: db_tables.contacts,
                    where: { username: name },
                    index: {},
                    start: 0,
                    limit: 1
                })
                .then((contacts) => {
                    (contacts.results.length) ? yes(contacts.results[0]) : no();
                }, no);
            });
        },
        earliest: function(){
            var smallest = Number.MAX_SAFE_INTEGER;
            for(var i = 0; i < arguments.length; i++) {
                var value = (new Number(arguments[i])).valueOf();
                if(value && value < smallest) smallest = value;
            }
            return smallest;
        },
        latest: function(){
            var largest = 0;
            for(var i = 0; i < arguments.length; i++) {
                var value = (new Number(arguments[i])).valueOf();
                if(value && value > largest) largest = value;
            }
            return largest;
        }
    };

    // Methods of retrieving contact-list
    apiObj.getMostPopular = function(start = 0, limit = 30) {
        // The action that we need to perform for this function
        let index = rir.config.get.call(this, 'show_friends_first')
            ? { reddit_friend: 'DESC' }
            : { };

        index.popularity = 'DESC';
        index.last_message_at = 'DESC';

        let action = () => {
            return db.for[this.username].get({
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
            return new Promise((pass, fail) =>{
                apiObj.update.call(this).then(() => {
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
        let index = (rir.config.get.call(this, 'show_friends_first'))
            ? { reddit_friend: 'DESC' }
            : { };

        index.thread_count = 'DESC';

        return db.for[this.username].get({
            table: db_tables.contacts,
            where: { block: 0 },
            index: index,
            start: start,
            limit: limit
        });
    };

    apiObj.getMostMessages = function(start = 0, limit = 30){
        let index = (rir.config.get.call(this, 'show_friends_first'))
            ? { reddit_friend: 'DESC' }
            : { };

        index.message_count = 'DESC';

        return db.for[this.username].get({
            table: db_tables.contacts,
            where: { block: 0 },
            index: index,
            start: start,
            limit: limit
        });
    };

    apiObj.getMostRecent = function(start = 0, limit = 30){
        let index = (rir.config.get.call(this, 'show_friends_first'))
            ? { reddit_friend: 'DESC' }
            : { };

        index.last_message_at = 'DESC';

        return db.for[this.username].get({
            table: db_tables.contacts,
            where: { block: 0 },
            index: index,
            start: start,
            limit: limit
        });
    };

    apiObj.getAlphabetic = function(start = 0, limit = 30){
        let index = (rir.config.get.call(this, 'show_friends_first'))
            ? { reddit_friend: 'DESC' }
            : { };

        index.username = 'ASC';

        return db.for[this.username].get({
            table: db_tables.contacts,
            where: { block: 0 },
            index: index,
            start: start,
            limit: limit
        });
    };

    apiObj.getAlphabeticDesc = function(start = 0, limit = 30){
        let index = (rir.config.get.call(this, 'show_friends_first'))
            ? { reddit_friend: 'DESC' }
            : { };

        index.username = 'DESC';

        return db.for[this.username].get({
            table: db_tables.contacts,
            where: { block: 0 },
            index: index,
            start: start,
            limit: limit
        });
    };

    apiObj.getEarliest = function(start = 0, limit = 30) {
        let index = (rir.config.get.call(this, 'show_friends_first'))
            ? { reddit_friend: 'DESC' }
            : { };

        index.first_message_at = 'ASC';

        return db.for[this.username].get({
            table: db_tables.contacts,
            where: { block: 0 },
            index: index,
            start: start,
            limit: limit
        });
    };

    // Function called to update reddit friends
    apiObj.updateFriends = function(friends){
        return new Promise((pass, fail) => {

            // First, get all current friends
            let oldFriendPromise = db.for[this.username].get({
                table: db_tables.contacts,
                where: { reddit_friend: 1 }
            });

            oldFriendPromise.then((oldFriends) => {
                let hasErrors = 0;
                let promises = [];

                // Go through all (new) and if needed, set reddit_friend to 1. If contact does not exist, create it
                friends.forEach((friendName) => {
                    // If username invalid, skip
                    if(!helper_funcs.isValidContactName.call(this, friendName)) return;
                    // If this person is already a friend, do nothing
                    if(oldFriends.results.some((friendObj) => friendObj.username == friendName)) return;

                    // For everyone else, cCreate a promise (we have to retrieve the contact or create it
                    promises.push(new Promise((complete) => {
                        helper_funcs.contactExists(friendName, this.username).then((contact) => {
                            contact.reddit_friend = 1;
                            db.for[this.username].update(db_tables.contacts, contact).then(complete, () => complete(++hasErrors));
                        }, () => {
                            // If the user does not yet exist, create him (as a friend)
                            apiObj.createContact.call(this, friendName, 0, 1).then(success, registerError);
                        });
                    }));
                });

                // After everyone is added, remove those who are no longer on the list
                Promise.all(promises).then(() => {
                    let removeFriendPromises = [];
                    let removeFriends = oldFriends.results.filter((oldFriend) => (friends.indexOf(oldFriend.username) < 0));

                    // Remove all friends that were not on the list
                    removeFriends.forEach((oldFriend) => {
                        removeFriendPromises.push(new Promise((complete) => {
                            oldFriend.reddit_friend = 0;
                            db.for[this.username].update(db_tables.contacts, oldFriend).then(complete, () => complete(++hasErrors));
                        }));
                    });

                    Promise.all(removeFriendPromises).then(function(){
                        let message = (hasErrors === 0)
                            ? "Friends updated without issue"
                            : "Friends updated, with errors / warnings";

                        pass(message);
                    });

                }, fail);
            }, fail);
        });
    };

    // Function called to update reddit blocked list
    apiObj.updateBlocked = function(blocked){
        return new Promise((pass, fail) => {

            // First, get all current friends
            let oldBlockedPromise = db.for[this.username].get({
                table: db_tables.contacts,
                where: { block: 1 }
            });

            oldBlockedPromise.then((oldBlocked) => {
                let hasErrors = 0;
                let promises = [];

                // Go through all (new) and if needed, set block to 1. If contact does not exist, ignore it
                blocked.forEach((blockedName) => {
                    // If username invalid, skip
                    if(!helper_funcs.isValidContactName.call(this, blockedName)) return;
                    // If this person is already blocked, do nothing
                    if(oldBlocked.results.some((blockedObj) => blockedObj.username == blockedName)) return;

                    // For everyone else, Create a promise (we have to retrieve the contact or create it
                    promises.push(new Promise((complete) => {
                        helper_funcs.contactExists(blockedName, this.username).then((contact) => {
                            contact.block = 1;
                            db.for[this.username].update(db_tables.contacts, contact).then(complete, () => complete(++hasErrors));
                        }, complete);
                    }));
                });

                // After everyone is added, remove those who are no longer on the list
                Promise.all(promises).then(() => {
                    let removeBlockedPromises = [];
                    let removeBlocked = oldBlocked.results.filter((oldBlock) => (blocked.indexOf(oldBlock.username) < 0));

                    // Remove all friends that were not on the list
                    removeBlocked.forEach((oldBlock) => {
                        removeBlockedPromises.push(new Promise((complete) => {
                            oldBlock.block = 0;
                            db.for[this.username].update(db_tables.contacts, oldBlock).then(complete, () => complete(++hasErrors));
                        }));
                    });

                    Promise.all(removeBlockedPromises).then(function(){
                        let message = (hasErrors === 0)
                            ? "Blocked updated without issue"
                            : "Blocked updated, with errors / warnings";

                        pass(message);
                    });

                }, fail);
            }, fail);
        });
    };

    // This function should be called periodically to update the popularity score of all contacts
    apiObj.update = function(){
        return new Promise((pass, fail) => {
            apiObj.getAlphabetic.call(this, 0, -1).then((contacts) => {
                var promises = [];
                for(var i = 0; i< contacts.results.length; i++) {
                    var contact = contacts.results[i];
                    var numDaysElapsed = 1 + (((new Date()).getTime() - contact.last_message_at) / 1000 / 60 / 60 / 24);
                    var popularityModifier = Math.pow(1 / numDaysElapsed, 0.2);

                    var popularity = contact.message_count + (2 * contact.thread_count);
                    popularity *= popularityModifier;
                    contact.popularity = popularity;

                    var savePromise = db.for[this.username].update(db_tables.contacts, contact);
                    promises.push(savePromise);
                }
                Promise.all(promises).then((result) => {
                    // Update lastUpdatePopular value
                    rir.config.set.call(this, 'lastUpdatePopular', (new Date()).getTime(), false);
                    // Resolve promise
                    pass(result);
                }, fail);
            }, fail);
        });
    };

    // Function to determine whether an update to popularity scores needs to be calculated
    apiObj.updateNeeded = function(){
        // Check if popular contacts need to be updated
        var updateInterval = rir.config.get.call(this, 'updatePopularInterval') * 1000;
        var lastUpdate = rir.config.get.call(this, 'lastUpdatePopular');
        var now = (new Date()).getTime();
        return ((now - lastUpdate) > updateInterval);
    };

    apiObj.registerNewMessage = function(conversation, message){
        return new Promise((pass, fail) => {
            // Dont do anything if the contact is invalid
            if(!helper_funcs.isValidContactName(conversation.correspondent, this.username)) return pass();

            helper_funcs.contactExists(conversation.correspondent, this.username).then((contact) => {
                contact.message_count++;
                contact.first_message_at = helper_funcs.earliest(contact.first_message_at, conversation.last_update_at, message.created_utc);
                contact.last_message_at = helper_funcs.latest(contact.last_message_at, conversation.last_update_at, message.created_utc);
                // Increment the right counter
                if(message.author == this.username) contact.messages_sent_to++;
                else contact.messages_received_from++;

                db.for[this.username]
                    .update(db_tables.contacts, contact)
                    .then(pass, fail);
            }, () => {
                apiObj.registerNewContact.call(this, conversation, message).then(pass, fail);
            });
        });
    };

    apiObj.registerNewConversation = function(conversation, message){
        return new Promise((pass, fail) => {
            if(!helper_funcs.isValidContactName(conversation.correspondent, this.username)) return pass();

            helper_funcs.contactExists(conversation.correspondent, this.username).then((contact) => {
                contact.thread_count++;
                contact.message_count++;
                contact.last_message_at = helper_funcs.latest(contact.last_message_at, conversation.last_update_at, message.created_utc);
                contact.first_message_at = helper_funcs.earliest(contact.first_message_at, conversation.last_update_at, message.created_utc);
                // Increment the right counter
                if(message.author == this.username) contact.messages_sent_to++;
                else contact.messages_received_from++;

                db.for[this.username]
                    .update(db_tables.contacts, contact)
                    .then(pass, fail);
            }, () => {
                apiObj.registerNewContact.call(this, conversation, message).then(pass, fail);
            });
        });
    };

    apiObj.registerNewContact = function(conversation, message){
        let contact = {
            username: conversation.correspondent,
            thread_count: 1,
            message_count: 1,
            messages_received_from: (message.author == this.username) ? 0 : 1,
            messages_sent_to: (message.author == this.username) ? 1 : 0,
            first_message_at: helper_funcs.earliest(conversation.last_update_at, message.created_utc),
            last_message_at: helper_funcs.latest(conversation.last_update_at, message.created_utc),
            popularity: 3,
            favorite: 0,
            res_user_tag: null,
            reddit_friend: 0,
            block: 0,
        };
        return db.for[this.username].add(db_tables.contacts, contact);
    };

    apiObj.createContact = function(username, favorite = 0, reddit_friend = 0) {
        let contact = {
            username: username,
            message_count: 0,
            messages_sent_to: 0,
            messages_received_from: 0,
            thread_count: 0,
            first_message_at: null,
            last_message_at: null,
            popularity: 0,
            favorite: favorite,
            res_user_tag: null,
            reddit_friend: reddit_friend,
            block: 0
        };
        return db.for[this.username].add(db_tables.contacts, contact);
    };

    // Function to retrieve user profile
    apiObj.getProfile = function(username, start, limit) {
        let where = { correspondent: username, inbox: 1 };
        if(!rir.cfg_get.call(this.username, 'showModmail')) {
            where.modmail = 0;
        }

        return new Promise((pass, fail) => {
            // Get all conversations with this person
            db.for[this.username].get({
                table: db_tables.pm_conversations,
                where: where,
                index: { last_update_at: 'DESC'},
                start: start,
                limit: limit
            })
            .then((inboxResultSet) => {
                // Get contact object
                db.for[this.username].get({
                    table: db_tables.contacts,
                    where: { username: username },
                    start: 0,
                    limit: 1
                })
                .then((contactResultSet) => {
                    pass({
                        user: contactResultSet.results[0],
                        conversations: inboxResultSet.results,
                        numConversations: inboxResultSet.total,
                        start: start
                    });
                }, fail);
            }, fail);
        });

    };

    return apiObj;

})();
