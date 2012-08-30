/*******************************************************************************
**
** Copyright (C) 2012 Typhos
**
** This Source Code Form is subject to the terms of the Mozilla Public
** License, v. 2.0. If a copy of the MPL was not distributed with this
** file, You can obtain one at http://mozilla.org/MPL/2.0/.
**
*******************************************************************************/

if(localStorage.prefs === undefined) {
    localStorage.prefs = JSON.stringify({
        "enableNSFW": false,
        "enableExtraCSS": true
    });
}

chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
    switch(request.method) {
        case "getPrefs":
            sendResponse(localStorage.prefs);
            break;

        default:
            console.log("ERROR: Unknown request from content script: " + message.request);
            break;
    }
});
