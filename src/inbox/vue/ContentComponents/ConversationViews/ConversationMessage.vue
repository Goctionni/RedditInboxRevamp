<template>
    <section class="rir-conversation-message" :class="{'message-collapsed': is_collapsed }">
        <header class="message-header" @click="toggleCollapse()">
            <p class="message-title">
                <a :href="'/user/' + author" target="_blank" class="author" v-text="author"></a>
                <span class="message-body-summary" v-text="messageSummary" v-if="is_collapsed"></span>
            </p>
            <time class="message-date" :datetime="created_utc | date-sys" :title="created_utc | date-long">{{ created_utc | date-short }}</time>
            <button class="collapse-toggle"></button>
        </header>
        <div class="message-body" v-html="body_html" v-if="!is_collapsed"></div>
    </section>
</template>

<script>
    export default {
        name: 'ConversationMessage',
        data(){
            return {
                is_collapsed: this.collapsed
            }
        },
        computed: {
            messageSummary() {
                return this.body.substr(0, 300);
            }
        },
        methods: {
            toggleCollapse() {
                this.is_collapsed = !this.is_collapsed;
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
            subject: String,
            collapsed: Boolean
        }
    }
</script>

<style lang="scss" scoped>
    .rir-conversation-message {
        border-top: solid #CCC 1px;
        background-color: #FFF;
        max-width: 995px;
    }
    .message-header {
        height: 40px;
        display: flex;
        padding: 0 10px;
        white-space: nowrap;
        align-items: center;
        width: 100%;
        background-color: #FFF;
        cursor: pointer;
        font-size: 13px;
        .message-collapsed & {
            background-color: #F8F8F8;
        }
    }
    .message-title {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;

        .author {
            font-weight: bold;
            color: #000;
            &:hover {
                text-decoration: underline;
            }
        }
        user-select: none;
    }
    .message-date {
        padding-left: 10px;
    }
    .collapse-toggle {
        position: relative;
        &::after {
            position: absolute;
            display: block;
            content: '';
            width: 5px;
            height: 1px;
            top: 4px;
            left: 2px;
            background-color: #999;
        }
        width: 11px;
        height: 11px;
        margin-left: 10px;
        padding: 0;
        border: solid #999 1px;
        background-color: #FFF;
        box-sizing: border-box;
    }
    .message-collapsed .collapse-toggle {
        &::before {
            position: absolute;
            display: block;
            content: '';
            width: 1px;
            height: 5px;
            top: 2px;
            left: 4px;
            background-color: #999;
        }
    }
    .message-header:hover {
        .collapse-toggle {
            border-color: $orange;
            &::before, &::after {
                background-color: $orange;
            }
        }
    }
    .message-body {
        border-top: solid #EEE 1px;
        padding: 10px 10px 30px;
        color: #F00;
    }
</style>

<style lang="scss">
    .message-body {
        .md {
            font-size: 13px;
        }
    }
</style>