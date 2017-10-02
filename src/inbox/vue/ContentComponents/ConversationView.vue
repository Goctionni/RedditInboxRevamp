<template>
    <div class="rir-conversation">
        <div class="rir-loading" v-if="loading"></div>
        <header class="rir-conversation-header">
            <button :class="{'save-toggle': true, saved: saved }" />
            <h2>{{ subject }}</h2>
            <button class="export-thread">Export thread</button>
            <button class="expand-all"></button>
        </header>
        <conversation-message
            v-for="message in messages"
            :key="message.id"
            :author="message.author"
            :body="message.body"
            :body_html="message.body_html"
            :created_utc="message.created_utc"
            :dest="message.dest"
            :distinguished="message.distinguished"
            :first_message_name="message.first_message_name"
            :id="message.id"
            :name="message.name"
            :new="message.new"
            :subject="message.subject"
            :collapsed="message.collapsed"></conversation-message>
    </div>
</template>

<script>
    import ConversationMessage from './ConversationViews/ConversationMessage.vue';

    export default {
        data: () => ({
            loading: true,
            last_message_author: '',
            correspondent: '',
            subject: '',
            last_message_summary: '',
            last_update_at: new Date(),
            inbox: '',
            saved: false,
            trash: false,
            modmail: false,
            unread: false,
            messages: []
        }),
        props: {
            id: String
        },
        computed: {
        },
        methods: {
            getState() {
                return {
                    $el: { scrollTop: this.$el.scrollTop }
                };
            },
            setState(state) {
                //this.$el.scrollTop = state.$el.scrollTop;
            },
            archive() {
                console.error('Not yet implemented');
            },
            restore() {
                console.error('Not yet implemented');
            },
            markRead() {
                console.error('Not yet implemented');
            },
            markUnread() {
                console.error('Not yet implemented');
            },
            toggleSave() {

            },
            exportThread() {

            },
            expandAll() {

            },
            toggleExpandMessage(message) {

            }
        },
        mounted() {
            rir.background.db.privateMessages.getConversation(this.id).then((conversation) => {
                if(conversation.messages && conversation.messages.length) {
                    for(let message of conversation.messages) {
                        message.unread = !!message.unread;
                        message.collapsed = message.unread;
                    }
                    // Sort by created_utc
                    conversation.messages = conversation.messages.sort((a, b) => a.created_utc - b.created_utc);
                }

                this.last_message_author = conversation.last_message_author;
                this.correspondent = conversation.correspondent;
                this.subject = conversation.subject;
                this.last_message_summary = conversation.last_message_summary;
                this.last_update_at = new Date(conversation.last_update_at * 1000);
                this.inbox = !!conversation.inbox;
                this.saved = !!conversation.saved;
                this.trash = !!conversation.trash;
                this.modmail = !!conversation.modmail;
                this.unread = !!conversation.unread;
                this.messages = conversation.messages;
                this.loading = false;
            });
        },
        components: {
            ConversationMessage,
            'conversation-message': ConversationMessage
        }
    };
</script>

<style scoped lang="scss">
    .rir-conversation {
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