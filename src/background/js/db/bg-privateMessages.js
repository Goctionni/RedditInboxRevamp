rir.db.privateMessages = (function(undefined){

    let apiObj = {};
    let db = rir.db;

    const helper_funcs = {
        createConversation: (message, username) => {
            // Create conversation object
            let conversation = {};
            conversation.id = message.first_message_name;
            conversation.last_update_at = message.created_utc;
            conversation.unread = message.new;
            conversation.subject = message.subject;
            conversation.last_message_summary = message.body.substr(0, 250);
            conversation.last_message_author = message.author;
            conversation.inbox = 1;
            conversation.trash = 0;
            conversation.saved = 0;
            conversation.modmail = helper_funcs.isModmail(message);
            conversation.correspondent =
                (message.author === username) ? message.dest :
                (message.dest === username) ? message.author :
                (message.author[0] === '#') ? message.dest : message.author;

            return new Promise((pass, fail) => {
                // Save new conversation to database, and pass the conversation as argument to callback
                let dbPromise = db.for[username].add(db_tables.pm_conversations, conversation);
                dbPromise.then(() => {
                    rir.db.contacts.registerNewConversation.call({ username }, conversation, message).then(pass, fail);
                }, () => {
                    fail(conversation);
                });
            });
        },
        updateConversation: (conversation, message, username) => {
            conversation.unread |= message.new;
            conversation.modmail = helper_funcs.isModmail(message);
            if(conversation.last_update_at < message.created_utc) {
                conversation.last_update_at = message.created_utc;
                conversation.last_message_summary = message.body.substr(0, 100);
                conversation.last_message_author = message.author;
            }

            return new Promise((pass, fail) => {
                // Save updated conversation to database, and pass the conversation as argument to callback
                var dbPromise = db.for[username].update(db_tables.pm_conversations, conversation);
                dbPromise.then(() => {
                    rir.db.contacts.registerNewMessage.call({ username }, conversation, message).then(pass, fail);
                }, function(){
                    fail(conversation);
                });
            });
        },
        isModmail: (message) => {
            return (message.first_message_name === message.name
                && message.distinguished
                && message.distinguished === "moderator")
                ? 1 : 0;
        },
        conversationExists: (id, username) => {
            return new Promise((yes, no) => {
                let conversationPromise = db.for[username].get({
                    table: db_tables.pm_conversations,
                    where: { id: id },
                    index: {},
                    start: 0,
                    limit: 1
                });
                conversationPromise.then((threads) => {
                    threads.results.length ? yes(threads.results[0]) : no();
                }, () => {
                    console.warn('Failed to check if conversation exists', id);
                    no();
                });
            });
        },
    };

    apiObj.add = function(message){
        // If this function is used for multiple messages, use the right method
        if(isArr(message)) return apiObj.addAll.call(this, message);

        return new Promise((pass, fail) => {
            var msgAddPromise = db.for[this.username].add(db_tables.pm_messages, message);
            msgAddPromise.then((result) => {
                // If the message already existed, we do not need to do anything
                if(result == 0) return pass(0);
                var resolvePass = function(){ pass(1);};


                // Check if conversation object stored in database. If so; update it, otherwise create it
                helper_funcs.conversationExists(message.first_message_name, this.username).then((conversation) => {
                    helper_funcs.updateConversation(conversation, message, this.username).then(resolvePass, fail);
                }, () => {
                    helper_funcs.createConversation(message, this.username).then(resolvePass, fail);
                });
            }, fail);
        });
    };

    apiObj.addAll = function(messages) {
        return new Promise((resolve, reject) => {

            // Send the first message from our array
            const firstMessage = messages.shift();
            apiObj.add.call(this, firstMessage).then((msgAdded) => {
                // If there are no more messages to send, we're done
                if(messages.length === 0) return resolve(msgAdded);

                // Otherwise, send the rest of the messages
                apiObj.addAll.call(this, messages).then(
                    (restMessagesAdded) => resolve(msgAdded + restMessagesAdded),
                    reject
                );
            }, reject);
        });
    };

    apiObj.getFolder = function(folder, start = 0, limit = 30) {
        switch(folder) {
            case 'inbox': return apiObj.getInbox.call(this, start, limit);
            case 'saved': return apiObj.getSaved.call(this, start, limit);
            case 'archived': return apiObj.getTrash.call(this, start, limit);
            default:
                throw { 'message': 'Invalid folder requested', folder };
        }
    };

    apiObj.getInbox = function(start = 0, limit = 30) {
        var where = { inbox: 1 };
        if(!rir.config.get.call(this, 'showModmail')) {
            where.modmail = 0;
        }
        return db.for[this.username].get({
            table: db_tables.pm_conversations,
            where: where,
            index: { last_update_at: 'DESC'},
            start: start,
            limit: limit
        });
    };
    apiObj.getSaved = function(start = 0, limit = 30) {
        return db.for[this.username].get({
            table: db_tables.pm_conversations,
            where: { saved: 1 },
            index: { last_update_at: 'DESC'},
            start: start,
            limit: limit
        });
    };
    apiObj.getTrash = function(start = 0, limit = 30) {
        var where = { trash: 1 };
        if(!rir.config.get.call(this, 'showModmail')) {
            where.modmail = 0;
        }
        return db.for[this.username].get({
            table: db_tables.pm_conversations,
            where: where,
            index: { last_update_at: 'DESC'},
            start: start,
            limit: limit
        });
    };

    apiObj.getConversation = function(name){
        return new Promise((pass, fail) => {
            var threadPromise = db.for[this.username].get({
                table: db_tables.pm_conversations,
                where: { id: name },
                index: {},
                start: 0,
                limit: 1
            });
            threadPromise.then((threadResult) => {
                if(threadResult.results.length === 0) {
                    return fail("Thread could not be found");
                }

                var conversation = threadResult.results[0];
                var messagesPromise = db.for[this.username].get({
                    table: db_tables.pm_messages,
                    where: { first_message_name: name },
                    index: { created_utc: 'ASC' },
                    start: 0,
                    limit: -1
                });

                messagesPromise.then(function(msgResult){
                    if(msgResult.results.length === 0) {
                        return fail("Thread could not be found");
                    }

                    conversation.messages = msgResult.results;
                    pass(conversation);
                }, fail);
            }, fail);

        });
    };
    apiObj.getLatestMessages = function(start = 0, limit = 30) {
        return db.for[this.username].get({
            table: db_tables.pm_messages,
            where: { },
            index: { created_utc: 'DESC'},
            start: start,
            limit: limit
        });
    };

    apiObj.getLastMessageFrom = function(author) {
        return db.for[this.username].get({
            table: db_tables.pm_messages,
            where: { author: author, dest: this.username },
            index: { created_utc: 'DESC'},
            start: 0,
            limit: 1
        });
    };

    apiObj.moveConversationToTrash = function(name){
        return new Promise((pass, fail) => {
            let threadPromise = db.for[this.username].get({
                table: db_tables.pm_conversations,
                where: { id: name },
                index: {},
                start: 0,
                limit: 1
            });

            threadPromise.then((conversations) => {
                // If conversation does not exist, we're done; but return 0 to indicate that nothing was changed
                if(conversations.results.length === 0) return pass(0);
                let conversation = conversations.results[0];

                // If the conversation exists, but it is already trashed, indicate that nothing was changed in result
                if(conversation.inbox === 0 && conversation.trash === 1) return pass(0);

                // Update our conversation object, save it to the database, and send a response that something changed
                conversation.inbox = 0;
                conversation.trash = 1;
                let passWithChange = function(){
                    pass(1);
                };
                db.for[this.username].update(db_tables.pm_conversations, conversation).then(passWithChange, fail);
            }, fail);
        });
    };

    apiObj.restoreConversationFromTrash = function(name){
        return new Promise((pass, fail) => {
            let threadPromise = db.for[this.username].get({
                table: db_tables.pm_conversations,
                where: { id: name },
                index: {},
                start: 0,
                limit: 1
            });

            threadPromise.then((conversations) => {
                // If conversation does not exist, we're done; but return 0 to indicate that nothing was changed
                if(conversations.results.length === 0) return pass(0);
                let conversation = conversations.results[0];

                // If the conversation exists, but it is not trashed, indicate that nothing was changed in result
                if(conversation.inbox === 1 && conversation.trash === 0) return pass(0);

                // Update our conversation object, save it to the database, and send a response that something changed
                conversation.inbox = 1;
                conversation.trash = 0;
                let passWithChange = function(){
                    pass(1);
                };
                db.for[this.username].update(db_tables.pm_conversations, conversation).then(passWithChange, fail);
            }, fail);
        });
    };

    apiObj.setReadStatusConversation = function(id, value){
        return new Promise((pass, fail) => {
            let threadPromise = db.for[this.username].get({
                table: db_tables.pm_conversations,
                where: { id: id },
                index: {},
                start: 0,
                limit: 1
            });

            threadPromise.then((conversations) => {
                // If conversation does not exist, we're done; but return 0 to indicate that nothing was changed
                if(conversations.results.length === 0) return pass(0);
                let conversation = conversations.results[0];

                // If it is already not saved, return that nothing was changed
                let state = value ? 0 : 1;
                if(conversation.unread === state) return pass(0);

                // Update our conversation object, save it to the database, and send a response that something changed
                conversation.unread = state;
                db.for[this.username].update(db_tables.pm_conversations, conversation).then(() => { pass(1); }, fail);
            }, fail);
        });
    };

    apiObj.setSaveStatusConversation = function(id, status){
        return new Promise((pass, fail) => {
            let threadPromise = db.for[this.username].get({
                table: db_tables.pm_conversations,
                where: { id: id },
                index: {},
                start: 0,
                limit: 1
            });

            threadPromise.then((conversations) => {
                // If conversation does not exist, we're done; but return 0 to indicate that nothing was changed
                if(conversations.results.length === 0) return pass(0);
                let conversation = conversations.results[0];

                let state = !!status ? 1 : 0;

                // If it is already not saved, just return that nothing was changed
                if(conversation.saved === state) return pass(0);

                // Update our conversation object, save it to the database, and send a response that something changed
                conversation.saved = state;
                let passWithChange = function(){
                    pass(1);
                };
                db.for[this.username].update(db_tables.pm_conversations, conversation).then(passWithChange, fail);
            }, fail);
        });
    };

    apiObj.saveConversation = function(name){
        return apiObj.setSaveStatusConversation.call(this, name, 1);
    };

    apiObj.unsaveConversation = function(name){
        return apiObj.setSaveStatusConversation.call(this, name, 0);
    };


    return apiObj;

})();
