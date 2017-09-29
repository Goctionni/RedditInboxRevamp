export class RirHistory {
    constructor() {
        window.addEventListener('popstate', this.popstateHandler.bind(this));
    }

    popstateHandler(event) {
        rir.view.content.load().then((component) => {
            component.setState(event.state);
        });
    }

    pushState(title = null, path) {
        if(title === null) title = document.title;

        // Update current state object
        history.replaceState(rir.view.components.content.getState(), document.title);

        // Create new state object and push it
        history.pushState({}, title, path);
        // Since history.pushState doesn't currently do anything, also manually fix it
        rir.view.helper.setPageTitle(title);

        // Load the page state
        return rir.view.content.load();
    }
}