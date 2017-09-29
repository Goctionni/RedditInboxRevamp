<template>
    <div class="rir-conversation">
        <div class="rir-loading" v-if="loading"></div>
    </div>
</template>

<script>
    //import ConversationRow from './ConversationViews/ConversationRow.vue';

    export default {
        data: () => ({
            loading: true,
            conversations: [],
            totalRows: 0
        }),
        props: [
            'id'
        ],
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
            }
        },
        mounted() {
            console.log('ConversationView mounted', this.id);
            rir.background.db.privateMessages.getConversation(this.id).then(function(result){
                console.log(result);
                // id
                // last_message_author
                // correspondent
                // subject
                // last_message_summary
                // inbox
                // saved: 0
                // trash: 0
                // last_update_at
                // messages: []
                // modmail: 0
                // unread: false
            });
        },
        components: {
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