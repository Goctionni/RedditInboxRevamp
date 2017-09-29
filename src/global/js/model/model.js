rir.model = {
    config: rir_default_cfg,
    user: {
        get username() {
            let element;
            if(rir.view && rir.view.elements) element = rir.view.elements.username;
            if(!element) element = document.querySelector('#header .user > a');
            if(!element) return false;

            return element.textContent.trim();
        }
    },
    prepare() {
        return new Promise((resolve, reject) => {
            rir.background.config.get().then((config) => {
                rir.model.config = config;
                resolve();
            }, reject);
        });
    }
};