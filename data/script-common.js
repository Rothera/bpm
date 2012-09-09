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

/*
 * Misc. code common to the BPM and BGM scripts.
 *
 * Importing/loading this file has side-effects. A request is made to the
 * addon backend for preference data.
 */

// Browser detection- this script runs unmodified on all supported platforms,
// so inspect a couple of potential global variables to see what we have.
var platform = "unknown";
// "self" exists on Chrome as well. I don't know what it is
if(typeof(self.on) !== "undefined") {
    platform = "firefox";
} else if(typeof(chrome) !== "undefined") {
    platform = "chrome";
} else if(typeof(opera) !== "undefined") {
    platform = "opera";
}

var pref_cache = null;
var pref_callbacks = [];

// callback(prefs) gets run when preferences are available
function get_prefs(callback) {
    if(pref_cache !== null) {
        callback(pref_cache);
    } else {
        pref_callbacks.push(callback);
    }
}

// Called from the browser-specific code
function set_prefs(prefs) {
    pref_cache = prefs;
    for(var i = 0; i < pref_callbacks.length; i++) {
        pref_callbacks[i](prefs);
    }
    pref_callbacks = [];
}

// Setup some platform-agnostic API's- preferences and CSS
var prefs_updated, apply_css;

switch(platform) {
    case "firefox":
        prefs_updated = function() {
            self.port.emit("set_prefs", pref_cache);
        };

        apply_css = function(filename) {
            // CSS is handled in main.js on Firefox
        };

        self.port.on("prefs", set_prefs);
        self.port.emit("get_prefs");
        break;

    case "chrome":
        prefs_updated = function() {
            chrome.extension.sendMessage({"method": "set_prefs", "prefs": pref_cache});
        };

        apply_css = function(filename) {
            // <link> to our embedded file
            var tag = document.createElement("link");
            tag.href =  chrome.extension.getURL(filename);
            tag.rel = "stylesheet";
            // I think this ends up in <head> for some reason
            document.documentElement.insertBefore(tag);
        };

        chrome.extension.sendMessage({"method": "get_prefs"}, set_prefs);
        break;

    case "opera":
        var is_opera_next;
        var get_file;

        // Opera Next (12.50) has a better API to load the contents of an
        // embedded file than making a request to the backend process. Use
        // that if available.
        if(opera.extension.getFile) {
            is_opera_next = true; // Close enough!
            get_file = function(filename, callback) {
                var file = opera.extension.getFile(filename);
                if(file) {
                    var reader = new FileReader();
                    reader.onload = function() {
                        callback(reader.result);
                    };
                    reader.readAsText(file);
                } else {
                    console.log("BPM: ERROR: Opera getFile() failed on '" + filename + "'");
                }
            };
        } else {
            is_opera_next = false;
            var file_callbacks = {};

            get_file = function(filename, callback) {
                file_callbacks[filename] = callback;
                opera.extension.postMessage({
                    "method": "get_file",
                    "filename": filename
                });
            };
        }

        prefs_updated = function() {
            opera.extension.postMessage({"method": "set_prefs", "prefs": pref_cache});
        };

        apply_css = function(filename) {
            get_file(filename, function(data) {
                var tag = document.createElement("style");
                tag.setAttribute("type", "text/css");
                tag.appendChild(document.createTextNode(data));
                document.head.insertBefore(tag, document.head.firstChild);
            });
        };

        opera.extension.addEventListener("message", function(event) {
            var message = event.data;
            switch(message.method) {
                case "file_loaded":
                    file_callbacks[message.filename](message.data);
                    delete file_callbacks[message.filename];
                    break;

                case "prefs":
                    set_prefs(message.prefs);
                    break;

                default:
                    console.log("BPM: ERROR: Unknown request from Opera background script: '" + message.method + "'");
                    break;
            }
        }, false);

        opera.extension.postMessage({
            "method": "get_prefs"
        });
        break;
}

// Converts an emote name (or similar) to the associated CSS class.
//
// Keep this in sync with the Python code.
function sanitize(s) {
    return s.toLowerCase().replace("!", "_excl_").replace(":", "_colon_");
}

// Converts a map of enabled subreddits to an array, indexed by subreddit ID.
function make_sr_array(prefs) {
    var sr_array = [];
    for(var id in sr_id_map) {
        sr_array[id] = prefs.enabledSubreddits[sr_id_map[id]];
    }
    if(sr_array.indexOf(undefined) > -1) {
        // Holes in the array mean holes in sr_id_map, which can't possibly
        // happen. If it does, though, any associated emotes will be hidden.
        //
        // Also bad would be items in prefs not in sr_id_map, but that's
        // more or less impossible to handle.
        console.log("BPM: ERROR: sr_array has holes; installation or prefs are broken!");
    }
    return sr_array;
}
