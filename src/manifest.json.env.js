// For each environment
const fs = require('fs');

module.exports = {
    get base() {
        let manifestJson = fs.readFileSync('./src/manifest.json', 'utf8');
        let manifest = JSON.parse(manifestJson);
        return manifest;
    },
    get dev() {
        let manifest = this.base;
        return JSON.stringify(manifest, null, '  ');
    },
    get prod() {
        let manifest = this.base;
        return JSON.stringify(manifest, null, '  ');
    },
    get default() {
        return 'dev';
    }
};