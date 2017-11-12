<template>
    <div class="rir-conversation-response rir-message-editor">
        <div class="rir-response-titlebar">
            <h3>{{ title }}:</h3>
            <div class="rir-comment-tools">
                <button class="rir-ct-bold" title="Bold: Ctrl B" @click="apply('bold')"></button>
                <button class="rir-ct-italic" title="Italic: Ctrl I" @click="apply('italic')"></button>
                <button class="rir-ct-strike" title="Strike: Ctrl S" @click="apply('strike')"></button>
                <button class="rir-ct-super" title="Super: Ctrl +" @click="apply('super')"></button>
                <button class="rir-ct-link" title="Link: Ctrl K" @click="apply('link')"></button>
                <button class="rir-ct-quote" title="Quote: Ctrl >" @click="apply('quote')"></button>
                <button class="rir-ct-code" title="Code: Ctrl Space" @click="apply('code')"></button>
                <button class="rir-ct-bullet" title="Unordered list" @click="apply('bullet-list')"></button>
                <button class="rir-ct-number" title="Ordered list" @click="apply('number-list')"></button>
                <button class="rir-ct-table" title="Table" @click="apply('table')"></button>
            </div>
        </div>
        <textarea class="rir-conversation-input rir-message-input" v-model="message" ref="input"></textarea>
        <div class="rir-response-actions">
            <div class="rir-checkbox">
                <input type="checkbox" id="RirShowReplyPreview" v-model="showPreview" @keydown="handleKeydown($event)">
                <label for="RirShowReplyPreview">Show preview</label>
            </div>

            <button class="rir-send-message-btn" @click="send()">Send</button>
        </div>
        <div class="rir-conversation-preview md" v-if="showPreview"></div>
    </div>
</template>

