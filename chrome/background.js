/*******************************************************************************
**
** Copyright (C) 2012 Typhos
**
** This Source Code Form is subject to the terms of the Mozilla Public
** License, v. 2.0. If a copy of the MPL was not distributed with this
** file, You can obtain one at http://mozilla.org/MPL/2.0/.
**
*******************************************************************************/

function sync_prefs(prefs) {
    localStorage.prefs = JSON.stringify(prefs);
}

function prefs_updated(prefs) {
}

function dl_file(url) {
    // BIG FATE NOTE: set user-agent
}

if(localStorage.prefs === undefined) {
    localStorage.prefs = "{}";
}

var pref_manager = manage_prefs(JSON.parse(localStorage.prefs), sync_prefs, prefs_updated, dl_file);

// Content script requests
chrome.extension.onMessage.addListener(function(message, sender, sendResponse) {
    switch(message.method) {
        case "get_prefs":
            sendResponse(pref_manager.get_prefs());
            break;

        case "set_prefs":
            pref_manager.write_prefs(message.prefs)
            break;

        default:
            console.log("BPM: ERROR: Unknown request from content script: '" + message.request + "'");
            break;
    }
});
