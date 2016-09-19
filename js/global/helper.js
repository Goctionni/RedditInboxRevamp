function isDef(v){
    return (typeof v !== "undefined");
}

function isObj(v){
    return (typeof v === "object" && v !== null);
}

function isStr(v){
    return (typeof v === "string");
}

function isNum(v){
    return (typeof v === "number" && !isNaN(v));
}

function isBool(v){
    return (typeof v === "boolean");
}

function isArr(v){
    return (isObj(v) && v instanceof Array);
}
