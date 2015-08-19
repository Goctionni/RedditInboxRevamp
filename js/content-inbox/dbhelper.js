(function(undefined){
    
    rir.helper.fixPrivateMessage = function(obj) {
        var msg = getObjAttributes(obj, db_tables.privateMessages.columns);
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

    rir.model.updateDb = function(callback, error) {
        rir.proxy(['rir', 'db', 'countObjectsInStore'], [db_tables.privateMessages.name], function(num){
            if(rir.cfg.data.pmInboxInitialized && num > 10) {
                indexNexPrivateMessages(callback, error);
            }
            else {
                if(typeof localStorage['RIR_CONFIG'] !== "undefined") {
                    var oldConfig = JSON.parse(localStorage['RIR_CONFIG']);
                    if(oldConfig.pmInboxInitialized instanceof Array && oldConfig.pmInboxInitialized.indexOf(getUsername()) >= 0) {
                        rir.view.showStatus("Importing messages from old database to new database");
                        rir.legacy.importOldDb(function(){
                            rir.legacy.db.destroy(getUsername());
                            var index = oldConfig.pmInboxInitialized.indexOf(getUsername());
                            oldConfig.pmInboxInitialized.splice(index, 1);
                            localStorage['RIR_CONFIG'] = JSON.stringify(oldConfig);
                            callback();
                        }, error);
                        return;
                    }
                }
                
                new PMIndexer(function(){
                    rir.cfg.set('pmInboxInitialized', true);
                    callback();
                }, error);
                
            }
        });
    };
    
    rir.legacy = {
        importOldDb: function(callback, error){
            rir.legacy.db.openDb(getUsername(), function(){
                rir.legacy.db.getAll(db_tables.privateMessages.name, 'created_utc', false, function(messages){
                    rir.proxy(['rir', 'db', 'addAll'], [db_tables.privateMessages.name, messages], function(numAdded){
                        rir.cfg.set('pmInboxInitialized', true);
                        rir.model.updateDb(callback, error);
                    });
                });
            });
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
        addPMDataToDatabase(response, iterationCallback, this);
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
        var queryParams = [
            db_tables.privateMessages.name, 'created_utc', true, 0, rir.cfg.data.max403Retries
        ];

        rir.proxy(['rir', 'db', 'get'], queryParams, function(latestMessages){
            var index = 0;
            function tryNext(){
                if(index < latestMessages.length) {
                    var indexer = new PMIndexer(callback, fail, 'before', latestMessages[index++].name);
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
        rir.proxy(['rir', 'db', 'addAll'], [db_tables.privateMessages.name, messages], function(numAdded){
            callback.call(context);
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
    
    rir.model.getConversations = function(callback){
        var queryParams = [db_tables.privateMessages.name, 'created_utc', true, 0, -1];
        rir.proxy(['rir', 'db', 'get'], queryParams, function(messages){
            var conversations = rir.model.getConversationsFromMessages(messages);
            callback(conversations);
        });
    };
    
    rir.model.getConversation = function(name, callback){
        //first_message_name
        var index = {
            key: 'first_message_name',
            value: name
        };
        var queryParams = [db_tables.privateMessages.name, index, true, 0, -1];
        rir.proxy(['rir', 'db', 'get'], queryParams, function(messages){
            var conversations = rir.model.getConversationsFromMessages(messages);
            callback(conversations[0]);
        });
    };
    
    //rir_db.updateMessage bg func
    rir.model.getConversationsFromMessages = function(messages){
        var conversations = {};
        for(var i = 0; i < messages.length; i++) {
            var obj = messages[i];
            if(!conversations[obj.first_message_name]) {
                conversations[obj.first_message_name] = {id: obj.first_message_name, modmail: false, subject: '', last_author: obj.author, messages: [], text: obj.body, 'new': false, last_update: obj.created_utc };
            }
            var conversation = conversations[obj.first_message_name];
            conversation.messages.push(obj);
            conversation.subject = obj.subject;
            
            if(obj.created_utc > conversation.last_update) {
                conversation.last_update = obj.created_utc;
                conversation.last_author = obj.author;
            }
            
            if(obj['new']) conversation['new'] = true;   // If any message is new, then the conversation is new
            
            if(obj.first_message_name === obj.name) {
                // This is the first message in the conversation, try get the correspondent from it
                conversation.correspondent = getCorrespondentFromMsg(obj);
            }
            // If the first message is distinguished as 'moderator' we'll flag it modmail
            if(obj.first_message_name === obj.name && obj.distinguished && obj.distinguished === "moderator") {
                conversation.modmail = true;
            }
        }
        return ObjectValues(conversations);
    };
    
})();