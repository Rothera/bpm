/*******************************************************************************
**
** Copyright (C) 2012 Typhos
**
** This Source Code Form is subject to the terms of the Mozilla Public
** License, v. 2.0. If a copy of the MPL was not distributed with this
** file, You can obtain one at http://mozilla.org/MPL/2.0/.
**
*******************************************************************************/

// Load/initialize prefs
var prefs;
if(localStorage.prefs === undefined) {
    prefs = {
        "enableNSFW": false,
        "enableExtraCSS": true,
        "enabledSubreddits": {},
        "showUnknownEmotes": true
    };
} else {
    prefs = JSON.parse(localStorage.prefs);
}

if(!prefs.enabledSubreddits) {
    prefs.enabledSubreddits = {};
}

for(var sr in sr_data) {
    if(prefs.enabledSubreddits[sr] === undefined) {
        prefs.enabledSubreddits[sr] = true;
    }
}

if(prefs.showUnknownEmotes === undefined) {
    prefs.showUnknownEmotes = true;
}
localStorage.prefs = JSON.stringify(prefs);

// Content script requests
chrome.extension.onMessage.addListener(function(message, sender, sendResponse) {
    switch(message.method) {
        case "get_prefs":
            sendResponse(JSON.parse(localStorage.prefs));
            break;

        default:
            console.log("BPM: ERROR: Unknown request from content script: '" + message.request + "'");
            break;
    }
});
