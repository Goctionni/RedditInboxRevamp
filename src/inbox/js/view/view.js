import { shortDateFilter } from '../../vue/Filters/DateFilters.js';

import BaseView from '../../vue/BaseView.vue';
import SearchBar from '../../vue/UIComponents/SearchBar.vue';
import ConfigButton from '../../vue/UIComponents/ConfigButton.vue';

import FolderView from '../../vue/ContentComponents/FolderView.vue';
import ConversationView from '../../vue/ContentComponents/ConversationView.vue';

export const view = {
    vuebase: null,
    elements: {
        pageTitle: null,
        uh: null,
        content: null,
        header: null
    },
    components: {
        baseview: null,
        content: null,
        contentviews: {
            ConversationView: ConversationView,
            FolderView: FolderView
        }
    },
    content: {
        load: () => {
            // Figure out our route
            let route = rir.viewmodel.navigation.route;
            console.log(route);

            // Set active content component
            rir.view.components.baseview.active = route.active;
            // Get the component we need to render
            let component = rir.view.components.contentviews[route.component];
            // Load the component into the baseview's content container
            rir.view.components.content = rir.view.components.baseview.setupContent(component, route.propsData);

            return new Promise((resolve, reject) => Vue.nextTick(resolve.bind(null, rir.view.components.content)));
        }
    },
    init() {
        rir.view.initialization.initDOMBindings();
        rir.view.initialization.cleanup404();
        rir.view.initialization.initVue();
        rir.view.helper.setFavicon();

        return new Promise((resolve) => Vue.nextTick(resolve));
    },
    helper: {
        setFavicon(numMessages = 0) {
            // Remove existing icon
            Array.from(document.head.children).forEach((_el) => {
                if(_el.tagName ==='LINK' && _el.rel.indexOf('icon') >= 0) {
                    document.head.removeChild(_el);
                }
            });

            // Set icon
            var icon = (numMessages === 0) ? 'icon-gray.png' : 'icon.png';
            var link = document.createElement('link');
            link.type = 'image/png';
            link.rel = 'shortcut icon';
            link.href = chrome.extension.getURL('/inbox/img/' + icon);
            document.querySelector('head').appendChild(link);
        },
        setPageTitle(title) {
            document.title = title;
            rir.view.elements.pageTitle.nodeValue = title;
        }
    },
    initialization: {
        initDOMBindings(){
            return new Promise((resolve, reject) => {
                DOMReady().then(() => {
                    rir.view.elements.pageTitle = Array.from(document.head.children).find((_el) => _el.tagName === 'TITLE');
                    rir.view.elements.uh = document.body.querySelector('input[name=uh]');
                    rir.view.elements.content = Array.from(document.body.children).find((_el) => _el.className === 'content');
                    rir.view.elements.header = Array.from(document.body.children).find((_el) => _el.id === 'header');
                    rir.view.elements.username = rir.view.elements.header.querySelector('.user > a');

                    resolve();
                }, reject);
            });
        },
        cleanup404() {
            // Clear content area
            rir.view.elements.content.clear();

            // Set page title
            rir.view.helper.setPageTitle(rir.model.config.pageTitle);
        },
        initVue() {
            // Setup global filters
            Vue.filter('dateShort', shortDateFilter);

            // Initialize Vue BaseView and mount it
            rir.view.components.baseview = new (Vue.extend(BaseView))().$mount();
            rir.view.elements.content.appendChild(rir.view.components.baseview.$el);

            // Initialize Vue SearchBar and mount it
            rir.view.components.searchbar = new (Vue.extend(SearchBar))().$mount();
            rir.view.elements.header.appendChild(rir.view.components.searchbar.$el);

            // Initialize Vue ConfigButton and mount it
            rir.view.components.configButton = new (Vue.extend(ConfigButton))().$mount();
            rir.view.elements.header.appendChild(rir.view.components.configButton.$el);
        }
    }
};