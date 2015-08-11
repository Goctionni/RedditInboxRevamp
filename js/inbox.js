log(INFO, "Reddit inbox Revamp loading");

(function($){
    
    rir.templates = {
        inbox_layout: chrome.extension.getURL('template/inbox_layout.html'),
        inbox_message_row: chrome.extension.getURL('template/inbox_message_row.html'),
        contact_row: chrome.extension.getURL('template/contact_row.html'),
        conversation: chrome.extension.getURL('template/conversation.html'),
        private_message: chrome.extension.getURL('template/private_message.html'),
        load_more_messages: chrome.extension.getURL('template/load_more_messages.html'),
        load_more_contacts: chrome.extension.getURL('template/load_more_contacts.html')
    };

    rir.init.funcs.push(rir.functions.DOMReady);
    rir.init.funcs.push(rir.functions.preloadTemplatesReady);

    rir.view = {
        updateContactList: function(conversations){
            var contacts = rir.model.getSortedContactsFromConversations(conversations);
            rir.$e.contacts.find('.rir-contact').remove();
            rir.$e.contacts.find('.rir-load-more').remove();
            rir.view.addContactsToContactList(contacts);
        },
        showConversation: function(conversation){
            // Remove previous contents of main panel
            rir.$e.mainPanel.empty();

            var $conversation = $(rir.templates.conversation);
            $conversation.data('conversation', conversation);
            var $input = $conversation.find('textarea');
            var $submit = $conversation.find('.rir-conversation-reply-btn');
            var $preview = $conversation.find('.rir-conversation-preview');
            var $messageArea = $conversation.find('.rir-private-messages');
            $conversation.find('.rir-expand-all-btn').on('click', function(){
                $messageArea.find('.rir-private-message').removeClass('rir-collapsed');
            });
            $conversation.find('.rir-conversation-title').text(htmlDecode(conversation.subject));

            var numMessages = conversation.messages.length;
            var responseId = null;
            for(var i = 1; i <= numMessages; i++) {
                (function(pm){
                    var $pm = $(replaceAll(rir.templates.private_message, '{author}', pm.author));
                    $pm.find('.rir-pm-body').html(htmlDecode(pm.body_html));
                    $pm.find('.rir-pm-body-short').text(htmlDecode(pm.body));
                    $pm.find('.rir-message-date-string').text(longDateString(pm.created_utc));
                    $pm.find('.rir-pm-header').on('click', function(){
                        $pm.toggleClass('rir-collapsed');
                    });
                    $pm.appendTo($messageArea);

                    if(!pm['new'] && i < numMessages) {
                        $pm.addClass('rir-collapsed');
                    }
                    if(pm.author === conversation.correspondent) {
                        responseId = pm.name;
                    }
                })(conversation.messages[numMessages - i]);
            }
            
            if(!responseId) {
                // You cannot respond unless the other person has said something
                $conversation.find('.rir-conversation-response').remove();
            }
            else {
                $input.on('keyup', function(){
                    $preview.html(rir.markdown.makeHtml($input.val()));
                });
                $submit.on('click', function(){
                    var text = $input.val();
                    if(!text.length) {
                        // This should not be an alert
                        alert('You cannot send empty messages!');
                    }
                    else {
                        $input.attr('disabled', 'disabled');
                        rir.view.showLoading("Message is being sent");
                        $.post('/api/comment', {
                            thing_id: responseId,
                            id: '#commentreply_' + responseId,
                            uh: rir.model.uh,
                            text: text,
                            renderstyle: 'html'
                        }).success(function(){
                            rir_db.indexNewPrivateMessages(rir.view.update);
                        });
                    }
                });
            }

            rir.$e.mainPanel.append($conversation);

            // Hide overlay
            rir.view.hideOverlay();

            // Set conversation status: read
            rir.model.setConversationStatus(conversation, true);
        },
        showInbox: function(conversations){
            // Empty panel
            rir.$e.mainPanel.empty();
            
            // Filter conversations
            var filteredConversations = conversations.slice();
            rir.model.searchFilter(filteredConversations);
            rir.model.directoryFilter(filteredConversations);
            
            // Show conversations
            rir.view.addConversationsToInbox(filteredConversations);

            // Show contacts
            rir.view.updateContactList(conversations);

            // Hide overlay
            rir.view.hideOverlay();        
        },
        update: function(){
            // Init search from URL
            rir.controller.parseUrl();
            rir.view.updateBodyClass();

            if(rir.show === "conversation") {
                // Show this conversation
                rir_db.getConversation(rir.showid, rir.view.showConversation);
                // Update contact list
                rir_db.getAllPMConversations(rir.view.updateContactList);
            }
            if(['inbox', 'saved', 'deleted'].indexOf(rir.show) >= 0) {
                // Fetch all conversations and add them to the inbox view
                rir_db.getAllPMConversations(rir.view.showInbox);
            }
        },
        addMessageInInbox: function(conversation) {
            var unread = conversation['new'],
                id = conversation.id,
                correspondent = conversation.correspondent,
                subject = htmlDecode(conversation.subject),
                message = conversation.text.replace('&amp;', "&").replace('&lt;', "<").replace('&gt;', ">"),
                datetime = conversation.last_update;

            var checkboxId = 'rir_cb_' + id;
            var html = replaceAll(rir.templates.inbox_message_row, "{checkboxid}", checkboxId);
            var $row = $(html).appendTo(rir.$e.mainPanel);

            if(unread) $row.addClass('rir-unread');
            $row.data('conversation', conversation);
            $row.find('.rir-correspondent').text(correspondent);
            $row.find('.rir-subject').text(subject);
            $row.find('.rir-text').text(message);
            $row.find('.rir-datetime').text(dateString(datetime));

            var $checkbox = $row.find('input');
            $checkbox.on('change', function(){
                $row.toggleClass('rir-row-checked');
            });
            $row.on('click', rir.controller.showMessageClick);
            $row.find('.rir-checkbox').on('click', function(e){
                e.stopPropagation();
            });
        },
        updateBodyClass: function(){
            if(['inbox', 'saved', 'deleted'].indexOf(rir.show) < 0) return;
            rir.$e.body.removeClass('rir-show-inbox rir-show-saved rir-show-deleted');
            rir.$e.body.addClass('rir-show-' + rir.show);
        },
        initLayout: function(){
            //  Set page title
            document.title = rir_cfg.pageTitle;
            $('<title>').text(rir_cfg.pageTitle);
            
            // Establish container for saved DOM elements
            rir.$e = { body : $('body'), loading: $('<span class="rir-loading-icon">') };
            // "uh" is used to send messages
            rir.model.uh = rir.$e.body.find('input[name="uh"]').val();
            // If history.pushState has been used, popstate should trigger a view update
            $(window).on('popstate', rir.view.update);

            // Create global container
            rir.$e.content = $('<div class="rir-content">').appendTo($('body > .content'));
            rir.$e.overlay = $('<div class="rir-overlay">').appendTo(rir.$e.body);

            // Load page content
            rir.$e.content.html(rir.templates.inbox_layout);
            rir.$e.mainPanel = $('.rir-main-panel').width(window.innerWidth - 220);
            rir.$e.contacts = $('.rir-contacts');
            rir.$e.search = $('#RirSearchInput');
            rir.$e.searchBtn = $('#RirSearchButton');

            // On window resize, resize the width of the main panel
            $(window).on('resize', function(){
                rir.$e.mainPanel.width(window.innerWidth - 220);
            });

            // Rebind the inbox / saved / deleted buttons
            // So that the entire page wont have to be redownloaded
            rir.$e.content.find('a.rir-link').on('click', function(e){
                var url = $(this).attr('href');
                history.pushState({}, rir_cfg.pageTitle, url);
                rir.$e.search.val('');
                rir.view.update();
                
                e.preventDefault();
            });

            // Bind our searchbar
            rir.$e.searchBtn.on('click', function(){
                rir.controller.search(rir.$e.search.val());
            });
            rir.$e.search.on('keyup', function(e){
                // Should eventually also do something with auto complete or something like that
                if(e.keyCode === 13) rir.controller.search(rir.$e.search.val());
            });

            // If the URL includes a search, place the search in the search bar
            if(rir._get.search) {
                rir.$e.search.val(decodeURIComponent(rir._get.search));
            }
        },
        bindActionButtons: function(){
            $('#RirDelete').on('click', rir.controller.action.delete);
            $('#RirRestore').on('click', rir.controller.action.restore);
            $('#RirSave').on('click', rir.controller.action.save);
            $('#RirUnsave').on('click', rir.controller.action.unsave);
            $('#RirMarkRead').on('click', rir.controller.action.markRead);
            $('#RirMarkUnread').on('click', rir.controller.action.markUnread);
        },
        hideOverlay: function(){
            rir.$e.overlay.off().removeClass('show');
            setTimeout(function(){
                rir.$e.overlay.hide();
            }, 600);
        },
        showLoading: function(message){
            if(message === undefined) message = 'Loading';
            var $element = $('<div class="loading-message">').text(message).prepend(rir.$e.loading.clone()).appendTo(rir.$e.overlay.empty());
            rir.$e.overlay.show().addClass('show');
            return $element;
        },
        showNotification: function(message, duration){
            if(typeof duration === "undefined") duration = 1500;
            if(message === undefined) message = 'Loading';
            $('<div class="notification-message">').text(message).appendTo(rir.$e.overlay.empty());
            rir.$e.overlay.show().addClass('show');
            
            setTimeout(function(){
                rir.view.hideOverlay();
            }, duration);
        },
        addContactToList: function(contact) {
            var html = replaceAll(rir.templates.contact_row, '{username}', contact);
            var $row = $(html).data('user', contact);
            $row.find('.rir-show-messages').on('click', function(e){
                rir.$e.search.val('from:' + contact);
                rir.controller.search('from:' + contact);
                e.preventDefault();
            });
            $row.appendTo(rir.$e.contacts);
        },
        addConversationsToInbox: function(conversations){
            var copy = conversations.slice();
            var conversationsAdded = 0;
            for(var i = 0; i < copy.length; i++) {
                var conversation = copy[i];
                
                // Add message to inbox
                rir.view.addMessageInInbox(conversation);
                
                // If the maximum number of conversations has been added
                if(++conversationsAdded > rir_cfg.maxInitialMessagesShown){
                    // Add load more content element
                    rir.view.addLoadMoreElement(
                        rir.templates['load_more_messages'],
                        rir.$e.mainPanel,
                        rir.view.addConversationsToInbox,
                        copy.splice(i + 1));
                        
                    break;
                }
            }
        },
        addContactsToContactList: function(contacts){
            for(var i = 0; i < contacts.length; i++) {
                var contact = contacts[i];
                rir.view.addContactToList(contact);
                
                if((i + 1) === rir_cfg.maxContacts) {
                    rir.view.addLoadMoreElement(
                        rir.templates['load_more_contacts'],
                        rir.$e.contacts,
                        rir.view.addContactsToContactList,
                        contacts.splice(i + 1)
                        );
                    break;
                }
            }
        },
        addLoadMoreElement: function(html, $container, callback, items){
            var $element = $(html).appendTo($container);
            var scrollCallback = function(){
                if(!isElementInViewport($element)) return;
                $(window).off('scroll', scrollCallback);
                $element.remove();
                callback(items);
            };
            $(window).on('scroll', scrollCallback);
            scrollCallback();
        }
    };
    rir.controller = {
        showMessageClick: function() {
            var conversation = $(this).data('conversation');
            history.pushState({}, rir_cfg.pageTitle, '/message/rir_conversation/' + conversation.id);
            rir.controller.parseUrl();            
            rir.view.showConversation(conversation);
            
            // Scroll to the top
            window.scrollTo(0, 0);
        },
        search: function(query){
            history.pushState({}, rir_cfg.pageTitle, '/message/rir_inbox?search=' + query);
            rir.view.update();
        },
        parseUrl: function(){
            delete rir['showid'];
            var pathParts = location.pathname.split('/');
            if(pathParts[2] === "rir_conversation" && pathParts.length >= 4) {
                rir.show = "conversation";
                rir.showid = pathParts[3];
            }
            else if(pathParts[2] === "rir_saved"){
                rir.show = "saved";
            }
            else if(pathParts[2] === "rir_deleted"){
                rir.show = "deleted";
            }
            else {
                rir.show = "inbox";
            }

            rir._get = parseQueryString(location.search);
            if(rir._get.search) {
                rir._get.searchObj = parseSearchQuery(rir._get.search);
            }
            else if(rir._get.searchObj) {
                delete rir._get['searchObj'];
            }
        },
        action: {
            get conversations(){
                if(rir.show === "conversation") {
                    return [$('.rir-conversation').data('conversation')];
                }
                else if(['inbox', 'saved', 'deleted'].indexOf(rir.show) >= 0) {
                    var conversations = [];
                    var $checked = $('.rir-message-row .rir-checkbox input[type="checkbox"]:checked');
                    $checked.each(function(){
                        var $row = $(this).closest('.rir-message-row');
                        var conversation = $row.data('conversation');
                        conversation.$e = $row;
                        conversations.push(conversation);
                    });
                    return conversations;
                }
            },
            delete: function(){
                var conversations = rir.controller.action.conversations;
                for(var i = 0; i < conversations.length; i++) {
                    var conversation = conversations[i];
                    var id = conversation.id;
                    if(rir_cfg.deleted.indexOf(id) < 0) {
                        rir_cfg.deleted.push(id);
                        if(rir.show !== "deleted") {
                            conversation.$e.slideUp(function(){
                                conversation.$e.remove();
                            });
                        }
                    }
                }
                rir_cfg_save();
                
                if(!conversations.length) return;
                var msg = (conversations.length === 1) ? 'The message was deleted' : 'The messages were deleted';
                rir.view.showNotification(msg);
            },
            restore: function(){
                var conversations = rir.controller.action.conversations;
                for(var i = 0; i < conversations.length; i++) {
                    var conversation = conversations[i];
                    var id = conversation.id;
                    var index = rir_cfg.deleted.indexOf(id);
                    if(index >= 0) {
                        rir_cfg.deleted.splice(id, 1);
                        if(rir.show === "deleted") {
                            conversation.$e.slideUp(function(){
                                conversation.$e.remove();
                            });
                        }
                    }
                }
                rir_cfg_save();
                
                if(!conversations.length) return;
                var msg = (conversations.length === 1) ? 'The message was restored' : 'The messages were restored';
                rir.view.showNotification(msg);
            },
            save: function(){
                var conversations = rir.controller.action.conversations;
                for(var i = 0; i < conversations.length; i++) {
                    var id = conversations[i].id;
                    if(rir_cfg.saved.indexOf(id) < 0) {
                        rir_cfg.saved.push(id);
                    }
                }
                rir_cfg_save();
                
                if(!conversations.length) return;
                var msg = (conversations.length === 1) ? 'The message was saved' : 'The messages were saved';
                rir.view.showNotification(msg);
            },
            unsave: function(){
                var conversations = rir.controller.action.conversations;
                for(var i = 0; i < conversations.length; i++) {
                    var conversation = conversations[i];
                    var id = conversation.id;
                    var index = rir_cfg.saved.indexOf(id);
                    if(index >= 0) {
                        rir_cfg.saved.splice(id, 1);
                        if(rir.show === "saved") {
                            conversation.$e.slideUp(function(){
                                conversation.$e.remove();
                            });
                        }
                    }
                }
                rir_cfg_save();
                
                if(!conversations.length) return;
                var msg = (conversations.length === 1) ? 'The message was unsaved' : 'The messages were unsaved';
                rir.view.showNotification(msg);
            },
            markRead: function(){
                //.rir-unread
                var conversations = rir.controller.action.conversations;
                for(var i = 0; i < conversations.length; i++) {
                    var conversation = conversations[i];
                    conversation.$e.removeClass('rir-unread');
                    delete conversation['$e'];
                    rir.model.setConversationStatus(conversation, true);
                }
                
                if(!conversations.length) return;
                var msg = (conversations.length === 1) ? 'The message was marked read' : 'The messages were marked read';
                rir.view.showNotification(msg);
            },
            markUnread: function(){
                var conversations = rir.controller.action.conversations;
                for(var i = 0; i < conversations.length; i++) {
                    var conversation = conversations[i];
                    conversation.$e.addClass('rir-unread');
                    delete conversation['$e'];
                    rir.model.setConversationStatus(conversation, false);
                }
                
                if(!conversations.length) return;
                var msg = (conversations.length === 1) ? 'The message was marked unread' : 'The messages were marked unread';
                rir.view.showNotification(msg);
            }
        }
    };
    rir.model = {
        setConversationStatus: function(conversation, read) {
            var updated = [];
            for(var i = 0; i < conversation.messages.length; i++) {
                if(conversation.messages[i]['new'] === read) {
                    conversation.messages[i]['new'] = !read;
                    updated.push(conversation.messages[i]);
                }
            }
            rir_db.updateMessages(updated, function(){
                log(DEBUG, "Conversation status updated");
            });
        },
        getSortedContactsFromConversations: function(conversations){
            var contacts = {};
            for(var i = 0; i < conversations.length; i++) {
                var conversation = conversations[i];
                var contact = conversation.correspondent;
                if(!contact) continue;
                if(contact === "[deleted]") continue;
                if(contact[0] === "#") continue;

                if(!contacts[contact]) {
                    contacts[contact] = 0;
                }
                contacts[contact] += 1 + (conversation.messages.length / 3);
            }
            var contactsArr = Object.keys(contacts);
            contactsArr.sort(function(a, b){
                if(contacts[a] > contacts[b]) return -1;
                if(contacts[a] === contacts[b]) return 0;
                if(contacts[a] < contacts[b]) return 1;
            });
            return contactsArr;
        },
        directoryFilter: function(conversations){
            for(var i = 0; i < conversations.length; i++) {
                var conversation = conversations[i];
                
                var saved = (rir_cfg.saved.indexOf(conversation.id) >= 0);
                var deleted = (rir_cfg.deleted.indexOf(conversation.id) >= 0);
                
                if(rir.show === "saved" && !saved
                || rir.show === "deleted" && !deleted
                || rir.show !== "deleted" && deleted) {
                    conversations.splice(i--, 1);
                }
            }
        },
        searchFilter: function(conversations){
            if(!rir._get.searchObj) return;
            for(var i = 0; i < conversations.length; i++) {
                var conversation = conversations[i];
                if(!rir.model.searchMatchCheck(conversation)) {
                    conversations.splice(i--, 1);
                }
            }
        },
        searchMatchCheck: function(conversation){
            var searchObj = rir._get.searchObj;
            if(searchObj.from && conversation.correspondent && searchObj.from.toLowerCase() === conversation.correspondent.toLowerCase()) {
                return true;
            }
            if(searchObj.subject) {
                var subject = conversation.subject.toLowerCase();
                var terms = rir._get.searchObj.subject;
                var termsFound = 0;
                for(var j = 0; j < terms.length; j++) {
                    var term = terms[j].toLowerCase();
                    if(subject.indexOf(term) >= 0) {
                        termsFound++;
                    }
                }
                if(termsFound >= terms.length) {
                    return true;
                }
            }
            if(searchObj.message) {
                var terms = searchObj.subject;
                var termsFound = 0;
                for(var j = 0; j < terms.length; j++) {
                    for(var k = 0; k < conversation.messages.length; k++) {
                        var message = conversation.messages[k].body.toLowerCase();
                        var term = terms[j].toLowerCase();
                        if(message.indexOf(term) >= 0) {
                            termsFound++;
                            break;
                        }
                    }
                }
                if(termsFound >= terms.length) {
                    return true;
                }
            }
            return false;
        }
    };
    rir.markdown = new Markdown.Converter();
    
    rir.init.start();
    rir.init.executeAfter(['DOMReady', 'preloadTemplatesReady'], function(){
        // Don't do anything if it's a 503
        if(document.title.indexOf("Ow!") >= 0) return;
        
        // The DOM is ready and templates have been preloaded
        
        // Parse the URL
        rir.controller.parseUrl();
        
        // Initialize default layout elements
        rir.view.initLayout();
        rir.view.bindActionButtons();
        var $statusText = $('<span>').addClass('rir-loading-status').appendTo(rir.view.showLoading());
        
        rir_db.openDb(getUsername(), function(){
            
            rir_db.setStatusFunction(function(statusMsg){
                if(statusMsg === false) {
                    rir.view.hideOverlay();
                    setTimeout(function(){
                        rir.view.showNotification("The system failed too many times in retrieving messages, please try again at a later time.");
                    }, 1000);
                }
                else $statusText.text(statusMsg);
            });
            
            rir_db.init(function(){
                // When the database is ready, update the view
                rir_db.setStatusFunction(null);
                rir.view.update();
            });
        });
    });
    
})(jQuery);