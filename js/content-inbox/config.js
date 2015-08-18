(function(){
    
    rir.cfg.deleted = {
        add: function(id){
            if(rir.cfg.data.deleted.indexOf(id) >= 0) return;
            rir.cfg.data.deleted.push(id);
            rir.proxy(['rir_cfg_deleted', 'add'], [id]);
        },
        remove: function(id){
            rir.proxy(['rir_cfg_deleted', 'remove'], [id]);
            var index;
            while((index = rir.cfg.data.deleted.indexOf(id)) >= 0) {
                rir.cfg.data.deleted.splice(index, 1);
            }
        },
        contains: function(id){
            return (rir.cfg.data.deleted.indexOf(id) >= 0);
        }
    };
    
    rir.cfg.saved = {
        add: function(id){
            if(rir.cfg.data.saved.indexOf(id) >= 0) return;
            rir.cfg.data.saved.push(id);
            rir.proxy(['rir_cfg_saved', 'add'], [id]);
        },
        remove: function(id){
            rir.proxy(['rir_cfg_saved', 'remove'], [id]);
            var index;
            while((index = rir.cfg.data.saved.indexOf(id)) >= 0) {
                rir.cfg.data.saved.splice(index, 1);
            }
        },
        contains: function(id){
            return (rir.cfg.data.saved.indexOf(id) >= 0);
        }
    };
    
    rir.cfg.set = function(prop, value){
        rir.cfg.data[prop] = value;
        rir.proxy(['rir', 'cfg_set'], [prop, value]);
    };
    
})();