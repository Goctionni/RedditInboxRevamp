export const viewModel = {
    folder: {
        folders: [
            { title: 'Inbox', name: 'inbox', pageTitle: 'reddit.com: Revamped inbox', route: '/rir/inbox', filter: { 'trash': false } },
            { title: 'Saved', name: 'saved', pageTitle: 'reddit.com: Revamped inbox', route: '/rir/saved', filter: { 'saved': true }  },
            { title: 'Archived', name: 'archived', pageTitle: 'reddit.com: Revamped inbox', route: '/rir/archived', filter: { 'trash': true } }
        ],
        sortingOptions: [
            { sortby: 'date', ascending: false, title: 'Date (Desc)' },
            { sortby: 'date', ascending: true, title: 'Date (Asc)' },
            { sortby: 'correspondent', ascending: true, title: 'Username (Asc)' },
            { sortby: 'correspondent', ascending: false, title: 'Username (Desc)' },
            { sortby: 'subject', ascending: true, title: 'Subject (Asc)' },
            { sortby: 'subject', ascending: false, title: 'Subject (Desc)' },
        ]
    },
    contacts: {
        sortingOptions: [
            { sortby: 'getMostPopular', title: 'Popularity' },
            { sortby: 'getMostMessages', title: 'Most messages' },
            { sortby: 'getMostThreads', title: 'Most threads' },
            { sortby: 'getMostRecent', title: 'Most recent message' },
            { sortby: 'getEarliest', title: 'Earliest contact' },
            { sortby: 'getAlphabetic', title: 'Username (Ascending)' },
            { sortby: 'getAlphabeticDesc', title: 'Usedname (Descending)' }
        ],
        get sortingOption() {
            const sortby = rir.model.config.contactSorting || '';
            const sortingOption = rir.viewmodel.contacts.sortingOptions.find((option) => option.sortby === sortby);

            if(typeof sortingOption === "object") return sortingOption;
            return rir.viewmodel.contacts.sortingOptions[0];
        }
    },
    navigation: {
        get path() {
            return location.pathname.substr(5); // Remove the /rir/ prefix
        },
        getFolderByName(name) {
            return rir.viewmodel.folder.folders.find((folder) => folder.name === name);
        },
        getContactByName(name) {
            return rir.viewmodel.folder.contacts.find((contact) => contact.username === name);
        },
        get route() {
            const parts = rir.viewmodel.navigation.path
                .split('/')
                .filter((str) => str.length > 0);

            if(parts.length === 0) parts.push('inbox');

            // First try resolve an active folder
            let active = rir.viewmodel.navigation.getFolderByName(parts[0]);

            // If no active folder is found, were either somewhere in contacts, or an error
            if(typeof active === "undefined") {
                if(parts[0] === 'contact' && parts.length > 1) {
                    active = rir.viewmodel.navigation.getContactByName(parts[1]);

                    // example: /contact/[username]
                    if(parts.length === 2) {
                        return {
                            component: 'ProfileView',
                            active: active,
                            propsData: {
                                contact: parts[1]
                            }
                        }
                    }
                    // example: /contact/[username]/[messageid]
                    return {
                        component: 'ConversationView',
                        active: active,
                        propsData: {
                            id: parts[2]
                        }
                    }
                }

                // If it's not a contact, default to inbox
                parts[0] = 'inbox';
                active = rir.viewmodel.navigation.getFolderByName('inbox');
            }

            // If we're here, it's not a contact, it's a folder or a message
            if(typeof active === "object") {
                // if path is like /rir/[folder]
                if(parts.length === 1) {
                    return {
                        component: 'FolderView',
                        active: active,
                        propsData: {
                            folder: parts[0]
                        }
                    }
                }
                // Else if path is like /rir/[folder]/[messageid]
                return {
                    component: 'ConversationView',
                    active: active,
                    propsData: {
                        id: parts[1]
                    }
                }
            }
        }
    }
};