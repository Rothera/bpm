/**
 * Settings integration for Typhos' BetterPonymotes for Discord
 * (c) 2015-2016 ByzantineFailure
 *
 * Sets up our injected HTML and triggers its init.
 **/
var path = require('path');
var fs = require('fs');

module.exports = {
    addSettings: addSettings
};

function getInjectSettingsCSSCode(contentLocation) {
    var css = fs.readFileSync(path.join(contentLocation, 'settings.css'), 'utf-8');
    css = css.replace(/\n/g, ' ');
    var code = 
    "var styleNode = document.createElement('style');\n" +
    "styleNode.type = 'text/css';\n" +
    "styleNode.appendChild(document.createTextNode('" + css + "'));\n" +
    "document.head.appendChild(styleNode);\n"
    return code; 
}

function getInjectedSubpanelCode(contentLocation, filename, message) {
    var html = fs.readFileSync(path.join(contentLocation, filename), 'utf-8');
    html = html.replace(/\n/g, '');
    html = html.replace(/\'/g, '\\\'');
    var code = 
    "       case '" + message + "':\n" +
    "           var panel = event.data.injectInto;\n" +
    "           var toInject = document.createElement('div');\n" +
    "           toInject.id = 'bpm-settings-subpanel';\n" +
    "           toInject.innerHTML = '" + html + "';\n" + 
    "           panel.appendChild(toInject);\n" +
    "           var doneEvent = new CustomEvent('bpm_backend_message');\n" +
    "           doneEvent.data = { method: 'subpanel_inject_complete', subpanel: toInject };\n" +
    "           window.dispatchEvent(doneEvent);\n" +
    "           break;\n";
    return code;
}

//Removing the old panel and replacing it with our own causes
//react to do some funny things, so we simply inject our own
//hidden panel and let the addon code display it for us.
//BPM_initOptions is found in addon/dc-settings.js
function createSettingsInjectionListener(contentLocation) {
    var settingsWrapperHtml = fs.readFileSync(path.join(contentLocation, 'settings-wrapper.html'), 'utf-8');
    settingsWrapperHtml = settingsWrapperHtml.replace(/\n/g, '');
    var injectSettingsPanelCode = 
    "window.addEventListener('bpm_backend_message', function(event) {\n" + 
    "    switch(event.data.method) { \n" +
    "       case 'insert_settings_wrapper':\n" + 
    "           var panel = event.data.injectInto;\n" +
    "           var toInject = document.createElement('div');\n" +
    "           toInject.className = 'scroller-wrap';\n" +
    "           toInject.id = 'bpm-settings-panel';\n" +
    "           toInject.style.display = 'none';\n" +
    "           toInject.innerHTML = '" + settingsWrapperHtml + "';\n" + 
    "           panel.appendChild(toInject);\n" +
    "           break;\n" +
            getInjectedSubpanelCode(contentLocation, 'general-settings.html', 'insert_general_settings') +
            getInjectedSubpanelCode(contentLocation, 'emote-settings.html', 'insert_emote_settings') +
            getInjectedSubpanelCode(contentLocation, 'subreddit-settings.html', 'insert_subreddit_settings') +
            getInjectedSubpanelCode(contentLocation, 'search-settings.html', 'insert_search_settings') +
            getInjectedSubpanelCode(contentLocation, 'updates.html', 'insert_updates') +
            getInjectedSubpanelCode(contentLocation, 'about.html', 'insert_about') +
    "       case 'insert_css':\n" +
    "       case 'css_tag_response':\n" +
    "       case 'subpanel_inject_complete':\n" +
    "           break;\n" +
    "       default: \n" +
    "           console.log('Received unrecognized backend message: ' + event.data.method);\n" +
    "           break;\n" +
    "    }\n" +
    "}, false);\n";
    return injectSettingsPanelCode;
}

function addSettings(mainWindow, contentLocation) {
    var webContents = mainWindow.webContents;
    var settingsScript = fs.readFileSync(path.join(contentLocation, 'settings.js'), 'utf-8');
    var panelCode = createSettingsInjectionListener(contentLocation);
    var styleCode = getInjectSettingsCSSCode(contentLocation);
    webContents.executeJavaScript(styleCode);
    webContents.executeJavaScript(panelCode);
    webContents.executeJavaScript(settingsScript);
}
