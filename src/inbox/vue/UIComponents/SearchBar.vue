<template>
    <div class="rir-search-panel">
        <input class="search-input" type="text" v-model="query" @keyup.enter="search()">
        <button class="search-button" @click="search()"></button>
    </div>
</template>

<script>
    export default {
        data: () => ({
            query: ''
        }),
        created(){
            // Retrieve search query from model
        },
        methods: {
            search(){
                console.info('Search query:', this.query);
                console.error('Not yet implemented');
            }
        }
    };
</script>

<style scoped lang="scss">
    .rir-search-panel {
        display: flex;
        position: absolute;
        left: $sidebar-width;
        width: 500px;
        bottom: 8px;
    }

    .search-input {
        box-sizing: border-box;
        height: 28px;
        border-top-left-radius: 4px;
        border-bottom-left-radius: 4px;
        flex: 1;
        padding-left: 10px;
        border-width: 1px;
        border-style: solid none solid solid;
        border-color: grey;
    }

    .search-button {
        box-sizing: border-box;
        position: absolute;
        height: 28px;
        top: 50%;
        margin-top: -14px;
        left: 100%;
        color: #FFF;
        cursor: default;
        padding-left: 20px;
        padding-right: 20px;
        background: -webkit-linear-gradient(top, rgb(67, 135, 253), rgb(70, 131, 234));
        border-width: 1px;
        border-style: solid;
        border-color: transparent;
        border-image: initial;
        border-radius: 0px 4px 4px 0px;

        &::before {
             content: "";
             display: inline-block;
             width: 16px;
             height: 16px;
             background-image: url('chrome-extension://__MSG_@@extension_id__/inbox/img/icons.png');
             background-position-x: -32px;
             background-position-y: -32px;
             margin-top: 3px;
             background-repeat: no-repeat;
        }
    }
</style>