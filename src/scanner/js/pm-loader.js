class PMLoader {
    constructor(maxRetries, retryDelay, requestSize, ascending = true, reference = '') {
        this.maxRetries = maxRetries;
        this.retryDelay = retryDelay;
        this.requestSize = requestSize;
        this.direction = (ascending ? 'before' : 'after');
        this.reference = reference;
        this.attempt = 0;
        this.resultHandlers = [];
    }

    get requestUrl() {
        let url = `/message/messages.json?raw_json=1&limit=${this.requestSize}`;
        if(this.reference !== '') url += `&${this.direction}=${this.reference}`;
        return url;
    }

    sendRequest() {
        return new Promise((resolve, reject) => {
            fetch(this.requestUrl, {
                method: "GET",
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Cache': 'no-cache'
                },
                credentials: 'include'
            }).then(
                resolve,
                (arg) => this.handleRequestReject.bind(this, arg)
            );
        });
    }

    sendNextRequests() {
        return new Promise((resolve, reject) => {
            this.attempt = 0;
            this.sendRequest()
                .then((response) => response.json(), reject)
                .then((json) => {
                    // Handle the JSON
                    this.handleResponseJSON(json);

                    // If no reference is set, we're done
                    if(!isStr(this.reference)) return resolve();
                    // Else, send the next request
                    this.sendNextRequests().then(resolve, reject);
                }, reject);
        });
    }

    handleRequestReject(error) {
        return new Promise((resolve, reject) => {
            // If the maxRetries has been exceeded, simply stop
            if(this.attempt++ >= this.maxRetries) return reject(error);

            // Retry function
            let retry = (() => this.sendRequest().then(resolve, reject));

            // Execute retry after retryDelay
            setTimeout(retry, this.retryDelay * 1000);
        });
    }

    handleResponseJSON(json) {
        // Store the reference
        // if reference is empty no further requests will be needed,
        // if not, use it for the next request
        this.reference = json.data[this.direction];
        const messages = this.extractMessagesFromData(json.data);
        this.resultHandlers.forEach((handler) => handler(messages));
    }

    extractMessagesFromData(json) {
        const messages = [];
        for(let child of json.children){
            // Clean up the data and fix it for our purposes
            const message = this.createMessageFromJSON(child.data);
            messages.push(message);

            // Recursively look for more messages
            if(!child.data.replies) continue;
            let replies = this.extractMessagesFromData(child.data.replies.data);
            messages.push(...replies);
        }
        return messages;
    }

    createMessageFromJSON(data) {
        // Create message object
        const msg = {};

        // Get a basic copy of the columns we need
        for(let column of db_tables.pm_messages.columns) {
            if(!isDef(data[column])) continue;
            msg[column] = data[column];
        }

        // Fill in additional columns or fix empty columns
        if(!msg.author) msg.author = (data.subreddit) ? ('#' + data.subreddit) : '[unknown]';
        if(!msg.first_message_name) msg.first_message_name = msg.name;

        // Remove HTML-encoding if needed
        if(this.isMessageHTMLEncoded(msg)) {
            msg.subject = this.decodeHTML(msg.subject);
            msg.body_html = this.decodeHTML(msg.body_html);
            msg.body = this.decodeHTML(msg.body);
        }

        return msg;
    }

    isMessageHTMLEncoded(msg) {
        return msg.body_html.substring(0, 21) === '&lt;!-- SC_OFF --&gt;';
    }

    decodeHTML(html) {
        const ele = document.createElement('span');
        span.innerHTML = html;
        return span.innerText;
    }

    run() {
        return this.sendNextRequests();
    }

    addResultHandler(func) {
        this.resultHandlers.push(func);
    }
};