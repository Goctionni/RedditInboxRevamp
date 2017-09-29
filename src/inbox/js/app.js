import { viewModel } from './view/model.js';
import { view } from './view/view.js';
import { RirHistory } from './history/history.js';

rir.controller = {};
rir.viewmodel = viewModel;
rir.view = view;
rir.history = new RirHistory();

// It sucks, but I need the DOM to be ready before I can retrieve the username
rir.view.initialization.initDOMBindings()
    .then(rir.model.prepare)
    .then(rir.view.init)
    .then(rir.background.db.init)
    .then(rir.view.content.load);
