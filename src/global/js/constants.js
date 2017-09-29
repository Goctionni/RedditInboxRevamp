const ERROR = 1, INFO = 2, DEBUG = 4;

const db_tables = {
    'pm_messages': {
        name: 'pm_messages',
        key: 'id',
        indexes: ['author', 'dest', 'created_utc', 'first_message_name'],
        columns: ["id", "author", "body", "body_html", "new", "created_utc", "name", "dest", "subject", "first_message_name", "distinguished"]
    },
    'pm_conversations': {
        name: 'pm_conversations',
        key: 'id',
        indexes: ['correspondent', 'last_update_at', 'unread', 'inbox', 'trash', 'saved', 'modmail'],
        columns: ['id', 'correspondent', 'last_update_at', 'unread', 'inbox', 'trash', 'saved', 'modmail', 'subject', 'last_message_summary', 'last_message_author']
    },
    'contacts': {
        name: 'contacts',
        key: 'username',
        indexes: ['favorite', 'reddit_friend', 'block', 'messages_received_from', 'messages_sent_to', 'thread_count', 'message_count', 'last_message_at', 'first_message_at', 'popularity'],
        columns: ['username', 'messages_received_from', 'messages_sent_to', 'thread_count', 'message_count', 'first_message_at', 'last_message_at', 'favorite', 'popularity', 'RES_usertag', 'reddit_friend', 'block', 'account_deleted']
    }
};

const db_mode = {
    readonly: 'readonly',
    readwrite: 'readwrite',
    versionchange: 'versionchange'
};

const db_versions = {
    V1: {
        ID: 'V1',
        DB_NAME: "RIR_Messages",
        DB_VERSION: 4
    },
    V2: {
        ID: 'V2',
        DB_NAME: "RIR_Messages_",
        DB_VERSION: 1
    },
};

const TIMESPAN = {
    SECOND: 1000,
    MINUTE: 60000,
    HOUR: 3600000,
    DAY: 86400000,
};

class EnumProp {
    constructor(key, value){
        this.key = key;
        this.value = value;
    }
    toString() {
        return this.value;
    }
}

const OBJ_TYPE = (() => {

    let Comment =           new EnumProp('t1_', 'Comment');
    let Account =           new EnumProp('t2_', 'Account');
    let Link =              new EnumProp('t3_', 'Link');
    let Message =           new EnumProp('t4_', 'Message');
    let Subreddit =         new EnumProp('t5_', 'Subreddit');
    let Award =             new EnumProp('t6_', 'Award');
    let PromoCampaign =     new EnumProp('t7_', 'PromoCampaign');

    let OBJ_TYPE = {
        't1_': Comment, Comment: Comment,
        't2_': Account, Account: Account,
        't3_': Link, Link: Link,
        't4_': Message, Message: Message,
        't5_': Subreddit, Subreddit: Subreddit,
        't6_': Award, Award: Award,
        't7_': PromoCampaign, PromoCampaign: PromoCampaign,
    };
    return OBJ_TYPE;

})();