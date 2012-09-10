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
