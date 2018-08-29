<template>
    <button class="rir-config-button" @click="openConfig()"></button>
</template>

<script>
    export default {
        methods: {
            openConfig(){
                console.error('Not yet implemented');
            }
        }
    };
</script>

<style scoped lang="scss">
    .rir-config-button {
        @extend %gray-button-border;
        display: flex;
        position: absolute;
        background-color: #F2F2F2;
        line-height: 16px;
        padding-left: 8px;
        padding-right: 8px;
        right: 15px;
        bottom: 8px;
        transition: all ease-in-out .4s;

        &:hover {
            background-color: #F9F9F9;
            border-bottom-color: #89A;
        }

        &::before {
            content: '';
            width: 19px;
            height: 19px;
            display: inline-block;
            background-position: -112px 0px;
            background-repeat: no-repeat;
            background-image: url('chrome-extension://__MSG_@@extension_id__/inbox/img/icons.png');
        }
    }
</style>