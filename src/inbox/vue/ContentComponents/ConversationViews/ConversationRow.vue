<template>
    <div class="rir-conversation-row" :class="{'rir-unread': conversation.unread}" @click="viewConversation()">
        <div class="rir-checkbox">
            <input type="checkbox" v-model="conversation.checked" :id="'rir-cb-' + conversation.id">
            <label :for="'rir-cb-' + conversation.id" @click.prevent.stop="toggleCheck()"></label>
        </div>
        <div :class="['rir-last-author', lastAuthorClass]"></div>
        <div :class="['rir-save-toggle', conversation.saved ? 'rir-saved' : '']" @click="toggleSave()"></div>
        <div class="rir-correspondent">{{ conversation.correspondent }}</div>
        <div class="rir-subject-text">
            <span class="rir-subject">{{ conversation.subject }}</span>
            <span class="rir-text">{{ lastMessageSummary }}</span>
        </div>
        <div class="rir-datetime">{{ conversation.last_update_at | date-short }}</div>
    </div>
</template>

<script>
    export default {
        name: 'conversation-row',
        data: () => ({
        }),
        computed: {
            lastAuthorClass() {
                return (this.conversation.last_message_author === rir.model.user.username)
                    ? 'rir-last-sent'
                    : 'rir-last-received';
            },
            lastMessageSummary() {
                return this.conversation.last_message_summary
                    .replace('&amp;', "&")
                    .replace('&lt;', "<")
                    .replace('&gt;', ">");
            }
        },
        props: [
            'conversation'
        ],
        methods: {
            toggleCheck() {
                this.conversation.checked = !this.conversation.checked;
            },
            toggleSave(){
                this.conversation.saved = !this.conversation.saved;
                rir.background.db.privateMessages.setSaveStatusConversation(this.conversation.id, this.conversation.saved);
            },
            viewConversation() {
                let targetPath = `${location.pathname}/${this.conversation.id}`.replace('//', '/');
                rir.history.pushState(null, targetPath);
            }
        }
    };
</script>

<style scoped lang="scss">
    .rir-conversation-row {
        display: flex;
        height: 40px;
        align-items: center;
        border-bottom: solid #E5E5E5 1px;
        background-color: #F5F5F5;
        padding: 0 10px;
        cursor: pointer;

        &.rir-unread {
            background-color: #FFF;
        }

        > div {
            white-space: nowrap;
            text-overflow: ellipsis;
            font-size: 13px;
            overflow: hidden;
        }
    }

    .rir-checkbox {
        width: 30px;
        text-align: center;
    }

    .rir-last-author {
        width: 30px;
        text-align: center;

        &::before {
            content: '';
            display: inline-block;
            width: 17px;
            height: 17px;
            background-position-x: -155px;
            background-repeat: no-repeat;
            background-image: url('chrome-extension://__MSG_@@extension_id__/inbox/img/icons.png');
            margin-top: 3px;
        }
        &.rir-last-sent::before {
            background-position-y: -20px;
        }
        &.rir-last-received::before {
            background-position-y: -1px;
            filter: sepia(100%) saturate(3) brightness(0.9);
        }
    }

    .rir-save-toggle {
        width: 30px;
        text-align: center;

        &::before {
            content: "";
            display: inline-block;
            width: 17px;
            height: 17px;
            margin-top: 3px;
            background-image: url('chrome-extension://__MSG_@@extension_id__/inbox/img/icons.png');
            background-position-x: -134px;
            background-position-y: -1px;
            cursor: pointer;
            background-repeat: no-repeat;
            transition: background-position-y 0.5s ease-in-out;
        }

        &.rir-saved::before {
            background-position-y: -20px;
        }
    }

    .rir-correspondent {
        line-height: 40px;
        width: 180px;
        padding-left: 10px;
    }

    .rir-subject-text {
        flex: 1;
        line-height: 40px;
        .rir-text {
            opacity: .7;
        }
    }

    .rir-datetime {
        width:  150px;
        text-align: right;
    }

    .rir-unread {
        .rir-subject, .rir-correspondent {
            font-weight: bold;
        }
    }
</style>