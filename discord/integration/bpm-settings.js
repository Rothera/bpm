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
    "window.addEventListener('bpm_backend_message', function(event) {\n" + 
    "    switch(event.data.method) { \n" +
    "       case 'insert_settings': \n" +
    "           var panel = event.data.injectInto;\n" +
    "           var toInject = document.createElement('div');\n" +
    "           toInject.className = 'scroller-wrap';\n" +
    "           toInject.id = 'bpm_settings_panel';\n" +
    "           toInject.style.display = 'none';\n" +
    "           toInject.innerHTML = '" + panelHtml + "';\n" + 
    "           BPM_initOptions(toInject);\n" +
    "           panel.appendChild(toInject);\n" +
    "           break;\n" +
    "    }\n" +
    "}, false);\n";
    return injectSettingsPanelCode;
}

function addSettings(mainWindow, contentLocation) {
    var panelHtml = fs.readFileSync(path.join(contentLocation,  'settings.html'), 'utf8');
    panelHtml = panelHtml.replace(/\n/g, '');
    var webContents = mainWindow.webContents;
    var panelCode = getInjectedPanelCode(panelHtml);
    webContents.executeJavaScript(panelCode);
}
