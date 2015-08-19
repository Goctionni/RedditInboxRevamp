function resCompatibility(){
    console.log("RES detected");
    window.addEventListener("neverEndingLoad", function(e) { console.log(e); });
}

function toolboxCompatibility(){
    console.log("Toolbox detected");
}

onExtLoaded('res', resCompatibility);
onExtLoaded('mod-toolbox', toolboxCompatibility);

document.addEventListener("DOMContentLoaded", function() {
    
    
    
    var ori_mail = document.querySelector('#mail');
    var prev_element = ori_mail.previousSibling;
    var parent = ori_mail.parentNode;
    
    var insertNext = function(ele){
        parent.insertBefore(ele, prev_element.nextSibling);
        prev_element = ele;
    };
    
    function createSeparator(){
        var ele = document.createElement('span');
        ele.classList.add('separator');
        ele.innerText = '|';
        return ele;
    }
    
    function createMessageCount(href, messageCount){
        if(typeof messageCount === "undefined") messageCount = "";
        var ele = document.createElement('a');
        ele.classList.add('message-count');
        ele.innerText = messageCount;
        ele.setAttribute('href', href);
        return ele;
    }
    
    function getTime(){
        return new Date().getTime();
    }
    
    function getUnreadMessagesJson(callback){
        var xhr = new XMLHttpRequest();
        xhr.open('GET', '/message/unread.json', true);
        xhr.onreadystatechange = function() {
            if(this.readyState === 4 && this.status === 200) {
                callback(JSON.parse(this.responseText));
            }
        };
        
        xhr.send();
    }
    
    var new_pm = document.createElement('a');
    new_pm.setAttribute('id', 'rir-privatemessages');
    new_pm.setAttribute('href', '/message/rir_inbox');
    var new_pm_count = createMessageCount('/message/rir_inbox');
    
    var new_reply = document.createElement('a');
    new_reply.setAttribute('id', 'rir-mail');
    new_reply.setAttribute('href', '/message/inbox/');
    var new_reply_count = createMessageCount('/message/inbox');
    
    insertNext(new_pm);
    insertNext(new_pm_count);
    insertNext(createSeparator());
    insertNext(new_reply);
    insertNext(new_reply_count);
    
    var lastMessageCount = 0;
    function updateMessageCount(){
        if(ori_mail.classList.contains('nohavemail')) {
            new_pm.classList.remove('rir-havemail');
            new_reply.classList.remove('rir-havemail');
            new_pm_count.innerText = "";
            new_reply_count.innerText = "";
        }
        else {
            // Check at most once per minute
            var curTime = getTime();
            if(curTime - lastMessageCount < (60 * 1000)) return;
            lastMessageCount = curTime;
            
            getUnreadMessagesJson(function(json){
                var numPm = 0;
                var numReply = 0;
                var messages = json.data.children;
                for(var i = 0; i < messages.length; i++) {
                    if(messages[i].kind === "t4") numPm++;
                    if(messages[i].kind === "t1") numReply++;
                }
                
                if(numPm > 0){
                    new_pm.classList.add('rir-havemail');
                    new_pm_count.innerText = numPm;
                }
                if(numReply > 0){
                    new_reply.classList.add('rir-havemail');
                    new_reply_count.innerText = numReply;
                }
            });
        }
    }
    
    setInterval(updateMessageCount, 500);
    updateMessageCount();
    
    // Add RIR class to body element and emit event
    document.querySelector('body').classList.add('rir');
    window.dispatchEvent(new CustomEvent('rir-loaded', {}));
    
});