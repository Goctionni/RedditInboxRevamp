(function(){
    
    function referenceElement(ele){
        return {
            insertAfter: function(insert){
                ele.parentNode.insertBefore(insert, ele.nextSibling);
                return referenceElement(insert);
            }
        };
    }
    
    var res = {
        compatibility: function(){
            res.monitorRESMailcount();
            res.initHtml();
        },
        mailCountUpdates: function(){
            return (document.body.classList.contains('res-v4') || document.body.classList.contains('res-v5'));
        },
        getMailCount: function(){
            if(res.mailCountUpdates()) {
                // This gives us an initial message count, but knowing the message count is useless unless the counter updates
                var stockMailCountElement = document.querySelector('#header .message-count');
                if(stockMailCountElement) {
                    return parseInt(stockMailCountElement.innerText);
                }
                return 0;
            }
            else {
                if(document.querySelector('#NREMail').classList.contains('havemail')){
                    return 1;
                }
                return 0;
            }
        },
        monitorRESMailcount: function(){
            var lastMailcount = res.getMailCount();
            
            function neverEndingPageload(){
                var mailCount = res.getMailCount();
                if(mailCount === 0) {
                    HelpFuncs.updateMailElements({pm: 0, reply: 0});
                }
                else if(mailCount !== lastMailcount) {
                    lastMailcount = mailCount;
                    HelpFuncs.checkMail();
                }
            }
            
            window.addEventListener("neverEndingLoad", neverEndingPageload);
        },
        initHtml: function(){
            var ori_mail = document.querySelector('#NREMail');

            var new_pm = document.createElement('a');
            new_pm.classList.add('rir-privatemessages');
            new_pm.setAttribute('href', '/message/rir_inbox');

            var new_reply = document.createElement('a');
            new_reply.classList.add('rir-mail');
            new_reply.setAttribute('href', '/message/inbox/');

            referenceElement(ori_mail)
                .insertAfter(new_pm)
                .insertAfter(new_reply)

            elements.defaultInboxIcons.push(new_reply);
            elements.rirInboxIcons.push(new_pm);
            
            if(initialMessageCount > 0) {
                HelpFuncs.checkMail();
            }
        }
    };
    
    var toolbox = {
        compatibility: function(){
            toolbox.monitorToolboxMailcount();
            toolbox.initHtml();
        },
        monitorToolboxMailcount: function(){
            var tbMailCount = document.querySelector('#tb-mailCount');
            var lastMailcount = getToolboxMailcount();

            function getToolboxMailcount(){
                return parseInt(tbMailCount.innerText.replace('[', '').replace(']', ''));
            }

            function tbMailCountChanged(){
                var mailCount = getToolboxMailcount();
                if(mailCount > 0) {
                    // tb says there's mail
                    var mailCount = getToolboxMailcount();
                    if(mailCount === lastMailcount) return;
                    lastMailcount = mailCount;
                    HelpFuncs.checkMail();
                }
                else {
                    // tb says there's no mail
                    HelpFuncs.updateMailElements({pm: 0, reply: 0});
                }
            }

            var mutationFilter = {childList: true};
            var observer = new MutationObserver(tbMailCountChanged);
            observer.observe(tbMailCount, mutationFilter);
        },
        initHtml: function(){
            var ori_mail = document.querySelector('#tb-mailCount');

            var new_pm = document.createElement('a');
            new_pm.classList.add('rir-privatemessages');
            new_pm.setAttribute('href', '/message/rir_inbox');
            var new_pm_count = HelpFuncs.createMessageCount('/message/rir_inbox');

            var new_reply = document.createElement('a');
            new_reply.classList.add('rir-mail');
            new_reply.setAttribute('href', '/message/inbox/');
            var new_reply_count = HelpFuncs.createMessageCount('/message/inbox');

            referenceElement(ori_mail.previousSibling)
                .insertAfter(new_pm)
                .insertAfter(new_pm_count)
                .insertAfter(new_reply)
                .insertAfter(new_reply_count);

            elements.defaultInboxIcons.push(new_reply);
            elements.defaultInboxCounts.push(new_reply_count);
            elements.rirInboxIcons.push(new_pm);
            elements.rirInboxCounts.push(new_pm_count);
            
            if(initialMessageCount > 0) {
                HelpFuncs.checkMail();
            }
        }
    };
    
    var HelpFuncs = {
        createSeparator: function(){
            var ele = document.createElement('span');
            ele.classList.add('separator');
            ele.innerText = '|';
            return ele;
        },
        createMessageCount: function(href, messageCount){
            if(typeof messageCount === "undefined") messageCount = "";
            var ele = document.createElement('a');
            ele.classList.add('message-count');
            ele.innerText = messageCount;
            ele.setAttribute('href', href);
            return ele;
        },
        getTime: function(){
            return new Date().getTime();
        },
        getUnreadMessagesJson: function(callback){
            var xhr = new XMLHttpRequest();
            xhr.open('GET', '/message/unread.json', true);
            xhr.onreadystatechange = function() {
                if(this.readyState === 4 && this.status === 200) {
                    var json = JSON.parse(this.responseText);
                    data.lastJsonCache = json;
                    callback(json);
                }
            };

            xhr.send();
        },
        getTypedMessageCount: function(json){
            var numPm = 0;
            var numReply = 0;
            var messages = json.data.children;
            for(var i = 0; i < messages.length; i++) {
                if(messages[i].kind === "t4") numPm++;
                if(messages[i].kind === "t1") numReply++;
            }
            return {pm: numPm, reply: numReply};
        },
        updateMailElements: function(count){
            if(count.pm > 0){
                for(var i = 0; i < elements.rirInboxIcons.length; i++) {
                    elements.rirInboxIcons[i].classList.add('rir-havemail');
                }
                for(var i = 0; i < elements.rirInboxCounts.length; i++) {
                    elements.rirInboxCounts[i].innerText = count.pm;
                }
            }
            else {
                for(var i = 0; i < elements.defaultInboxIcons.length; i++) {
                    elements.defaultInboxIcons[i].classList.remove('rir-havemail');
                }
                for(var i = 0; i < elements.defaultInboxCounts.length; i++) {
                    elements.defaultInboxCounts[i].innerText = '';
                }
            }
            
            if(count.reply > 0){
                for(var i = 0; i < elements.rirInboxIcons.length; i++) {
                    elements.rirInboxIcons[i].classList.add('rir-havemail');
                }
                for(var i = 0; i < elements.rirInboxCounts.length; i++) {
                    elements.rirInboxCounts[i].innerText = count.reply;
                }
            }
            else {
                for(var i = 0; i < elements.defaultInboxIcons.length; i++) {
                    elements.defaultInboxIcons[i].classList.remove('rir-havemail');
                }
                for(var i = 0; i < elements.defaultInboxCounts.length; i++) {
                    elements.defaultInboxCounts[i].innerText = '';
                }
            }
        },
        checkMail: function(){
            var curTime = HelpFuncs.getTime();
            if((curTime - data.lastMailCheck) < 10000){
                if(data.lastJsonCache) {
                    var count = HelpFuncs.getTypedMessageCount(data.lastJsonCache);
                    HelpFuncs.updateMailElements(count);
                }
                return;
            }
            
            data.lastMailCheck = curTime;
            HelpFuncs.getUnreadMessagesJson(function(json){
                var count = HelpFuncs.getTypedMessageCount(json);
                HelpFuncs.updateMailElements(count);
            });
        }
    };
    
    var elements = {
        defaultInboxIcons: [],
        defaultInboxCounts: [],
        rirInboxIcons: [],
        rirInboxCounts: [],
    };
    
    var data = {
        lastMailCheck: 0,
        lastJsonCache: null
    };

    onExtLoaded('res', res.compatibility);
    onExtLoaded('mod-toolbox', toolbox.compatibility);
    
    function initDefaultDOMChanges(){
        var ori_mail = document.querySelector('#mail');
        
        var new_pm = document.createElement('a');
        new_pm.classList.add('rir-privatemessages');
        new_pm.setAttribute('href', '/message/rir_inbox');
        var new_pm_count = HelpFuncs.createMessageCount('/message/rir_inbox');

        var new_reply = document.createElement('a');
        new_reply.classList.add('rir-mail');
        new_reply.setAttribute('href', '/message/inbox/');
        var new_reply_count = HelpFuncs.createMessageCount('/message/inbox');
        
        referenceElement(ori_mail.previousSibling)
            .insertAfter(new_pm)
            .insertAfter(new_pm_count)
            .insertAfter(HelpFuncs.createSeparator())
            .insertAfter(new_reply)
            .insertAfter(new_reply_count);
        
        elements.defaultInboxIcons.push(new_reply);
        elements.defaultInboxCounts.push(new_reply_count);
        elements.rirInboxIcons.push(new_pm);
        elements.rirInboxCounts.push(new_pm_count);
    }
    
    var initialMessageCount = 0;
    document.addEventListener("DOMContentLoaded", function() {
        var originalMessageCountElement = document.querySelector('#header .message-count');
        initDefaultDOMChanges();
        
        if(originalMessageCountElement && originalMessageCountElement.innerText) {
            initialMessageCount = parseInt(originalMessageCountElement.innerText);
            if(initialMessageCount > 0) HelpFuncs.checkMail();
        }
    });
    
})();