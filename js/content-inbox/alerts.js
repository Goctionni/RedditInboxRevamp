rir.templates.add({
    alert_alert: chrome.extension.getURL('template/alert_alert.html'),
    alert_html: chrome.extension.getURL('template/alert_html.html'),
    alert_confirm: chrome.extension.getURL('template/alert_confirm.html')
});

var testI = 0;
rir.alerts = {
    html: function(title, html, buttons, clickToDismiss) {
        var $alert = $(rir.templates.alert_html);
        $alert.find('.rir-alert-title-text').text(title);
        $alert.find('.rir-alert-message').html(html);
        $alert.find('button.rir-alert-close').on('click', rir.view.hideOverlay);
        
        var $buttons = $alert.find('.rir-alert-buttons');
        if(typeof buttons === "object") {
            var buttonTexts = Object.keys(buttons);
            for(var i = 0; i < buttonTexts.length; i++) {
                var text = buttonTexts[i];
                var callback = buttons[text];
                
                $('<button>')
                    .text(text)
                    .on('click', callback)
                    .on('click', rir.view.hideOverlay)
                    .appendTo($buttons);
            
                $buttons.append(' ');
            }
        }
        
        if(typeof clickToDismiss !== "boolean") clickToDismiss = true;
        rir.$e.overlay.empty().append($alert);
        rir.view.showOverlay(clickToDismiss);
        return $alert;
    },
    error: function(title, message){
        rir.alerts.alert(title, message, false).addClass('rir-alert-error');
    },
    alert: function(title, message, clickToDismiss){
        var $alert = $(rir.templates.alert_alert);
        $alert.find('.rir-alert-title-text').text(title);
        $alert.find('.rir-alert-message').text(message);
        $alert.find('button').on('click', rir.view.hideOverlay);

        if(typeof clickToDismiss !== "boolean") clickToDismiss = true;
        rir.$e.overlay.empty().append($alert);
        rir.view.showOverlay(clickToDismiss);
        return $alert;
    },
    confirm: function(title, message, callback) {
        var $alert = $(rir.templates.alert_confirm);
        $alert.find('.rir-alert-title-text').text(title);
        $alert.find('.rir-alert-message').text(message);
        $alert.find('button').on('click', rir.view.hideOverlay);
        $alert.find('.rir-confirm-yes').on('click', callback);

        rir.$e.overlay.empty().append($alert);
        rir.view.showOverlay(false);
        return $alert;
    }
}
