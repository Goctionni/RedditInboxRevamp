const isDef =       (v) => (typeof v !== "undefined");
const isObj =       (v) => (typeof v === "object" && v !== null);
const isStr =       (v) => (typeof v === "string");
const isNum =       (v) => (typeof v === "number" && !isNaN(v));
const isBool =      (v) => (typeof v === "boolean");
const isFunc =      (v) => (typeof v === "function");
const isArr =       (v) => (isObj(v) && v instanceof Array);

const hashCode =    (v) => {
    var hash = 0;
    if (v.length == 0) return hash;
    for (i = 0; i < v.length; i++) {
        char = v.charCodeAt(i);
        hash = ((hash << 5) - hash)+char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
};

const DOMReady = () => {
    return new Promise((resolve) => {
        if(document.readyState === "interactive" || document.readyState === "complete"){
            return resolve();
        }
        document.addEventListener('readystatechange', (event) => {
            if(event.target.readyState === "interactive" || event.target.readyState === "complete"){
                return resolve();
            }
        });
    });
};

HTMLElement.prototype.clear = function() {
    while(this.firstChild !== null) {
        this.removeChild(this.firstChild);
    }
};