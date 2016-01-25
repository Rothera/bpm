/*******************************************************************************
**
** This file is part of BetterPonymotes.
** Copyright (c) 2012-2015 Typhos.
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

var page_mod = require("sdk/page-mod");
var request = null;
var self = require("sdk/self");
var simple_prefs = require("sdk/simple-prefs");
var simple_storage = require("sdk/simple-storage");
var tabs = null;
var timers = null;

// Try to work anyway if certain modules crash on load. Various almost-Firefox
// browsers can make this happen, and sometimes they're just broken... most of
// the other modules we load we can't easily do without, so just crash if those
// are broken.
try {
    request = require("sdk/request");
    tabs = require("sdk/tabs");
    timers = require("sdk/timers");
} catch(e) {
    console.error("BPM: ERROR: Failed to load Addon SDK modules. Some important functionality may be broken or missing.");
    console.error("BPM: ERROR: On line " + e.lineNumber + ": ", e.name + ": " + e.message)
    console.error(e);
    console.error(e.trace);
}

var manage_prefs = require("./pref-setup").manage_prefs;
var bpm_data = require("./bpm-resources");

var storage = simple_storage.storage;

if(!storage.prefs) {
    storage.prefs = {};

    if(simple_prefs.prefs.enableNSFW !== undefined) {
        // Copy old prefs
        storage.prefs.enableNSFW = simple_prefs.prefs.enableNSFW;
        storage.prefs.enableExtraCSS = simple_prefs.prefs.enableExtraCSS;
    }
}

var pref_manager = manage_prefs(bpm_data.sr_name2id, {
    read_value: function(key) { return storage[key]; },
    write_value: function(key, data) { storage[key] = data; },
    read_json: function(key) { return storage[key]; },
    write_json: function(key, data) { storage[key] = data; },

    download_file: function(done, url, callback) {
        if(!request) {
            console.warn("BPM: WARNING: Unable to download file due to broken installation");
            done();
            return;
        }

        request.Request({
            url: url,
            headers: {"User-Agent": "BetterPonymotes Client CSS Updater (/u/Typhos)"},
            onComplete: function(response) {
                done();
                var type = response.headers["Content-Type"];
                if(response.status === 200 && type == "text/css") {
                    callback(response.text);
                } else {
                    console.log("BPM: ERROR: Reddit returned HTTP status " + response.status + " for " + url + " (type: " + type + ")");
                }
            }
        }).get();
    },

    set_timeout: (timers ? timers.setTimeout : function() {
        console.warn("BPM: WARNING: Unable to start timer due to broken installation");
    })
});

function open_options_page() {
    if(!tabs) {
        console.warn("BPM: WARNING: Unable to open options page due to broken installation");
        return;
    }

    tabs.open(self.data.url("options.html"));
}

function on_cs_attach(worker) {
    worker.on("message", function(message) {
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
                worker.postMessage(reply);
                break;

            case "get_prefs":
                worker.postMessage({
                    "method": "prefs",
                    "prefs": pref_manager.get()
                });
                break;

            case "get_custom_css":
                worker.postMessage({
                    "method": "custom_css",
                    "css": pref_manager.cm.css_cache,
                    "emotes": pref_manager.cm.emote_cache
                });
                break;

            case "set_pref":
                pref_manager.set_pref(message.pref, message.value);
                break;

            case "force_update":
                pref_manager.cm.force_update(message.subreddit);
                break;

            case "open_options":
                open_options_page();
                break;

            default:
                console.log("BPM: ERROR: Unknown request from content script: '" + message.request + "'");
                break;
        }
    });
}

var main_mod = page_mod.PageMod({
    include: ["*"],
    contentScriptWhen: "start",
    contentScriptFile: [
        self.data.url("bpm-resources.js"),
        self.data.url("betterponymotes.js")
        ],
    onAttach: on_cs_attach
});

// Setup communication with prefs page
var prefs_mod = page_mod.PageMod({
    include: [self.data.url("options.html")],
    contentScriptWhen: "start",
    contentScriptFile: [
        self.data.url("bpm-resources.js"),
        self.data.url("options.js")
        ],
    onAttach: on_cs_attach
});

// Enable the button that opens the page
simple_prefs.on("openPrefs", open_options_page);
