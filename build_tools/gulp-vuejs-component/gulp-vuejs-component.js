var through = require('through2');
var gutil = require('gulp-util');
var PluginError = gutil.PluginError;
var htmlparser = require('posthtml-parser');
var htmlrender = require('posthtml-render');
var compiler = require('vue-template-compiler');
var es2015compiler = require('vue-template-es2015-compiler');

// consts
const PLUGIN_NAME = 'gulp-vuejs-component';

// plugin level function (dealing with files)
function gulpVuejsComponent() {

    function str2hash(str) {
        let hash = 0, i, chr;
        if (str.length === 0) return hash;
        for (i = 0; i < str.length; i++) {
            chr   = str.charCodeAt(i);
            hash  = ((hash << 5) - hash) + chr;
            hash |= 0;
        }
        return hash;
    }

    const excludedElements = ['br'];
    function addAttributesToElements(htmlTree, attributes) {
        for(let i = 0; i < htmlTree.length; i++) {
            const el = htmlTree[i];
            if(typeof el !== "object") continue;
            if(excludedElements.indexOf(el.tag) !== -1) continue;

            if(typeof el.attrs !== "object") el.attrs = {};
            for(var k in attributes) {
                el.attrs[k] = attributes[k];
            }

            if(typeof el.content === "object") {
                addAttributesToElements(el.content, attributes);
            }
        }
    }

    function scopeTemplateHTML(templateHTML, filename) {
        const scopeAttributes = {};
        const fileHash = Math.abs(str2hash(filename)).toString(36);
        scopeAttributes['data-vc-' + fileHash] = '';

        const htmlTree = htmlparser(templateHTML);
        addAttributesToElements(htmlTree, scopeAttributes);
        return htmlrender(htmlTree);
    }

    function getScript(componentDef, filename) {
        // Get template, scope it if needed
        let templateHTML = componentDef.template.content;
        let hasScopedStyle = componentDef.styles.some((style) => style.scoped);
        if(hasScopedStyle) templateHTML = scopeTemplateHTML(templateHTML, filename);

        let compiled = compiler.compile(templateHTML);
        //let funcs = [ ... new Set(compiled.render.match(/_[a-z]\(/gi))];
        // This will remove the with(this) from the render func
        let renderFunc = es2015compiler('function render(){ ' + compiled.render + '}');

        let componentStartString = 'export default {';
        let componentStart = componentDef.script.content.indexOf(componentStartString);
        let script = componentDef.script.content.substr(0, componentStart + componentStartString.length);
        script += "\n        render: " + renderFunc + ",";
        script += "\n        staticRenderFns: [" + compiled.staticRenderFns.join(',') + "],";
        script += componentDef.script.content.substr(componentStart + componentStartString.length);

        return script
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
            if(componentDef.template && componentDef.script) {
                const filename = file.history[0];
                let script = getScript(componentDef, filename);
                file.contents = new Buffer(script);
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
module.exports = gulpVuejsComponent;