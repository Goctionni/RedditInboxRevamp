rir.db.privateMessages = (function(undefined){

    var apiObj = {};
    let db = rir.db;

    apiObj.add = function(message){
        // If this function is used for multiple messages, use the right method
        if(isArr(message)) return apiObj.addAll.call(this, message);

        var _this = this;
        function isModmail(message){
            return (message.first_message_name === message.name
                    && message.distinguished
                    && message.distinguished === "moderator")
                    ? 1 : 0;
        }

        function createConversation(message){
            // Create conversation object
            let conversation = {};
            conversation.id = message.first_message_name;
            conversation.last_update_at = message.created_utc;
            conversation.unread = message.new;
            conversation.subject = message.subject;
            conversation.last_message_summary = message.body.substr(0, 100);
            conversation.last_message_author = message.author;
            conversation.inbox = 1;
            conversation.trash = 0;
            conversation.saved = 0;
            conversation.modmail = isModmail(message);
            conversation.correspondent =
                (message.author === _this.username) ?  message.dest :
                (message.dest === _this.username) ? message.author :
                (message.author[0] === '#') ? message.dest : message.author;

            return new Promise(function(pass, fail){
                // Save new conversation to database, and pass the conversation as argument to callback
                var dbPromise = db.for[_this.username].add(db_tables.pm_conversations, conversation);
                dbPromise.then(function(){
                    pass(conversation);
                }, function(){
                    fail(conversation);
                });
            });
        }
        function updateConversation(conversation, message){
            conversation.unread |= message.new;
            conversation.modmail = isModmail(message);
            if(conversation.last_update_at < message.created_utc) {
                conversation.last_update_at = message.created_utc;
                conversation.last_message_summary = message.body.substr(0, 100);
                conversation.last_message_author = message.author;
            }
            return new Promise(function(pass, fail){
                // Save updated conversation to database, and pass the conversation as argument to callback
                var dbPromise = db.for[_this.username].update(db_tables.pm_conversations, conversation);
                dbPromise.then(function(){
                    pass(conversation);
                }, function(){
                    fail(conversation);
                });
            });
        }

        return new Promise(function(pass, fail){
            var msgAddPromise = db.for[_this.username].add(db_tables.pm_messages, message);
            msgAddPromise.then(function(result){
                // If the message already existed, we do not need to do anything
                if(result == 0) return pass(0);
                var resolvePass = function(){ pass(1);};

                // If this message was new, we have to make sure the conversation exists also
                var threadPromise = db.for[_this.username].get({
                    table: db_tables.pm_conversations,
                    where: { id: message.first_message_name },
                    index: {},
                    start: 0,
                    limit: 1
                });

                threadPromise.then(function(threads){
                    // Check if thread must be created
                    var updatePromise = (threads.results.length === 0)
                        ? createConversation(message)
                        : updateConversation(threads.results[0], message);

                    updatePromise.then(function(conversation){
                        if(threads.results.length === 0){
                            if(!rir.db.contacts.isValidContact(conversation.correspondent)) {
                                return resolvePass();
                            }

                            rir.db.contacts.registerNewConversation.call(_this, conversation).then(resolvePass, fail);
                        }
                        else {
                            rir.db.contacts.registerNewMessage.call(_this, conversation).then(resolvePass, fail);
                        }
                    }, fail);
                }, fail);
            }, fail);
        });
    };

    apiObj.addAll = function(messages) {
        var _this = this;
        return new Promise(function(pass, fail){
            var numAdded = 0;
            var allPromises = [];
            var failed = 0;

            for(let i = 0; i < messages.length; i++) {
                let message = messages[i];
                let msgPromise = apiObj.add.call(_this, message);
                allPromises.push(msgPromise);
                msgPromise.then(function(result){
                    numAdded += result;
                }, function(){
                    failed++;
                });
            }

            Promise.all(allPromises).then(function(){
                if(failed === 0) pass(numAdded);
                else fail({failed: failed, added: numAdded});
            });
        });
    };

    apiObj.getInbox = function(start = 0, limit = 30) {
        var where = { inbox: 1 };
        if(!rir.cfg_get.call(this.username, 'showModmail')) {
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
        if(!rir.cfg_get.call(this.username, 'showModmail')) {
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
        var _this = this;
        return new Promise(function(pass, fail){
            var threadPromise = db.for[_this.username].get({
                table: db_tables.pm_conversations,
                where: { id: name },
                index: {},
                start: 0,
                limit: 1
            });
            threadPromise.then(function(threadResult){
                if(threadResult.results.length === 0) {
                    return fail("Thread could not be found");
                }

                var conversation = threadResult.results[0];
                var messagesPromise = db.for[_this.username].get({
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

    apiObj.moveConversationToTrash = function(name){
        let _this = this;
        return new Promise(function(pass, fail){
            let threadPromise = db.for[_this.username].get({
                table: db_tables.pm_conversations,
                where: { id: name },
                index: {},
                start: 0,
                limit: 1
            });

            threadPromise.then(function(conversations){
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
                db.for[_this.username].update(db_tables.pm_conversations, conversation).then(passWithChange, fail);
            }, fail);
        });
    };

    apiObj.restoreConversationFromTrash = function(name){
        let _this = this;
        return new Promise(function(pass, fail){
            let threadPromise = db.for[_this.username].get({
                table: db_tables.pm_conversations,
                where: { id: name },
                index: {},
                start: 0,
                limit: 1
            });

            threadPromise.then(function(conversations){
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
                db.for[_this.username].update(db_tables.pm_conversations, conversation).then(passWithChange, fail);
            }, fail);
        });
    };

    apiObj.setReadStatusConversation = function(name, status){
        let _this = this;
        return new Promise(function(pass, fail){
            let threadPromise = db.for[_this.username].get({
                table: db_tables.pm_conversations,
                where: { id: name },
                index: {},
                start: 0,
                limit: 1
            });

            threadPromise.then(function(conversations){
                // If conversation does not exist, we're done; but return 0 to indicate that nothing was changed
                if(conversations.results.length === 0) return pass(0);
                let conversation = conversations.results[0];

                let state = !!status ? 0 : 1;

                // If it is already not saved, just return that nothing was changed
                if(conversation.unread === state) return pass(0);

                // Update our conversation object, save it to the database, and send a response that something changed
                conversation.unread = state;
                let passWithChange = function(){
                    pass(1);
                };
                db.for[_this.username].update(db_tables.pm_conversations, conversation).then(passWithChange, fail);
            }, fail);
        });
    };

    apiObj.setSaveStatusConversation = function(name, status){
        let _this = this;
        return new Promise(function(pass, fail){
            let threadPromise = db.for[_this.username].get({
                table: db_tables.pm_conversations,
                where: { id: name },
                index: {},
                start: 0,
                limit: 1
            });

            threadPromise.then(function(conversations){
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
                db.for[_this.username].update(db_tables.pm_conversations, conversation).then(passWithChange, fail);
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
