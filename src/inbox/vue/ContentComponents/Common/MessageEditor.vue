<template>
    <div class="rir-conversation-response rir-message-editor">
        <div class="rir-response-titlebar">
            <h3>Response:</h3>
            <div class="rir-comment-tools">
                <button class="rir-ct-bold" title="Bold: Ctrl B"></button>
                <button class="rir-ct-italic" title="Italic: Ctrl I"></button>
                <button class="rir-ct-strike" title="Strike: Ctrl S"></button>
                <button class="rir-ct-super" title="Super: Ctrl +"></button>
                <button class="rir-ct-link" title="Link: Ctrl K"></button>
                <button class="rir-ct-quote" title="Quote: Ctrl >"></button>
                <button class="rir-ct-code" title="Code: Ctrl Space"></button>
                <button class="rir-ct-bullet" title="Unordered list"></button>
                <button class="rir-ct-number" title="Ordered list"></button>
                <button class="rir-ct-table" title="Table"></button>
            </div>
        </div>
        <textarea class="rir-conversation-input rir-message-input"></textarea>
        <div class="rir-response-actions">
            <input type="checkbox" id="RirShowReplyPreview" v-model="showPreview">
            <label for="RirShowReplyPreview">Show preview</label>

            <button class="rir-conversation-reply-btn rir-send-message-btn" @click="send()">Send</button>
        </div>
        <div class="rir-conversation-preview md" v-if="showPreview"></div>
    </div>
</template>

<script>
    export default {
        data: () => ({
            showPreview: true
        }),
        props: [
            'draft'
        ],
        methods: {
            send() {

            }
        },
        mounted() {
        },
        components: {

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