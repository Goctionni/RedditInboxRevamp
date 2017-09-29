var through = require('through2');
var gutil = require('gulp-util');
var postcss = require('postcss');
var postscss = require('postcss-scss');
var PluginError = gutil.PluginError;
var compiler = require('vue-template-compiler');

// consts
const PLUGIN_NAME = 'gulp-vuejs-style';

// plugin level function (dealing with files)
function gulpVuejsStyle() {

    function str2hash(str) {
        let hash = 0, i, chr;
        if (str.length === 0) return hash;
        for (i = 0; i < str.length; i++) {
            chr   = str.charCodeAt(i);
            hash  = ((hash << 5) - hash) + chr;
            hash |= 0;
        }
        return hash;
    };

    function addScopeSelector(style, hash) {
        let scssRoot = postcss.parse(style, { syntax: postscss });
        scssRoot.walkRules((rule) => {
            let newSelector = rule.selector.trim();

            // Remove double spacing
            while(newSelector.indexOf('  ') !== -1){
                newSelector = newSelector.replace('  ', ' ');
            }

            // Split up by comma
            parts = rule.selector.split(',');
            for(let i = 0; i < parts.length; i++) {
                let part = parts[i].trim();
                if(part[part.length - 1] === '&') continue;
                if(part[part.length - 1] === '%') continue;

                // Split by spaces
                let subParts = part.split(' ');
                for(let j = 0; j < subParts.length; j++) {
                    if(subParts[j][0] === '&') continue;
                    if(subParts[j] === '+') continue;
                    if(subParts[j] === '>') continue;
                    subParts[j] += `[data-vc-${hash}]`;
                }
                parts[i] = subParts.join(' ');
            }
            newSelector = parts.join(', ');
            rule.selector = newSelector;
        });
        return scssRoot.toString();
    }

    // creating a stream through which each file will pass
    var stream = through.obj(function(file, enc, cb) {
        if (file.isStream()) {
            this.emit('error', new PluginError(PLUGIN_NAME, 'Streams are not supported!'));
            return cb();
        }

        if (file.isBuffer()) {
            let raw = file.contents.toString(enc);
            let componentDef = compiler.parseComponent(raw, { pad: true });

            const fileName = file.history[0];
            const fileHash = Math.abs(str2hash(fileName)).toString(36);

            if(componentDef.template && componentDef.script) {

                let styleStr = "";
                componentDef.styles.forEach((style) => {
                    let curStyleStr = (style.scoped ? addScopeSelector(style.content, fileHash) : style.content);
                    styleStr += "\r\n" + curStyleStr;
                });
                file.contents = new Buffer(styleStr);
            }
        }

        // make sure the file goes through the next gulp plugin
        this.push(file);

        // tell the stream engine that we are done with this file
        cb();
    });

    // returning the file stream
    return stream;
};

// exporting the plugin main function
module.exports = gulpVuejsStyle;