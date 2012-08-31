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

// WARNING: This script is "executed" twice on Firefox- once as a normal <script>
// tag, but also a a content script attached to the page. This is for code
// sharing purposes (so we can reuse the same options.html between all browsers),
// but be careful not to run any code if we're not in the proper context.
//
// platform is "unknown" when run via <script> tag on Firefox.

// Platform check
function current_platform() {
    if(typeof(self.on) !== "undefined") {
        return "firefox";
    } else if(typeof(chrome) !== "undefined") {
        return "chrome";
    } else if(typeof(opera) !== "undefined") {
        return "opera";
    } else {
        return "unknown";
    }
}
var platform = current_platform();

var _doc_loaded = false;
var prefs = null;

// Some basic platform API's. Not much here yet.
var browser;
switch(platform) {
    case "firefox":
        // On Firefox, this script is run as a content script, so we need
        // to communicate with main.js.
        browser = {
            prefs_updated: function() {
                self.port.emit("set_prefs", prefs);
            }
        };
        break;

    case "chrome":
    case "opera":
        // On Chrome and Opera, localStorage is the same as what the
        // background process accesses, so we can just modify it directly.
        browser = {
            prefs_updated: function() {
                localStorage.prefs = JSON.stringify(prefs);
            }
        };
        break;
}

function run() {
    // Cache elements
    var enable_nsfw = document.getElementById("enableNSFW");
    var enable_extracss = document.getElementById("enableExtraCSS");

    // Initialize values from stored prefs
    enable_nsfw.checked = prefs.enableNSFW;
    enable_extracss.checked = prefs.enableExtraCSS;

    // Listen for edits to the checkboxes
    function checkbox_pref(element, pref_name) {
        element.addEventListener("change", function() {
            prefs[pref_name] = this.checked;
            browser.prefs_updated();
        }, false);
    }

    checkbox_pref(enable_nsfw, "enableNSFW");
    checkbox_pref(enable_extracss, "enableExtraCSS");

    // Subreddit enabler
    var sr_list_element = document.getElementById("sr-list");
    function gen_checkbox(label, value) {
        // Generate the following HTML:
        // <label><input type="checkbox" value="?"> Some text here</label><br>
        var label_element = document.createElement("label");
        var input_element = document.createElement("input");
        input_element.type = "checkbox";
        input_element.checked = value;
        label_element.appendChild(input_element);
        label_element.appendChild(document.createTextNode(" " + label));
        sr_list_element.appendChild(label_element);
        return input_element;
    }

    // Generate a page from the builtin list of subreddits
    for(var sr_name in sr_data) {
        var full_name = sr_data[sr_name][0];
        var element = gen_checkbox(full_name, prefs.enabledSubreddits[sr_name]);

        // Closure to capture variables
        var callback = (function(sr_name) {
            return function() {
                prefs.enabledSubreddits[sr_name] = this.checked;
                browser.prefs_updated();
            };
        })(sr_name);

        element.addEventListener("change", callback, false);
    }
}

window.addEventListener("DOMContentLoaded", function() {
    _doc_loaded = true;
    // Never true in Firefox <script>
    if(_doc_loaded && prefs !== null) {
        run();
    }
}, false);

switch(platform) {
    case "firefox":
        // Make backend request for prefs
        self.port.on("prefs", function(_prefs) {
            prefs = _prefs;
            if(_doc_loaded && prefs !== null) {
                run();
            }
        });

        self.port.emit("get_prefs");
        break;

    case "chrome":
    case "opera":
        prefs = JSON.parse(localStorage.prefs);
        if(_doc_loaded && prefs !== null) {
            run();
        }
        break;
}
