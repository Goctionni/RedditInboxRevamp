<template>
    <div class="rir-content-controls">
        <div class="rir-content-controls-left">
            <button class="btn btn-left" @click="archive()">Archive</button>
            <button class="btn btn-right" @click="restore()">Restore</button>
            <button class="btn btn-left" @click="markRead()">Mark read</button>
            <button class="btn btn-right" @click="markUnread()">Unread</button>
        </div>
        <div class="rir-content-controls-right">
            <div class="rir-inbox-sorting">
                Sorting:
                <div class="dropdown-container">
                    <div class="dropdown-head" @click="toggleSortingDropdown()">
                        <span class="sorting-text" v-text="sortingOption.title"></span>
                        <button class="dropdown-toggle-button"></button>
                    </div>
                    <ul :class="{'dropdown-body': true, open: isOpen}">
                        <li class="dropdown-item" v-for="sortingOption in sortingOptions">
                            <button type="button" @click="chooseSortingOption(sortingOption)" v-text="sortingOption.title"></button>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
    export default {
        name: 'content-controls',
        data(){ return {
            sortingOptions: rir.viewmodel.folder.sortingOptions,
            sortingOption: rir.viewmodel.folder.sortingOptions[0],
            isOpen: false
        }},
        methods: {
            archive() {
                rir.view.component.content.archive();
            },
            restore() {
                rir.view.component.content.restore();
            },
            markRead() {
                rir.view.component.content.markRead();
            },
            markUnread() {
                rir.view.component.content.markUnread();
            },
            toggleSortingDropdown(){
                this.isOpen = !this.isOpen;
            },
            chooseSortingOption(sortingOption) {
                this.sortingOption = sortingOption;
                this.isOpen = false;
                console.error('Not yet implemented');
            }
        }
    }
</script>

<style scoped lang="scss">
    .rir-content-controls {
        position: relative;
        background-color: #E5E5E5;
        border-bottom: solid #CCC 1px;
        height: 50px;

        padding-left: $sidebar-width;
        display: flex;

        &::before {
            content: '';
            position: absolute;
            left: 0;
            top: 0;
            width: $sidebar-width;
            height: 100%;
            background-position: 15px 15px;
            background-repeat: no-repeat;
            background-image: url('chrome-extension://__MSG_@@extension_id__/inbox/img/logo.png');
        }

        .rir-content-controls-left {
            display: flex;
            align-items: center;
            justify-content: flex-start;
            flex: 1;

            .btn {
                @extend %gray-button;
                &.btn-left {
                    margin-right: -1px;
                    border-top-right-radius: 0;
                    bottom-right-radius: 0;

                    + .btn {
                        border-top-left-radius: 0;
                        border-bottom-left-radius: 0;
                    }
                }
            }
        }
        .rir-content-controls-right {
            display: flex;
            align-items: center;
            padding-right: 10px;

            .rir-inbox-sorting {
                margin-right: 5px;
            }

            .dropdown-container {
                position: relative;
                display: inline-flex;
                width: 150px;

                .dropdown-head {
                    border: solid #CCC 1px;
                    background-color: #F4F4F4;
                    border-radius: 3px;
                    border-bottom-width: 2px;
                    border-bottom-color: #BBB;
                    padding: 5px 0 5px 10px;
                    color: #555;
                    transition: all ease-in-out 0.15s;
                    cursor: pointer;
                    font-size: 12px;
                    width: 100%;

                    .sorting-text {
                        flex: 1;
                    }

                    .dropdown-toggle-button {
                        float: right;
                        position: relative;
                        width: 26px;
                        height: 100%;
                        background-color: transparent;
                        border: 0;
                        border-left: solid rgba(0, 0, 0, .2) 1px;
                        color: #333;

                        &::before {
                            content: "";
                            width: 0;
                            height: 0;
                            position: absolute;
                            left: 8px;
                            margin-top: -1px;
                            border-left: 4px solid transparent;
                            border-right: 4px solid transparent;
                            border-top: 4px solid #000;
                        }
                    }
                }
                .dropdown-body {
                    position: absolute;
                    top: 100%;
                    left: 0;
                    right: 0;
                    background-color: #fff;
                    border: solid #ccc 1px;
                    border-radius: 3px;
                    z-index: 1;

                    overflow: hidden;
                    opacity: 0;
                    height: 0;
                    transition: height linear .01s, opacity ease-in-out .4s;

                    &.open {
                        opacity: 1;
                        height: auto;
                        transition: height linear .01s .4s, opacity ease-in-out .4s;
                    }

                    button {
                        width: 100%;
                        text-align: left;
                        background-color: transparent;
                        border: 0;
                        padding: 5px 10px;

                        &:hover {
                            background-color: #EEE;
                        }
                    }
                }
            }
        }
    }
</style>