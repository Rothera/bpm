/**
 * Settings integration for Typhos' BetterPonymotes for Discord
 * (c) 2015 ByzantineFailure
 *
 * Injects onclick handlers to settings button, panel, adds
 * injected settings pane to settings
 **/
var path = require('path');
var fs = require('fs');

module.exports = {
    addSettings: addSettings
};

//Removing the old panel and replacing it with our own causes
//react to do some funny things, so we simply inject our own
//hidden panel and let the addon code display it for us.
function getInjectedPanelCode(panelHtml) {
    var injectSettingsPanelCode = 
    "window.addEventListener('bpm_backend_message', function(event) {" + 
    "    switch(event.data.method) { " +
    "       case 'insert_settings': " +
    "           var panel = event.data.injectInto;" +
    "           var toInject = document.createElement('div');" +
    "           toInject.className = 'scroller-wrap';" +
    "           toInject.id = 'bpm_settings_panel';" +
    "           toInject.style.display = 'none';" +
    "           toInject.innerHTML = '" + panelHtml + "';" +
    "           panel.appendChild(toInject);" +
    "           break;" +
    "    }" +
    "}, false);";
    return injectSettingsPanelCode;
}

function addSettings(mainWindow, contentLocation) {
    var panelHtml = fs.readFileSync(path.join(contentLocation,  'settings.html'), 'utf8');
    panelHtml = panelHtml.replace(/\n/g, '');
    var webContents = mainWindow.webContents;
    var panelCode = getInjectedPanelCode(panelHtml);
    webContents.executeJavaScript(panelCode);
}
