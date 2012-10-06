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

var page_mod = require("page-mod");
var request = require("request");
var self = require("self");
var simple_prefs = require("simple-prefs");
var simple_storage = require("simple-storage");
var tabs = require("tabs");
var timers = require("timers");

var bpm_backendsupport = require("pref-setup").bpm_backendsupport;
var sr_data = require("sr-data");

var storage = simple_storage.storage;

// Main script. As an optimization, we just replace this mod (in order to change
// the list of matching URLs) whenever the global conversion option changes, so
// that the script doesn't needlessly run on all pages if BGM is disabled.
//
// This has a nasty side effect- the workers get "disconnected" and don't seem
// to be able to save settings. Consequently, changing the BGM option will mean
// all currently-open pages won't save the emote search window. I think.
var main_mod = null;

// Previous global emotes setting. Compare with ===/!== so the null triggers the
// initial run properly in prefs_updated().
var bgm_enabled = null;

// Monitor prefs for important changes
function prefs_updated(prefs) {
    var bgm_changed = prefs.enableGlobalEmotes !== bgm_enabled;

    if(bgm_changed) {
        if(main_mod !== null) {
            main_mod.destroy();
        }

        main_mod = page_mod.PageMod({
            include: [prefs.enableGlobalEmotes ? "*" : "*.reddit.com"],
            contentScriptWhen: "start",
            contentScriptFile: [
                self.data.url("emote-map.js"),
                self.data.url("sr-data.js"),
                self.data.url("betterponymotes.js")
                ],
            onAttach: on_cs_attach
            });
    }

    bgm_enabled = prefs.enableGlobalEmotes;
}

if(!storage.prefs) {
    storage.prefs = {};

    if(simple_prefs.prefs.enableNSFW !== undefined) {
        // Copy old prefs
        storage.prefs.enableNSFW = simple_prefs.prefs.enableNSFW;
        storage.prefs.enableExtraCSS = simple_prefs.prefs.enableExtraCSS;
    }
}

var pref_manager = bpm_backendsupport.manage_prefs(sr_data.sr_data, {
    read_value: function(key) { return storage[key]; },
    write_value: function(key, data) { storage[key] = data; },
    read_json: function(key) { return storage[key]; },
    write_json: function(key, data) { storage[key] = data; },

    prefs_updated: prefs_updated,

    download_file: function(done, url, callback) {
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

    set_timeout: timers.setTimeout
});

function on_cs_attach(worker) {
    worker.on("message", function(message) {
        switch(message.method) {
            case "get_prefs":
                worker.postMessage({
                    "method": "prefs",
                    "prefs": pref_manager.get()
                });
                break;

            case "set_prefs":
                pref_manager.write(message.prefs);
                break;

            case "force_update":
                pref_manager.cm.force_update(message.subreddit);
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

            default:
                console.log("BPM: ERROR: Unknown request from content script: '" + message.request + "'");
                break;
        }
    });
}

// Setup communication with prefs page
var prefs_mod = page_mod.PageMod({
    include: [self.data.url("options.html")],
    contentScriptWhen: "start",
    contentScriptFile: [
        self.data.url("emote-map.js"),
        self.data.url("sr-data.js"),
        self.data.url("jquery-1.8.2.js"),
        self.data.url("options.js")
        ],
    onAttach: on_cs_attach
});

// Enable the button that opens the page
simple_prefs.on("openPrefs", function() {
    tabs.open(self.data.url("options.html"));
});
