/* global db_tables */

(function(undefined){
    
    rir.helper.fixPrivateMessage = function(obj) {
        var msg = getObjAttributes(obj, db_tables.pm_messages.columns);
        if(!msg.author && obj.subreddit) msg.author = '#' + obj.subreddit;
        if(!msg.author) msg.author = "[unknown]";
        if(!msg.first_message_name) msg.first_message_name = msg.name;
        if(isMessageHTMLEncoded(msg)) {
            msg.subject = htmlDecode(msg.subject);
            msg.body_html = htmlDecode(msg.body_html);
            msg.body = htmlDecode(msg.body);
        }
        if(msg.created) delete msg.created;
        return msg;
    };

    function getObjAttributes(obj, attributes) {
        var r = {};
        for(var i = 0; i < attributes.length; i++){
            var attr = attributes[i];
            if(obj[attr] !== undefined) {
                r[attr] = obj[attr];
            }
        }
        return r;
    }

    rir.model.getRedditFriends = function(){
        return new Promise(function(pass, fail){
            // TODO: Support for more than 100 friends (ie: create generic listing traverser)
            var jqPromise = $.get('/prefs/friends.json?limit=100');
            jqPromise.done(function(response){
                var friends = [];
                var friendsRaw = response[0].data.children;
                for(var i = 0; i < friendsRaw.length; i++) {
                    friends.push(friendsRaw[i].name);
                }
                pass(friends);
            });
            jqPromise.fail(function(){
                fail();
            });
        });
    };
    
    rir.model.updateDb = function(success, error) {
        var callback = function(){
            $.get('/message/inbox');
            success();
        };
        
        if(rir.cfg.data.pmInboxInitialized) {
            indexNexPrivateMessages(callback, error);

            // Check to see if reddit_friends has to be updated
            var now = (new Date()).getTime();
            var timeSinceLastFriendsUpdate = now - rir.cfg.data.lastUpdateFriends;
            if(timeSinceLastFriendsUpdate < (1000 * 60 * 60 * 24)) {
                // If this was recent, don't update it
                rir.view.updateContactList();
            }
            else {
                // If it has been longer than 24 hours, update friends
                var friendsPromise = rir.model.getRedditFriends();
                friendsPromise.then(function(friends){
                    rir.proxy(['rir', 'db', 'contacts', 'updateFriends'], [friends], rir.view.updateContactList);
                    rir.cfg.set('lastUpdateFriends', now);
                }, function(){
                    console.error('Failed to fetch reddit_friends');
                });
            }
        }
        else {
            new PMIndexer(function(){
                // When Indexing private messages is done, set initialized to true
                rir.cfg.set('pmInboxInitialized', true);

                // Mark messages in normal reddit inbox as read
                callback();

                // Check to see if reddit_friends has to be updated
                var now = (new Date()).getTime();
                var timeSinceLastFriendsUpdate = now - rir.cfg.data.lastUpdateFriends;
                if(timeSinceLastFriendsUpdate < (1000 * 60 * 60 * 24)) {
                    // If this was recent, don't update it
                    rir.view.updateContactList();
                }
                else {
                    // If it has been longer than 24 hours, update friends
                    var friendsPromise = rir.model.getRedditFriends();
                    friendsPromise.then(function(friends){
                        rir.proxy(['rir', 'db', 'contacts', 'updateFriends'], [friends], rir.view.updateContactList);
                        rir.cfg.set('lastUpdateFriends', now);
                    }, function(){
                        console.error('Failed to fetch reddit_friends');
                    });
                }
            }, error);
        }
    };
    
    function PMIndexer(callback, fail, direction, reference){
        this.callback = callback;
        this.failCallback = fail;
        this.direction = direction;
        this.reference = reference;
        this.forbidden = null;
        this.errorCount = 0;
        this.pageNum = 1;
        this.messagesAdded = 0;
        
        this.request();
    }
    
    PMIndexer.prototype.request = function(){
        var url = '/message/messages.json?raw_json=1&limit=100';
        if(typeof this.direction === "string") {
            url += '&' + this.direction + '=' + this.reference;
        }
        else {
            this.direction = 'after';
        }

        var req = $.ajax({
            url: url,
            context: this
        });
        req.success(this.requestSuccess);
        req.error(this.requestError);
        
        rir.view.showStatus("Indexing messages from page " + (this.pageNum));
    };
    
    PMIndexer.prototype.requestSuccess = function(response){
        var iterationCallback;
        if(response.data[this.direction]){
            this.reference = response.data[this.direction];
            iterationCallback = this.request;
        }
        else {
            iterationCallback = this.callback;
        }

        this.pageNum++;
        var _this = this;
        function messagesAddedCallback(numMessages){
            _this.messagesAdded += numMessages;
            iterationCallback.call(_this);
        }
        addPMDataToDatabase(response, messagesAddedCallback, this);
    };
    
    PMIndexer.prototype.requestError = function(e, textStatus, errorThrown){
        if(errorThrown === "Forbidden" && typeof this.forbidden === "function"){
            this.forbidden();
        }
        else if(++this.errorCount < rir.cfg.data.maxAjaxRetries) {
            var _this = this;
            rir.view.showStatus("An error occured trying to load messages, retrying in " + rir.cfg.data.ajaxRetryDelay + " seconds");
            setTimeout(function(){
                _this.request.call(_this);
            }, rir.cfg.data.ajaxRetryDelay * 1000);
        }
        else if(typeof this.failCallback === "function") {
            this.failCallback();
        }
    };
    
    PMIndexer.prototype.setForbiddenCallback = function(callback){
        this.forbidden = callback;
    };

    function indexNexPrivateMessages(callback, fail) {
        rir.proxy(['rir', 'db', 'privateMessages', 'getLatestMessages'], [0, rir.cfg.data.max403Retries], function(latestMessages){
            var index = 0;
            function tryNext(){
                if(index < latestMessages.results.length) {
                    var indexer = new PMIndexer(callback, fail, 'before', latestMessages.results[index++].name);
                    indexer.setForbiddenCallback(tryNext);
                }
                else {
                    fail("Failed to index new private messages, problem requesting forbidden content");
                }
            }
            tryNext();
        });
    }

    function addPMDataToDatabase(response, callback, context) {
        var messages = extractPrivateMessages(response);
        rir.proxy(['rir', 'db', 'privateMessages', 'add'], [messages], function(numMessagesAdded){
            callback.call(context, numMessagesAdded);
        });
    }

    function extractPrivateMessages(messageObj) {
        var messages = [];
        var children = messageObj.data.children;
        for(var i = 0; i < children.length; i++) {
            var obj = children[i];
            messages.push(dataObjToPrivateMessage(obj));
            if(obj.data.replies) {
                var replies = extractPrivateMessages(obj.data.replies);
                for(var j = 0; j < replies.length; j++) {
                    messages.push(replies[j]);
                }
            }
        }
        return messages;
    }

    function dataObjToPrivateMessage(dataObj){
        var msg = rir.helper.fixPrivateMessage(dataObj.data);
        return msg;
    }
    
    function getCorrespondentFromMsg(msg){
        if(msg.author === getUsername()) {          // Sent by me
            return msg.dest;
        }
        else if(msg.dest === getUsername()){        // Sent to me
            return msg.author;
        }
        else {
            return (msg.author[0] === '#') ? msg.dest : msg.author;
        }
    }

    rir.model.getConversations = function(callback, folder = "inbox"){
        let action = 'get' + folder.substr(0, 1).toUpperCase() + folder.substr(1);
        rir.proxy(['rir', 'db', 'privateMessages', action], [], function(conversations){
            callback(conversations);
        });
    };
    
    rir.model.getConversation = function(name, callback){
        rir.proxy(['rir', 'db', 'privateMessages', 'getConversation'], [name], function(conversation){
            callback(conversation);
        });
    };

})();