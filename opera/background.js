/*******************************************************************************
**
** Copyright (C) 2012 Typhos
**
** This Source Code Form is subject to the terms of the Mozilla Public
** License, v. 2.0. If a copy of the MPL was not distributed with this
** file, You can obtain one at http://mozilla.org/MPL/2.0/.
**
*******************************************************************************/

// Load/initialize prefs to defaults
var default_prefs = {
        "enableNSFW": false,
        "enableExtraCSS": true,
        "enabledSubreddits": {},
        "showUnknownEmotes": true,
        "searchLimit": 200,
        "searchBoxInfo": [600, 25, 600, 450],
        "showAltText": true,
        "enableGlobalEmotes": false
    };

var prefs;
if(localStorage.prefs === undefined) {
    prefs = {};
} else {
    prefs = JSON.parse(localStorage.prefs);
}

if(prefs.showAltText === undefined) {
    prefs.showAltText = false; // Off by default for upgrades only
}

for(var key in default_prefs) {
    if(prefs[key] === undefined) {
        prefs[key] = default_prefs[key];
    }
}

for(var sr in sr_data) {
    if(prefs.enabledSubreddits[sr] === undefined) {
        prefs.enabledSubreddits[sr] = true;
    }
}
// TODO: Remove subreddits from prefs that are no longer in the addon.

localStorage.prefs = JSON.stringify(prefs);

// XHR request from background process = load file data. Weird.
function get_file_data(filename) {
    var request = new XMLHttpRequest();
    request.open("GET", filename, false);
    request.send();

    if(!request.responseText) {
        console.log("BPM: ERROR: Can't read from file: '" + filename + "'");
        return;
    } else {
        return request.responseText;
    }
}

// Content script requests
opera.extension.onmessage = function(event) {
    var message = event.data;

    switch(message.method) {
        case "get_prefs":
            event.source.postMessage({
                "method": "prefs",
                "prefs": JSON.parse(localStorage.prefs)
            });
            break;

        case "set_prefs":
            localStorage.prefs = JSON.stringify(message.prefs);
            break;

        case "get_file":
            var data = get_file_data(message.filename);

            if(data) {
                event.source.postMessage({
                    "method": "file_loaded",
                    "filename": message.filename,
                    "data": data
                });
            }
            break;

        default:
            console.log("BPM: ERROR: Unknown request from content script: '" + message.request + "'");
            break;
    }
};
