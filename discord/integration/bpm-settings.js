/**
 * Settings integration for Typhos' BetterPonymotes for Discord
 * (c) 2015 ByzantineFailure
 *
 * Injects onclick handlers to settings button, panel, adds
 * injected settings pane to settings
 **/
module.exports = {
    addSettingsListener: addSettingsListener
};

var insertedItem = 
'<div class="scroller settings-wrapper settings-panel">' + 
    '<div>INJECTION SUCCESS</div>' + 
'</div>';

//Removing the old panel and replacing it with our own causes
//react to do some funny things, so we simply inject our own
//hidden panel and let the addon code display it for us.
var injectSettingsPanelCode = 
"window.addEventListener('bpm_backend_message', function(event) {" + 
"    switch(event.data.method) { " +
"       case 'insert_settings': " +
"           var panel = event.data.injectInto;" +
"           var toInject = document.createElement('div');" +
"           toInject.className = 'scroller-wrap';" +
"           toInject.id = 'bpm_settings_panel';" +
"           toInject.style.display = 'none';" +
"           toInject.innerHTML = '" + insertedItem +"';" +
"           panel.appendChild(toInject);" +
"           break;" +
"    }" +
"}, false);";

function addSettingsListener(mainWindow) {
    var webContents = mainWindow.webContents;
    webContents.executeJavaScript(injectSettingsPanelCode);
}
