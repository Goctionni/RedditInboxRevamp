<template>
    <div class="rir-content">
        <content-controls></content-controls>
        <div class="rir-content-panels">
            <div class="rir-content-navigation">
                <folder-navigation :active="active" :folders="folders"></folder-navigation>
                <contacts :active="active"></contacts>
            </div>
            <div class="rir-content-body"></div>
        </div>
    </div>
</template>

<script>
    import ContentControls from './UIComponents/ContentControls.vue';
    import FolderNavigation from './UIComponents/FolderNavigation.vue';
    import Contacts from './UIComponents/Contacts.vue';

    export default {
        data () {
            return {
                folders: rir.viewmodel.folder.folders,
                active: rir.viewmodel.navigation.route.active
            }
        },
        components: {
            ContentControls,
            FolderNavigation,
            Contacts
        },
        methods: {
            getContentContainer(){
                if(!this.contentContainer) {
                    this.contentContainer = this.$el.querySelector('.rir-content-body');
                }
                return this.contentContainer;
            },
            setupContent(component, propsData){
                // Get the contentDiv
                const contentContainer = this.getContentContainer();

                // Create a Vue component
                const vueComponentDefinition = Vue.extend(component);

                const vueComponent = new vueComponentDefinition({ propsData });
                // Instantiate the Vue Component and return it
                vueComponent.$mount();

                // Clear content container
                contentContainer.clear();

                // Add our component
                contentContainer.appendChild(vueComponent.$el);

                return vueComponent;
            }
        }
    }
</script>

<style scoped lang="scss">
    .rir-content {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        font-family: Arial;
    }
    .rir-content-panels {
        flex: 1;
        display: flex;
        width: 100%;

        .rir-content-navigation {
            display: flex;
            flex-direction: column;
        }

        .rir-content-body {
            max-width: calc(100vw - 215px);
            flex: 1;
        }
    }
</style>