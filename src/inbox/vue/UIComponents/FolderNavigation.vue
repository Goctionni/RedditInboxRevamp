<template>
    <ul class="rir-folder-navigation">
        <li v-for="folder in folders" :class="{ active: folder === active }">
            <a :href="folder.route" class="rir-folder" v-text="folder.title" @click="gotoFolder($event, folder)"></a>
        </li>
    </ul>
</template>

<script>
    export default {
        name: 'folder-navigation',
        data () {
            return {
            }
        },
        props: [ 'folders', 'active' ],
        methods: {
            gotoFolder($event, folder) {
                $event.preventDefault();

                rir.history.pushState(folder.pageTitle, folder.route);
            }
        }
    }
</script>

<style scoped lang="scss">
    .rir-folder-navigation {
        padding: 15px 0;
        width: $sidebar-width;

        li {
            a {
                display: block;
                line-height: 2.3em;
                padding-left: 10px;
                border-left-style: solid;
                border-left-width: 5px;
                border-color: transparent;
                font-size: 12px;
                font-weight: bold;
                color: #333;

                &:hover {
                    background-color: #F6F6F6;
                    color: #000;
                }
            }

            &.active a {
                border-color: $orange;
            }
        }
    }
</style>