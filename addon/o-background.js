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

var pref_manager = manage_prefs(sr_name2id, {
    read_value: function(key) { return localStorage[key]; },
    write_value: function(key, data) { localStorage[key] = data; },
    read_json: function(key) { return localStorage[key] === undefined ? undefined : JSON.parse(localStorage[key]); },
    write_json: function(key, data) { localStorage[key] = JSON.stringify(data); },

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
        request.setRequestHeader("User-Agent", "BetterPonymotes Client CSS Updater (/u/Typhos)");
        request.send();
    },

    set_timeout: setTimeout
});

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
        case "get_initdata":
            var reply = {"method": "initdata"};
            if(message.want["prefs"]) {
                reply.prefs = pref_manager.get();
            }
            if(message.want["customcss"]) {
                reply.emotes = pref_manager.cm.emote_cache;
                reply.css = pref_manager.cm.css_cache;
            }
            event.source.postMessage(reply);
            break;

        case "get_prefs":
            event.source.postMessage({
                "method": "prefs",
                "prefs": pref_manager.get()
            });
            break;

        case "get_custom_css":
            event.source.postMessage({
                "method": "custom_css",
                "css": pref_manager.cm.css_cache,
                "emotes": pref_manager.cm.emote_cache
            });
            break;

        case "set_pref":
            pref_manager.set_pref(message.pref, message.value);
            break;

        case "set_prefs":
            pref_manager.write(message.prefs);
            break;

        case "force_update":
            pref_manager.cm.force_update(message.subreddit);
            break;

        case "open_options":
            opera.extension.tabs.create({"url": "/options.html"});
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
