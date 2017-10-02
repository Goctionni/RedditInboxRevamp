<template>
    <section :class="{'rir-conversation-message': true, 'message-collapsed': collapsed }">
        <header class="message-header">
            <p class="message-title">
                <a :href="'/user/' + author" target="_blank" class="author" v-text="author"></a>
                <span class="message-body-summary" v-text="getMessageSummary(body)"></span>
            </p>
            <time class="message-date" :datetime="getMessageDateStamp(created_utc)" :title="getMessageDateLong(created_utc)" v-text="getMessageDateShort(created_utc)"></time>
            <button class="collapse-toggle"></button>
        </header>
        <div class="message-body" v-html="body_html"></div>
    </section>
</template>

<script>
    export default {
        name: 'ConversationMessage',
        data: () => ({

        }),
        methods: {
            getMessageSummary(text) {

            },
            getMessageDateShort(timestamp) {

            },
            getMessageDateLong(timestamp) {

            },
            getMessageDateStamp(timestamp) {

            }
        },
        props: {
            author: String,
            body: String,
            body_html: String,
            created_utc: Number,
            dest: String,
            distinguished: Boolean,
            first_message_name: String,
            id: String,
            name: String,
            new: Boolean,
            subject: String,
            collapsed: Boolean
        }
    }
</script>

<style lang="scss" scoped>
</style>