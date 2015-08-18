var ERROR = 1, INFO = 2, DEBUG = 4;
var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

var db_tables = {
    'privateMessages': { name: 'privateMessages', key: 'id', indexes: ['author', 'created_utc', 'first_message_name'], "columns": ["id", "author", "body", "body_html", "new", "created_utc", "name", "dest", "subject", "first_message_name", "distinguished"]},
    'commentReply': { name: 'commentReply', key: 'id', indexes: ['author', 'created_utc'], "columns": ["id", "author", "body", "body_html", "new", "created_utc", "name", "context", "link_title", "subreddit", "parent_id", "distinguished"]},
    'postReply': { name: 'postReply', key: 'id', indexes: ['author', 'created_utc'], "columns": ["id", "author", "body", "body_html", "new", "created_utc", "name", "context", "link_title", "subreddit", "parent_id", "distinguished"]}
};

var db_mode = {
    readonly: 'readonly',
    readwrite: 'readwrite',
    versionchange: 'versionchange'
};