<script>
    const keyCodes = {
        BACKSPACE: 8,
        TAB: 9,
        ENTER: 13,
        ESCAPE: 27,
        SPACE: 32,
        PAGE_UP: 33,
        PAGE_DOWN: 34,
        END: 35,
        HOME: 36,
        LEFT: 37,
        UP: 38,
        RIGHT: 39,
        DOWN: 40,
        NUMPAD_ENTER: 108,
        COMMA: 188,
        B: 66,
        I: 73,
        S: 83,
        K: 75,
        NUMBER_PLUS: 107,
        PLUS: 187,
        DOT: 190
    };
    export default {
        data() {
            return {
                message: '',
                showPreview: true
            };
        },
        props: {
            draft: String,
            title: {
                type: String,
                default: 'Message'
            }
        },
        methods: {
            send() {
                this.$emit('send', this.message);
            },
            handleKeydown(e) {
                if(e.keyCode === keyCodes.ESCAPE) {
                    this.$refs.input.blur();
                    e.preventDefault();
                }

                // All key-combinations require control pressed
                if (!e.ctrlKey) return;

                if (!e.shiftKey && e.keyCode === keyCodes.B) return this.apply('bold');
                if (!e.shiftKey && e.keyCode === keyCodes.I) return this.apply('italic');
                if (!e.shiftKey && e.keyCode === keyCodes.S) return this.apply('strike');
                if (!e.shiftKey && e.keyCode === keyCodes.NUMPAD_PLUS) return this.apply('super');
                if (e.shiftKey && e.keyCode === keyCodes.PLUS) return this.apply('super');
                if (!e.shiftKey && e.keyCode === keyCodes.K) return this.apply('link');
                if (e.keyCode === keyCodes.DOT) return this.apply('quote');
                if (!e.shiftKey && e.keyCode === keyCodes.SPACE) return this.apply('code');
                if (!e.shiftKey && e.keyCode === keyCodes.ENTER) return this.send();
            },
            getSelectedText() {
                let start = this.$refs.input.selectionStart;
                let end = this.$refs.input.selectionEnd;
                let selectedText = this.message.substring(start, end);

                // markdown doesn't like trailing spaces, trim them
                while(selectedText.length > 0 && selectedText[selectedText.length - 1] === ' ') {
                    selectedText = selectedText.substr(0, selectedText.length - 1);
                }
                return selectedText;
            },
            wrapSelection(prefix, suffix, escape) {
                let scrollTop = this.$refs.input.scrollTop;
                let selectionStart = this.$refs.input.selectionStart;
                let selectionEnd = this.$refs.input.selectionEnd;

                let beforeSelection = this.message.substr(0, selectionStart);
                let selectedText = this.message.substring(selectionStart, selectionEnd);
                let afterSelection = this.message.substr(selectionEnd);

                // trimRight of selectedText
                while(selectedText.length > 0 && selectedText[selectedText.length - 1] === ' ') {
                    selectedText = selectedText.substr(0, selectedText.length - 1);
                    afterSelection = ' ' + afterSelection;
                }

                this.$refs.input.value = beforeSelection + prefix + selectedText + suffix + afterSelection;
                this.$refs.input.selectionStart = beforeSelection.length + prefix.length;
                this.$refs.input.selectionEnd = beforeSelection.length + prefix.length + selectedText.length;
                this.$refs.input.scrollTop = scrollTop;
            },
            replaceSelection(replacement) {
                let scrollTop = this.$refs.input.scrollTop;
                let selectionStart = this.$refs.input.selectionStart;
                let selectionEnd = this.$refs.input.selectionEnd;

                let beforeSelection = this.message.substr(0, selectionStart);
                let afterSelection = this.message.substr(selectionEnd);

                this.$refs.input.value = beforeSelection + replacement + afterSelection;
                this.$refs.input.selectionStart = beforeSelection.length;
                this.$refs.input.selectionEnd = beforeSelection.length + replacement.length;
                this.$refs.input.scrollTop = scrollTop;
            },
            wrapSelectedLines(prefix, suffix){
                let scrollTop = this.$refs.input.scrollTop;
                let selectionStart = this.$refs.input.selectionStart;
                let selectionEnd = this.$refs.input.selectionEnd;

                let beforeSelection = this.message.substr(0, selectionStart);
                let afterSelection = this.message.substr(selectionEnd);

                let startPos = 0;
                let lines = this.message.split('\n');
                for(let i = 0; i < lines.length; i++) {
                    let line = lines[i];
                    let lineStart = startPos;
                    let lineEnd = lineStart + line.length;

                    startPos = lineEnd + 1; // Move the startPos for the next line, account for the \n
                    if (selectionStart > lineEnd && selectionEnd < lineStart) continue;

                    lines[i] = prefix + line + suffix;

                    // Move the offsets
                    let moveStart = 0;
                    let moveEnd = 0;
                    if (lineStart < selectionStart) moveStart += prefix.length;
                    if (lineEnd < selectionStart) moveStart += suffix.length;
                    if (lineStart < selectionEnd) moveEnd += prefix.length;
                    if (lineEnd < selectionEnd) moveEnd += suffix.length;

                    selectionStart += moveStart;
                    selectionEnd += moveEnd;

                    startPos += prefix.length + suffix.length;
                }

                this.$refs.input.value = lines.join('\n');
                this.$refs.input.selectionStart = selectionStart;
                this.$refs.input.selectionEnd = selectionEnd;
                this.$refs.input.scrollTop = scrollTop;
            },
            prefixSelectedWords(prefix) {
                let scrollTop = this.$refs.input.scrollTop;
                let selectionStart = this.$refs.input.selectionStart;
                let selectionEnd = this.$refs.input.selectionEnd;

                let beforeSelection = this.message.substr(0, selectionStart);
                let afterSelection = this.message.substr(selectionEnd);
                let selectedText = this.message.substring(selectionStart, selectionEnd);

                if (selectedText === '') {
                    this.$refs.input.value = beforeSelection + prefix + afterSelection;
                    this.$refs.input.selectionStart = this.$refs.input.selectionEnd = selectionStart + prefix.length;
                    this.$refs.input.scrollTop = scrollTop;
                    return;
                }

                let selectedWords = selectedText.split(' ');
                let selectionModify = 0;
                for (let i = 0; i < selectedWords.length; i++) {
                    let word = selectedWords[i];
                    if (word === '') continue;

                    // If the word contains newlines, we need to add our prefix before each portion following the newline
                    if (word.indexOf('\n') >= 0) {
                        let subwords = word.split('\n');
                        for (let j = 0; j < subwords.length; j++) {
                            if (subwords[j] === '') continue;
                            subwords[j] = prefix + subwords[j];
                            selectionModify += prefix.length;
                        }
                        selectedWords[i] = subwords.join('\n');
                    }
                    // If the word does not contain newlines, simply prefix
                    else {
                        selectedWords[i] = prefix + word;
                        selectionModify += prefix.length;
                    }
                }

                this.message = beforeSelection + selectedWords.join(' ') + afterSelection;
                this.$refs.input.selectionStart = selectionStart;
                this.$refs.input.selectionEnd = selectionEnd;
                this.$refs.input.scrollTop = scrollTop;
            },
            linkSelection() {

            },
            apply(cmd) {
                switch(cmd) {
                    case 'bold':
                        this.wrapSelection('**', '**');
                        break;
                    case 'italic':
                        this.wrapSelection('*', '*');
                        break;
                    case 'strike':
                        this.wrapSelection('~~', '~~');
                        break;
                    case 'super':
                        this.prefixSelectedWords('^');
                        break;
                    case 'link':
                        break;
                    case 'quote':
                        this.wrapSelectedLines('> ', '');
                        break;
                    case 'code':
                        this.wrapSelection('    ', '');
                        break;
                    case 'bullet-list':
                        this.wrapSelectedLines('* ', '');
                        break;
                    case 'number-list':
                        this.wrapSelectedLines('1. ', '');
                        break;
                    case 'table':
                        break;
                }

                this.$refs.input.focus();
            }
        },
        mounted() {
            if (this.draft) this.message = this.draft;
        },
        components: {

        }
    };
