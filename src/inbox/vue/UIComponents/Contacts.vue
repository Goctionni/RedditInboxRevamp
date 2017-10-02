<template>
    <div class="rir-contacts">
        <div :class="{'rir-contacts-sorting': true, 'dropdown-open': sortingDropdownOpen}">
            <button class="rir-contacts-header" @click="toggleSortingDropdown()">
                <div class="rir-contacts-header-text">
                    <span class="rir-contacts-title">Contacts</span>
                    <span class="rir-contacts-sortby" v-text="sortingOption.title"></span>
                </div>
                <span class="rir-arrow-down"></span>
            </button>
            <ul class="rir-contacts-sorting-options">
                <li v-for="option in sortingOptions">
                    <button class="rir-contacts-sorting-option" v-text="option.title" @click="setSortingOption(option)"></button>
                </li>
            </ul>
        </div>
        <ul class="rir-contact-list" @scroll="scrollHandler($event)">
            <li class="rir-loading" v-if="loading"></li>
            <li v-for="contact in contacts" :class="{'rir-contact-list-item': true, 'active': (active === contact)}">
                <a href="/rir/contacts/contact.username" class="rir-contact" @click="gotoContact($event, contact)">
                    <span class="rir-contact-icon" :style="{'background-color': getContactIconColor(contact)}">{{ getContactIconText(contact) }}</span>
                    {{ contact.username }}
                </a>
            </li>
            <li class="rir-unloaded-contacts-space" :style="{'height': (numUnfetchedRows * 40) + 'px'}"></li>
        </ul>
    </div>
</template>

<script>
    export default {
        name: 'contacts',
        props: [ 'active' ],
        data: () => ({
            sortingDropdownOpen: false,
            sortingOptions: rir.viewmodel.contacts.sortingOptions,
            sortingOption: rir.viewmodel.contacts.sortingOption,
            loading: true,
            contacts: [],
            totalRows: 0
        }),
        computed: {
            // Number of conversations not yet retrieved from the backend
            numUnfetchedRows() {
                return this.totalRows -  this.contacts.length;
            }
        },
        methods: {
            gotoContact($event, contact){
                console.error('Not yet implemented');
                $event.preventDefault();
            },
            setSortingOption(option) {
                console.error('Not yet implemented (Does not yet save to config)');
                this.sortingOption = option;
                this.sortingDropdownOpen = false;
                this.contacts = [];
                this.loadMore();
            },
            toggleSortingDropdown() {
                this.sortingDropdownOpen = !this.sortingDropdownOpen;
            },
            getContactIconColor(contact) {
                const hue = hashCode(contact.username) % 360;
                return `hsl(${hue}, 60%, 50%)`;
            },
            getContactIconText(contact) {
                for(let i = 0; i < contact.username.length; i++) {
                    let charCode = contact.username.charCodeAt(i);
                    if((charCode >= 97 && charCode <= 122) // a-z
                    || (charCode >= 65 && charCode <= 90)) return contact.username.charAt(i);
                }
                return '?';
            },
            loadMore() {
                this.loading = true;
                return new Promise((resolve, reject) => {
                    rir.background.db.contacts[this.sortingOption.sortby](this.contacts.length).then((response) => {
                        this.loading = false;
                        this.totalRows = response.total;
                        this.contacts.push(... response.results);
                        resolve();
                    }, reject);
                });
            },
            scrollHandler(evt) {
                if(this.loading) return;
                const scrollTop = evt.target.scrollTop;
                if(isNum(this.lastScrollTop) && this.lastScrollTop === scrollTop) return;

                // Check if our space for unloaded contacts is in the viewport
                if(!isNum(this.boundingRectBottom)) this.boundingRectBottom = evt.target.getBoundingClientRect().bottom;

                const placeholderTop = this.unloadedContentSpace.getBoundingClientRect().top;

                // If the top is still below the bottom of our container-element, do nothing
                if(placeholderTop > this.boundingRectBottom) return;
                this.loadMore().then(this.scrollHandler.bind(this, evt));
            }
        },
        mounted() {
            this.contacts = [];
            this.unloadedContentSpace = this.$el.querySelector('.rir-unloaded-contacts-space');
            this.loadMore().then(() => {}, (error) => {
                console.error(error);
            });
        }
    }
</script>

<style scoped lang="scss">
    .rir-contacts {
        display: flex;
        flex-direction: column;
    }
    .rir-loading {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 5px;
        overflow: hidden;

        &::before {
            content: '';
            position: absolute;
            left: -10%;
            top: 0;
            height: 100%;
            width: 10%;
            background-color: $orange;
            animation: 2s ease-in-out slide infinite;
        }
    }

    .rir-contacts-sorting {
        display: block;
        position: relative;

        .rir-contacts-header {
            display: flex;
            align-items: center;
            width: 100%;
            height: 40px;
            padding-left: 15px;
            padding-bottom: 5px;
            background-color: transparent;
            border: 0;
            border-bottom: solid #CCC 1px;
            border-top: solid transparent 1px;
            transition: all .4s ease-in-out;

            &:hover {
                background-color: #FBFBFB;
                border-top: solid #DDD 1px;
            }

            .rir-contacts-header-text {
                flex: 1;
                text-align: left;
                color: #666;

                .rir-contacts-title {
                    display: block;
                    font-size: 16px;
                    font-weight: bold;
                }
                .rir-contacts-sortby {
                    display: block;
                    font-size: 11px;
                }
            }
            .rir-arrow-down {
                display: flex;
                width: 40px;
                justify-content: center;
                align-items: center;

                &::before {
                    content: '';
                    display: block;
                    width: 1px;
                    height: 1px;
                    border-style: solid;
                    border-color: #666 transparent transparent;
                    border-width: 7px 7px 0 7px;
                }
            }
        }

        .rir-contacts-sorting-options {
            position: absolute;
            transform-origin: top;
            transform: scaleY(0);
            opacity: 0;
            background-color: #FFF;
            border: solid #ccc 1px;
            border-top: 0;
            transition: all ease-in-out .4s;
            width: calc(100% - 10px);
            left: 5px;
            z-index: 1;

            .rir-contacts-sorting-option {
                display: block;
                width: 100%;
                line-height: 1.75em;
                text-align: left;
                background-color: transparent;
                border: 0;
                transition: background-color .4s ease-in-out;
                &:hover {
                    background-color: #F8F8F8;
                }
            }
            li + li .rir-contacts-sorting-option {
                border-top: solid #ccc 1px;
            }
        }
        &.dropdown-open {
            .rir-contacts-header {
                background-color: #FBFBFB;
                border-top: solid #DDD 1px;
            }
            .rir-contacts-sorting-options {
                transform: scaleY(1);
                opacity: 1;
            }
        }
    }

    .rir-contact-list {
        @extend %nice-scrollbar;
        position: relative;
        flex: 1;
        overflow: auto;
    }

    .rir-contact {
        display: block;
        padding: 5px 15px 5px 10px;
        border-left: solid transparent 5px;
        font-size: 12px;
        color: #333;

        &:hover {
            color: #000;
            background-color: #F8F8F8;
        }
    }

    .rir-contact-icon {
        position: relative;
        display: inline-block;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        color: #FFF;
        text-align: center;
        line-height: 20px;
        font-size: 14px;
        vertical-align: middle;
        margin-right: 5px;
        text-transform: uppercase;
        padding-top: 1px;

        &::before {
            .rir-contact & {
                content: '';
                position: absolute;
                width: calc(100% - 6px);
                height: calc(100% - 6px);
                top: 0;
                left: 0;
                border-radius: 50%;
                border: solid transparent 3px;
            }
        }
    }
</style>