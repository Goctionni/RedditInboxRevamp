rir.commentTools = {
    utils: {
        linkSelection: function (src) {
            // Change this to custom implementation
            var url = prompt('Enter the URL:', '');
            if (url !== null) {
                //escape parens in url
                url = url.replace(/[\(\)]/g, '\\$&');
                rir.commentTools.utils.wrapSelection(src, '[', '](' + url + ')', function (text) {
                    //escape brackets and parens in text
                    text = text.replace(/[\[\]\(\)]/g, '\\$&');
                    return text;
                });
            }
        },
        wrapSelection: function (src, prefix, suffix, escapeFunction) {
            var $input = rir.commentTools.dom.$input(src);
            var input = $input[0];
            
            //record scroll top to restore it later.
            var scrollTop = input.scrollTop;

            //We will restore the selection later, so record the current selection.
            var selectionStart = input.selectionStart;
            var selectionEnd = input.selectionEnd;

            var text = input.value;
            var beforeSelection = text.substring(0, selectionStart);
            var selectedText = text.substring(selectionStart, selectionEnd);
            var afterSelection = text.substring(selectionEnd);

            //Markdown doesn't like it when you tag a word like **this **. The space messes it up. So we'll account for that because Firefox selects the word, and the followign space when you double click a word.
            var trailingSpace = '';
            var cursor = selectedText.length - 1;
            while (cursor > 0 && selectedText[cursor] === ' ') {
                trailingSpace += ' ';
                cursor--;
            }
            selectedText = selectedText.substring(0, cursor + 1);

            if (typeof escapeFunction === 'function') {
                selectedText = escapeFunction(selectedText);
            }

            input.value = beforeSelection + prefix + selectedText + suffix + trailingSpace + afterSelection;

            input.selectionEnd = beforeSelection.length + prefix.length + selectedText.length;
            if (selectionStart === selectionEnd) {
                input.selectionStart = input.selectionEnd;
            } else {
                input.selectionStart = beforeSelection.length + prefix.length;
            }

            input.scrollTop = scrollTop;
        },
        replaceSelection: function (src, replacement) {
            var $input = rir.commentTools.dom.$input(src);
            var input = $input[0];
            
            //record scroll top to restore it later.
            var scrollTop = input.scrollTop;

            //We will restore the selection later, so record the current selection.
            var selectionStart = input.selectionStart;
            var selectionEnd = input.selectionEnd;

            var text = input.value;
            var beforeSelection = text.substring(0, selectionStart);
            var afterSelection = text.substring(selectionEnd);


            input.value = beforeSelection + replacement + afterSelection;

            input.selectionEnd = beforeSelection.length + replacement.length;

            input.scrollTop = scrollTop;
        },
        wrapSelectedLines: function (src, prefix, suffix) {
            var $input = rir.commentTools.dom.$input(src);
            var input = $input[0];
            
            var scrollTop = input.scrollTop;
            var selectionStart = input.selectionStart;
            var selectionEnd = input.selectionEnd;

            var text = input.value;
            var startPosition = 0;
            var lines = text.split('\n');
            for (var i = 0; i < lines.length; i++) {
                var lineStart = startPosition;
                var lineEnd = lineStart + lines[i].length;
                //Check if either end of the line is within the selection
                if (
                        selectionStart <= lineStart && lineStart <= selectionEnd ||
                        selectionStart <= lineEnd && lineEnd <= selectionEnd ||
                        lineStart <= selectionStart && selectionStart <= lineEnd ||
                        lineStart <= selectionEnd && selectionEnd <= lineEnd) {
                    
                    lines[i] = prefix + lines[i] + suffix;
                    
                    //Move the offsets separately so we don't throw off detection for the other end
                    var startMovement = 0, endMovement = 0;
                    if (lineStart < selectionStart) {
                        startMovement += prefix.length;
                    }
                    if (lineEnd < selectionStart) {
                        startMovement += suffix.length;
                    }
                    if (lineStart < selectionEnd) {
                        endMovement += prefix.length;
                    }
                    if (lineEnd < selectionEnd) {
                        endMovement += suffix.length;
                    }

                    selectionStart += startMovement;
                    selectionEnd += endMovement;
                    lineStart += prefix.length;
                    lineEnd += prefix.length + suffix.length;
                }
                //Remember the newline
                startPosition = lineEnd + 1;
            }

            input.value = lines.join('\n');
            input.selectionStart = selectionStart;
            input.selectionEnd = selectionEnd;
            input.scrollTop = scrollTop;
        },
        wrapSelectedWords: function (src, prefix) {
            var $input = rir.commentTools.dom.$input(src);
            var input = $input[0];
            
            var scrollTop = input.scrollTop;
            var selectionStart = input.selectionStart;
            var selectionEnd = input.selectionEnd;

            var text = input.value;
            var beforeSelection = text.substring(0, selectionStart);
            var selectedWords = text.substring(selectionStart, selectionEnd).split(' ');
            var afterSelection = text.substring(selectionEnd);

            var selectionModify = 0;

            for (var i = 0; i < selectedWords.length; i++) {
                if (selectedWords[i] !== '') {
                    if (selectedWords[i].indexOf('\n') !== -1) {
                        var newLinePosition = selectedWords[i].lastIndexOf('\n') + 1;
                        selectedWords[i] = selectedWords[i].substring(0, newLinePosition) + prefix + selectedWords[i].substring(newLinePosition);
                        selectionModify += prefix.length;
                    }
                    if (selectedWords[i].charAt(0) !== '\n') {
                        selectedWords[i] = prefix + selectedWords[i];
                    }
                    selectionModify += prefix.length;
                }
                // If nothing is selected, stick the prefix in there and move the cursor to the right side.
                else if (selectedWords[i] === '' && selectedWords.length === 1) {
                    selectedWords[i] = prefix + selectedWords[i];
                    selectionModify += prefix.length;
                    selectionStart += prefix.length;
                }
            }

            input.value = beforeSelection + selectedWords.join(' ') + afterSelection;
            input.selectionStart = selectionStart;
            input.selectionEnd = selectionEnd + selectionModify;
            input.scrollTop = scrollTop;
        },
        updateCounter: function(src){
            console.error("Char counter not implemented");
        }
    },
    dom: {
        $tools: function(ele){
            return $(ele).closest('.rir-message-editor').find('.rir-comment-tools');
        },
        $input: function(ele){
            return $(ele).closest('.rir-message-editor').find('textarea.rir-conversation-input');
        },
        $submit: function(ele){
            return $(ele).closest('.rir-message-editor').find('button.rir-conversation-reply-btn');
        }
    },
    get actions() {
        setTimeout(function(){
            // Update counter!
        }, 10);
        
        return {
            bold: function(e){
                rir.commentTools.utils.wrapSelection(this, '**', '**');
                e.preventDefault();
            },
            italic: function(e){
                rir.commentTools.utils.wrapSelection(this, '*', '*');
                e.preventDefault();
            },
            strike: function(e){
                rir.commentTools.utils.wrapSelection(this, '~~', '~~');
                e.preventDefault();
            },
            super: function(e){
                rir.commentTools.utils.wrapSelectedWords(this, '^');
                e.preventDefault();
            },
            link: function(e){
                rir.commentTools.utils.linkSelection(this);
                e.preventDefault();
            },
            quote: function(e){
                rir.commentTools.utils.wrapSelectedLines(this, '> ', '');
                e.preventDefault();
            },
            code: function(e){
                rir.commentTools.utils.wrapSelectedLines(this, '    ', '');
                e.preventDefault();
            },
            bullet: function(e){
                rir.commentTools.utils.wrapSelectedLines(this, '* ', '');
                e.preventDefault();
            },
            number: function(e){
                rir.commentTools.utils.wrapSelectedLines(this, '1. ', '');
                e.preventDefault();
            },
            table: function(e){
                console.error('Fuck this for now');
            }
        };
    },
    keyCodes: {
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
        COMMA: 188
    },
    init: function($tools, $input){
        rir.commentTools.addToolClickCallbacks($tools, $input);
        rir.commentTools.addKeydownCallback($input);
    },
    addToolClickCallbacks: function($tools, $input){
        $tools.find('.rir-ct-bold').on('click', rir.commentTools.actions.bold);
        $tools.find('.rir-ct-italic').on('click', rir.commentTools.actions.italic);
        $tools.find('.rir-ct-strike').on('click', rir.commentTools.actions.strike);
        $tools.find('.rir-ct-super').on('click', rir.commentTools.actions.super);
        $tools.find('.rir-ct-link').on('click', rir.commentTools.actions.link);
        $tools.find('.rir-ct-quote').on('click', rir.commentTools.actions.quote);
        $tools.find('.rir-ct-code').on('click', rir.commentTools.actions.code);
        $tools.find('.rir-ct-bullet').on('click', rir.commentTools.actions.bullet);
        $tools.find('.rir-ct-number').on('click', rir.commentTools.actions.number);
        $tools.find('.rir-ct-table').on('click', rir.commentTools.actions.table);
        
        $tools.find('button').on('click', function(){
            $input.keyup().focus();
        });
    },
    addKeydownCallback: function($input){
        $input.on('keydown', function(e){
            if(e.keyCode === rir.commentTools.keyCodes.ESCAPE) {
                $input.blur();
                e.preventDefault();
                return;
            }
            
            // bold         ctrl b
            if(e.ctrlKey && !e.shiftKey && e.keyCode === 66)
                rir.commentTools.actions.bold.call(this, e);
            
            // italic       ctrl i
            if(e.ctrlKey && !e.shiftKey && e.keyCode === 73)
                rir.commentTools.actions.italic.call(this, e);
            
            // strike       ctrl s
            if(e.ctrlKey && !e.shiftKey && e.keyCode === 83)
                rir.commentTools.actions.strike.call(this, e);
            
            // super        ctrl np+        ctrl shift =
            if(e.ctrlKey && !e.shiftKey && e.keyCode === 107
            || e.ctrlKey && e.shiftKey && e.keyCode === 187)
                rir.commentTools.actions.super.call(this, e);
            
            // link         ctrl k
            if(e.ctrlKey && !e.shiftKey && e.keyCode === 75)
                rir.commentTools.actions.link.call(this, e);
            
            // quote        ctrl .          ctrl shift .
            if(e.ctrlKey && e.keyCode === 190)
                rir.commentTools.actions.quote.call(this, e);
            
            // code         ctrl space
            if(e.ctrlKey && !e.shiftKey && e.keyCode === 32)
                rir.commentTools.actions.code.call(this, e);
            
            // submit       ctrl enter
            if(e.ctrlKey && !e.shiftKey && e.keyCode === 13)
                rir.commentTools.dom.$submit(this).click();
        });
    }
};