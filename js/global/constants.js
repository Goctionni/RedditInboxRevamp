var ERROR = 1, INFO = 2, DEBUG = 4;
var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

var db_tables = {
    'pm_messages': {
        name: 'pm_messages',
        key: 'id',
        indexes: ['author', 'created_utc', 'first_message_name'],
        columns: ["id", "author", "body", "body_html", "new", "created_utc", "name", "dest", "subject", "first_message_name", "distinguished"]
    },
    'pm_conversations': {
        name: 'pm_conversations',
        key: 'id',
        indexes: ['correspondent', 'last_update_at', 'unread', 'inbox', 'trash', 'saved', 'modmail'],
        columns: ['id', 'correspondent', 'last_update_at', 'unread', 'subject', 'last_message_summary', 'last_message_author', 'inbox', 'trash', 'saved', 'modmail']
    },
    'contacts': {
        name: 'contacts',
        key: 'username',
        indexes: ['favorite', 'reddit_friend', 'block', 'message_count', 'thread_count', 'last_message_at', 'popularity'],
        columns: ['username', 'message_count', 'thread_count', 'last_message_at', 'favorite', 'popularity', 'RES_usertag', 'reddit_friend', 'block']
    }
};

var db_mode = {
    readonly: 'readonly',
    readwrite: 'readwrite',
    versionchange: 'versionchange'
};
