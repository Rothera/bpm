/*******************************************************************************
**
** Copyright (C) 2012 Typhos
**
** This Source Code Form is subject to the terms of the Mozilla Public
** License, v. 2.0. If a copy of the MPL was not distributed with this
** file, You can obtain one at http://mozilla.org/MPL/2.0/.
**
*******************************************************************************/

var prefs;
if(localStorage.prefs === undefined) {
    prefs = {
        "enableNSFW": false,
        "enableExtraCSS": true
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
localStorage.prefs = JSON.stringify(prefs);

chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
    switch(request.method) {
        case "getPrefs":
            sendResponse(JSON.parse(localStorage.prefs));
            break;

        default:
            console.log("ERROR: Unknown request from content script: " + message.request);
            break;
    }
});
