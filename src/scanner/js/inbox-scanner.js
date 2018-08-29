rir.scanner = {
    init() {
        rir.background.db.init().then(
            rir.scanner.poll,
            (error) => console.error('[RedditInboxRevamp] An error occured trying to initialize the database', error)
        );
    },
    poll() {
        // Since this function gets called periodically, grab a fresh config each time
        rir.background.config.get().then((config) => {
            let elapsed = (Date.now() - config.lastUpdateInbox) / 1000;
            if(elapsed < config.updateInboxInterval) return;

            rir.scanner.run(config).then(
                () => setTimeout(rir.scanner.poll.bind(rir.scanner, config), config.updateInboxInterval * 1000),
                (error) => console.error('[RedditInboxRevamp] An error occurred whilst scanning your inbox for (new) messages', error)
            );
        });
    },
    run(config) {
        return new Promise((resolve, reject) => {
            // If no config is provided, fetch a fresh config and call the run function again
            if(!isObj(config)) {
                return rir.background.config.get()
                    .then(rir.scanner.run, reject)
                    .then(resolve, reject);
            }

            // Immediately update the timer to avoid another window starting the indexer simultaneously
            rir.background.config.set('lastUpdateInbox', Date.now());

            const updateConfigAndResolve = (() => {
                console.log('[RedditInboxRevamp] Successfully scanned inbox for new messages');
                resolve();
            });

            if(!config.pmInboxInitialized) {
                // If we've not yet previously done a full scan of the inbox, do a full scan now
                rir.scanner.indexInbox(config.maxAjaxRetries, config.ajaxRetryDelay, config.inboxRequestSize).then(updateConfigAndResolve, reject);
            }
            else {
                // Otherwise only scan for new messages received since the last messages we've received
                rir.background.db.privateMessages.getLatestMessages(0, config.maxAjaxRetries).then((latestMessages) => {
                    const references = latestMessages.results.map((msg) => msg.name);
                    rir.scanner.updateInbox(config.maxAjaxRetries, config.ajaxRetryDelay, config.inboxRequestSize, references).then(updateConfigAndResolve, reject);
                }, reject);
            }
        });
    },
    resetInbox(){
        return rir.background.db.reset()
            .then(rir.background.config.set('pmInboxInitialized', false))
            .then(rir.background.config.set('lastUpdatePopular', 0))
            .then(rir.background.config.set('lastUpdateFriends', 0))
            .then(rir.background.config.set('lastUpdateBlocked', 0));
    },
    indexInbox(maxRetries, retryDelay, requestSize){
        // Fully scan the whole inbox
        return new Promise((resolve, reject) => {
            // Our loader retrieves all of the messages from Reddit
            const loader = new PMLoader(maxRetries, retryDelay, requestSize, false);

            // After loading messages, we need to add our messages to our database
            // The promiseStack will collect promises created when adding messages to the database
            // Messages loaded are added to our database via the indexMessages callback
            const promiseStack = [];
            loader.addResultHandler(rir.scanner.indexMessages.bind(rir.scanner, promiseStack));

            // Start our loader
            loader.run().then(
                // Once all messages are loaded, wait for all to be added to our database
                // If anything goes wrong, reject our promise
                () => Promise.all(promiseStack).then(() => {
                    rir.background.config.set('pmInboxInitialized', true);
                    resolve();
                }, reject),
                reject
            );
        });
    },
    indexMessages(promiseStack, messages) {
        promiseStack.push(rir.background.db.privateMessages.add(messages));
    },
    updateInbox(maxRetries, retryDelay, requestSize, references) {
        return new Promise((resolve, reject) => {
            // Get a reference-id for our latest message
            let firstReference = references.shift();
            // Create a loader to retrieve messages that we've received since the referenced message
            const loader = new PMLoader(maxRetries, retryDelay, requestSize, true, firstReference);
            // Create a stack for promises created when adding messages to the database
            const promiseStack = [];
            loader.addResultHandler(rir.scanner.indexMessages.bind(rir.scanner, promiseStack));

            loader.run().then(
                // If we retrieve the messages and succesfully add them to our database, resolve
                // If something goes wrong adding them to the database, reject
                () => Promise.all(promiseStack).then(resolve, reject),
                () => {
                    if(references.length > 0) {
                        // If there are references left we haven't tried, move on to the next one
                        rir.scanner.updateInbox(maxRetries, retryDelay, requestSize, references).then(resolve, reject);
                    }
                    else {
                        // If we tried all our references, just give up all hope
                        reject();
                    }
                }
            );
        });
    }
};

DOMReady().then(rir.scanner.init);