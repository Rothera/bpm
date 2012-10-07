/*******************************************************************************
**
** Copyright (C) 2012 Typhos
**
** This Source Code Form is subject to the terms of the Mozilla Public
** License, v. 2.0. If a copy of the MPL was not distributed with this
** file, You can obtain one at http://mozilla.org/MPL/2.0/.
**
*******************************************************************************/

"use strict";

if(localStorage.prefs === undefined) {
    localStorage.prefs = "{}";
}

var pref_manager = bpm_backendsupport.manage_prefs(sr_data, {
    read_value: function(key) { return localStorage[key]; },
    write_value: function(key, data) { localStorage[key] = data; },
    read_json: function(key) { return localStorage[key] === undefined ? undefined : JSON.parse(localStorage[key]); },
    write_json: function(key, data) { localStorage[key] = JSON.stringify(data); },

    prefs_updated: function(prefs) {
    },

    download_file: function(done, url, callback) {
        var request = new XMLHttpRequest();
        request.onreadystatechange = function() {
            if(request.readyState === 4) {
                done();
                var type = request.getResponseHeader("Content-Type");
                if(request.status === 200 && type == "text/css") {
                    callback(request.responseText);
                } else {
                    console.log("BPM: ERROR: Reddit returned HTTP status " + request.status + " for " + url + " (type: " + type + ")");
                }
            }
        };
        request.open("GET", url, true);
        // Not permitted because Chrome sucks
        //request.setRequestHeader("User-Agent", "BetterPonymotes Client CSS Updater (/u/Typhos)");
        request.send();
    },

    // Chrome's setTimeout() does not appreciate a this parameter
    set_timeout: setTimeout.bind(undefined)
});

// Content script requests
chrome.extension.onMessage.addListener(function(message, sender, sendResponse) {
    switch(message.method) {
        case "get_prefs":
            sendResponse({"method": "prefs", "prefs": pref_manager.get()});
            break;

        case "set_prefs":
            pref_manager.write(message.prefs);
            break;

        case "force_update":
            pref_manager.cm.force_update(message.subreddit);
            break;

        case "get_custom_css":
            sendResponse({
                "method": "custom_css",
                "css": pref_manager.cm.css_cache,
                "emotes": pref_manager.cm.emote_cache
            });
            break;

        case "set_pref":
            pref_manager.set_pref(message.pref, message.value);
            break;

        default:
            console.log("BPM: ERROR: Unknown request from content script: '" + message.request + "'");
            break;
    }
});
