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
    prefs = {};
} else {
    prefs = JSON.parse(localStorage.prefs);
}
setup_prefs(prefs);
localStorage.prefs = JSON.stringify(prefs);

// Content script requests
chrome.extension.onMessage.addListener(function(message, sender, sendResponse) {
    switch(message.method) {
        case "get_prefs":
            sendResponse(JSON.parse(localStorage.prefs));
            break;

        case "set_prefs":
            localStorage.prefs = JSON.stringify(message.prefs);
            break;

        default:
            console.log("BPM: ERROR: Unknown request from content script: '" + message.request + "'");
            break;
    }
});
