<template>
    <div class="rir-folder-contents" @scroll="scrollHandler($event)">
        <div class="rir-loading" v-if="loading"></div>
        <conversation-row v-for="conversation in conversations" :conversation="conversation"></conversation-row>
        <div class="rir-unloaded-conversation-space" :style="{'height': (numUnfetchedRows * 40) + 'px'}"></div>
    </div>
</template>

<script>
    import ConversationRow from './ConversationViews/ConversationRow.vue';

    export default {
        data: () => ({
            loading: true,
            conversations: [],
            totalRows: 0
        }),
        props: [
            'folder'
        ],
        computed: {
            // Number of conversations not yet retrieved from the backend
            numUnfetchedRows() {
                return this.totalRows -  this.conversations.length;
            }
        },
        methods: {
            getState() {
                return {
                    $el: { scrollTop: this.$el.scrollTop }
                };
            },
            setState(state) {
                this.contentLoaded().then(() => {
                    this.$el.scrollTop = state.$el.scrollTop;
                });
            },
            setContentLoaded(success = true, error) {
                if(!this.__contentLoadedPromises) return;
                for(promise of this.__contentLoadedPromises) {
                    if(success) promise.resolve();
                    else promise.reject(error);
                }
            },
            contentLoaded() {
                return new Promise((resolve, reject) => {
                    if(this.__isContentLoaded) return resolve();
                    if(!this.__contentLoadedPromises) this.__contentLoadedPromises = [];
                    this.__contentLoadedPromises.push({ resolve, reject });
                });
            },
            addConversations(conversations) {
                // Add checked attribute to each conversation
                this.conversations.push( ...conversations.map((conversation) => {
                    conversation.checked = false;
                    return conversation;
                }));
            },
            getCheckedConversations(){
                return this.conversations.filter((conversation) => conversation.checked);
            },
            archive() {
                let checked = this.getCheckedConversations();
                checked.forEach((conversation) => {
                    rir.background.db.privateMessages.moveConversationToTrash(conversation.id);
                    conversation.trash = true;
                    conversation.inbox = false;
                    conversation.checked = false;
                });
                this.updateConversationList();
            },
            restore() {
                let checked = this.getCheckedConversations();
                checked.forEach((conversation) => {
                    rir.background.db.privateMessages.restoreConversationFromTrash(conversation.id);
                    conversation.trash = false;
                    conversation.inbox = true;
                    conversation.checked = false;
                });
                this.updateConversationList();
            },
            markRead() {
                let checked = this.getCheckedConversations();
                checked.forEach((conversation) => {
                    rir.background.db.privateMessages.setReadStatusConversation(conversation.id, true);
                    conversation.unread = false;
                    conversation.checked = false;
                });
                this.updateConversationList();
            },
            markUnread() {
                let checked = this.getCheckedConversations();
                checked.forEach((conversation) => {
                    rir.background.db.privateMessages.setReadStatusConversation(conversation.id, false);
                    conversation.unread = true;
                    conversation.checked = false;
                });
                this.updateConversationList();
            },
            updateConversationList() {
                let folder = rir.view.components.baseview.active;
                if(!folder.filter) return [];

                // Remove rows that do not match our filter
                let filters = Object.entries(folder.filter);
                this.conversations = this.conversations.filter((conversation) => {
                    for(let [property, value] of filters) {
                        if(conversation[property] != value) return false;
                    }
                    return true;
                });

            },
            loadMore() {
                this.loading = true;
                return new Promise((resolve, reject) => {
                    rir.background.db.privateMessages.getFolder(this.folder, this.conversations.length)
                        .then((data) => { // Promise Reject
                            console.log(`getFolder('${this.folder}', ${this.conversations.length}) returned:`, data);
                            this.loading = false;
                            this.totalRows = data.total;
                            this.addConversations(data.results);

                            resolve();
                        },  reject);
                });
            },
            scrollHandler(evt) {
                if(this.loading) return;
                const scrollTop = evt.target.scrollTop;
                if(isNum(this.lastScrollTop) && this.lastScrollTop === scrollTop) return;

                // Check if our space for unloaded conversations is in the viewport
                if(!isNum(this.boundingRectBottom)) this.boundingRectBottom = evt.target.getBoundingClientRect().bottom;

                const placeholderTop = this.unloadedContentSpace.getBoundingClientRect().top;

                // If the top is still below the bottom of our container-element, do nothing
                if(placeholderTop > this.boundingRectBottom) return;
                this.loadMore().then(this.scrollHandler.bind(this, evt));
            }
        },
        mounted() {
            this.conversations = [];
            this.unloadedContentSpace = this.$el.querySelector('.rir-unloaded-conversation-space');
            this.loadMore().then(() => {
                Vue.nextTick(this.setContentLoaded.bind(this, true));
            }, (reason) => { // Promise Reject
                this.setContentLoaded(false, reason);
            });
        },
        components: {
            ConversationRow
        }
    };
</script>

<style scoped lang="scss">
    .rir-folder-contents {
        @extend %nice-scrollbar;
        position: relative;
        overflow: auto;
        height: 100%;
        box-sizing: border-box;
    }
    .rir-loading {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 5px;
        overflow: hidden;

        &::before {
            content: '';
            position: absolute;
            left: -10%;
            top: 0;
            height: 100%;
            width: 10%;
            background-color: $orange;
            animation: 2s ease-in-out slide infinite;
        }
    }
</style>