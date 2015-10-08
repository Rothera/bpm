/*******************************************************************************
**
** This file is part of BetterPonymotes.
** Copyright (c) 2012-2015 Typhos.
** Copyright (c) 2015 TwilightShadow1.
**
** This program is free software: you can redistribute it and/or modify it
** under the terms of the GNU Affero General Public License as published by
** the Free Software Foundation, either version 3 of the License, or (at your
** option) any later version.
**
** This program is distributed in the hope that it will be useful, but WITHOUT
** ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
** FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public License
** for more details.
**
** You should have received a copy of the GNU Affero General Public License
** along with this program.  If not, see <http://www.gnu.org/licenses/>.
**
*******************************************************************************/

"use strict";

var request = null;
var timers = null;
var storage = localStorage;

if(!storage.prefs) {
    storage.prefs = JSON.stringify({});
}

var pref_manager = manage_prefs(bpm_data.sr_name2id, {
    read_value: function(key) { return storage[key]; },
    write_value: function(key, data) { storage[key] = data; },
    read_json: function(key) { return storage[key] === undefined ? undefined : JSON.parse(storage[key]); },
    write_json: function(key, data) { storage[key] = JSON.stringify(data); },

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

    set_timeout: (timers ? timers.setTimeout : function() {
        console.warn("BPM: WARNING: Unable to start timer due to broken installation");
    })
});

function open_options_page() {
    safari.application.activeBrowserWindow.openTab().url = safari.extension.baseURI + 'options.html';
}

function prefListener(event) {

    if (event.key == "open_options") {
        open_options_page();
    }
}

safari.extension.settings.addEventListener("change", prefListener, false);

safari.application.addEventListener("message", function(message) {

    switch(message.message.method) {
        case "get_initdata":
            var reply = {"method": "initdata"};
            if(message.message.want["prefs"]) {
                reply.prefs = pref_manager.get();
            }
            if(message.message.want["customcss"]) {
                reply.emotes = pref_manager.cm.emote_cache;
                reply.css = pref_manager.cm.css_cache;
            }
            message.target.page.dispatchMessage("initdata", reply);
            break;

        case "get_prefs":
            message.target.page.dispatchMessage("prefs", {
                "method": "prefs",
                "prefs": pref_manager.get()
            });
            break;

        case "get_custom_css":
            message.target.page.dispatchMessage("custom_css",{
                "method": "custom_css",
                "css": pref_manager.cm.css_cache,
                "emotes": pref_manager.cm.emote_cache
            });
            break;

        case "set_pref":
            pref_manager.set_pref(message.message.pref, message.message.value);
            break;

        case "force_update":
            pref_manager.cm.force_update(message.message.subreddit);
            break;

        case "open_options":
            open_options_page();
            break;

        default:
            console.log("BPM: ERROR: Unknown request from content script: '" + message.request + "'");
            break;
    }
}, false);