</script>

<style scoped lang="scss">
    .rir-message-editor {
        max-width: 995px;
        min-width: 995px;
        @media (max-width: 1230px) {
            max-width: calc(100% - 10px);
            min-width: calc(100% - 10px);
        }
    }
    .rir-response-titlebar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        height: 35px;

        h3 {
            font-size: 18px;
            font-weight: normal;
        }
        .rir-comment-tools {
            button {
                background-color: #FFF;
                width: 32px;
                height: 21px;
                display: inline-block;
                text-indent: 100%;
                border: solid #CCC 1px;
                background-repeat: no-repeat;
                background-image: url('chrome-extension://__MSG_@@extension_id__/inbox/img/commenttools.png');
                overflow: hidden;
                transition: all ease-in-out 0.3s;
                background-position-x: 7px;

                &:hover {
                    background-color: #EEE;
                }

                &.rir-ct-bold { background-position-y: 1px; }
                &.rir-ct-italic { background-position-y: -18px; }
                &.rir-ct-strike { background-position-y: -38px; }
                &.rir-ct-super { background-position-y: -58px; }
                &.rir-ct-link { background-position-y: -78px; }
                &.rir-ct-quote { background-position-y: -99px; }
                &.rir-ct-code { background-position-y: -118px; }
                &.rir-ct-bullet { background-position-y: -138px; }
                &.rir-ct-number { background-position-y: -159px; }
                &.rir-ct-table { background-position-y: -178px; }
            }
        }
    }
    .rir-message-input {
        @extend %nice-scrollbar;
        display: block;
        min-height: 100px;
        min-width: 100%;
        max-width: 100%;
        margin-bottom: 10px;
        background-color: #FFF;
    }
    .rir-response-actions {
        display: flex;
        justify-content: space-between;
        align-items: center;

        .rir-send-message-btn {
            height: 28px;
            width: 100px;
            color: #666;
            background: -webkit-linear-gradient(top, #FAFAFA, #EBEBEB);
            border: solid #ccc 1px;

            &:hover {
                color: #777;
                background: -webkit-linear-gradient(top, #FCFCFC, #F0F0F0);
            }
        }
    }
</style>