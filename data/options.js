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

function traceback_wrapper(f) {
    return function() {
        try {
            return f.apply(this, arguments);
        } catch(e) {
            console.log("BPM: ERROR: Exception on line " + e.lineNumber + ": ", e.name + ": " + e.message);
        }
    }
}

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

var de_container;
var de_input;

function get_emotes() {
    var text = de_input.value;

    // Normalize things a bit
    var emotes = text.split(",");
    emotes = emotes.map(function(s) { return s.trim(); });
    emotes = emotes.filter(function(s) { return s.length; })

    return emotes;
}

function add_disabled_emote(emote) {
    var element = document.createElement("span");
    element.textContent = emote + " ";
    element.className = "disabled-emote"

    var close = document.createElement("a");
    close.textContent = "x";
    close.href = "#";

    close.addEventListener("click", function(event) {
        event.preventDefault();
        prefs.disabledEmotes.splice(prefs.disabledEmotes.indexOf(emote), 1);
        element.parentNode.removeChild(element);
        browser.prefs_updated();
    }, false);
    element.appendChild(close);

    de_container.insertBefore(element, de_input);
}

function insert_emotes(emotes) {
    emotes = emotes.map(function(s) {
        return (s[0] == "/" ? "" : "/") + s;
    });

    for(var i = 0; i < emotes.length; i++) {
        if(prefs.disabledEmotes.indexOf(emotes[i]) > -1) {
            continue; // Already in the list
        }
        if(!emote_map[emotes[i]]) {
            continue; // Not an actual emote
        }

        prefs.disabledEmotes.push(emotes[i]);
        browser.prefs_updated();
        add_disabled_emote(emotes[i]);
    }
}

function setup_de() {
    de_container = document.getElementById("de-container");
    de_input = document.getElementById("de-input");

    // NOTE: This list is never verified against emote_map. Doing that in the
    // backend script would make some sense, but then, maybe not.
    for(var i = 0; i < prefs.disabledEmotes.length; i++) {
        add_disabled_emote(prefs.disabledEmotes[i]);
    }

    // Container defers focus to input
    de_container.addEventListener("click", function(event) {
        de_input.focus();
    }, false);

    // Handle backspaces and enter key specially. Note that keydown sees the
    // input element as it was BEFORE the key is handled.
    de_input.addEventListener("keydown", traceback_wrapper(function(event) {
        if(event.keyCode == 8) { // Backspace key
            if(!de_input.value) {
                // The input was previously empty, so chop off an emote.

                // FIXME: This is a nasty way of doing things...
                var index = prefs.disabledEmotes.length - 1;
                prefs.disabledEmotes.splice(index, 1);
                de_container.removeChild(de_container.children[index]);

                browser.prefs_updated();
            }
        } else if(event.keyCode == 13) { // Return key
            var emotes = get_emotes();
            insert_emotes(emotes);
            de_input.value = "";
        }
    }), true);

    // Handle commas with the "proper" way to handle input.
    de_input.addEventListener("input", function(event) {
        var emotes = get_emotes();
        var text = de_input.value.trim();
        if(text[text.length - 1] == ",") {
            de_input.value = "";
        } else {
            de_input.value = emotes.pop() || "";
        }
        insert_emotes(emotes);
    }, false);

    de_input.addEventListener("submit", function(event) {
        event.preventDefault();
    }, false);

    document.getElementById("clear-disabled").addEventListener("click", function() {
        prefs.disabledEmotes = [];
        // Cute hack
        var spans = de_container.getElementsByTagName("span");
        for(var i = 0; i < spans.length; i++) {
            de_container.removeChild(spans[i]);
        }
        browser.prefs_updated();
    }, false);
}

function run() {
    // Basic boolean on/off checkbox pref
    function checkbox_pref(id) {
        var element = document.getElementById(id);
        element.checked = prefs[id];
        element.addEventListener("change", function() {
            prefs[id] = this.checked;
            browser.prefs_updated();
        }, false);
    }

    checkbox_pref("enableNSFW");
    checkbox_pref("enableExtraCSS");
    checkbox_pref("showUnknownEmotes");
    checkbox_pref("showAltText");
    checkbox_pref("enableGlobalEmotes");

    var search_limit = document.getElementById("searchLimit");
    search_limit.value = prefs.searchLimit;

    // Listen to, and validate, edits to the search limit
    search_limit.addEventListener("input", function() {
        // Forbid negatives. We could probably reason that zeros don't make
        // sense either, but whatever.
        var limit = Math.max(parseInt(search_limit.value, 10), 0);
        if(isNaN(limit)) {
            // If the input is completely invalid (or missing), we reset it and
            // pick the default.
            limit = 200;
            search_limit.value = "";
        } else {
            // Anything resembling a number we keep. Note that parseInt()
            // ignores invalid characters after it gets a number, so this will
            // effectively forbid non-integers.
            //
            // (As an edge case, inserting e.g. "x" into the middle of an
            // otherwise valid number will truncate it.)
            search_limit.value = limit;
        }

        prefs.searchLimit = limit;
        browser.prefs_updated();
    }, false);

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

    var sr_checkboxes = [];
    // Generate a page from the builtin list of subreddits
    for(var sr_name in sr_data) {
        var full_name = sr_data[sr_name][0];
        var element = gen_checkbox(full_name, prefs.enabledSubreddits[sr_name]);
        sr_checkboxes.push(element);

        // Closure to capture variables
        var callback = (function(sr_name) {
            return function() {
                prefs.enabledSubreddits[sr_name] = this.checked;
                browser.prefs_updated();
            };
        })(sr_name);

        element.addEventListener("change", callback, false);
    }

    document.getElementById("enable-all").addEventListener("click", function() {
        for(var i = 0; i < sr_checkboxes.length; i++) {
            sr_checkboxes[i].checked = true;
        }
        for(var sr_name in sr_data) {
            prefs.enabledSubreddits[sr_name] = true;
        }
        browser.prefs_updated();
    }, false);

    document.getElementById("disable-all").addEventListener("click", function() {
        for(var i = 0; i < sr_checkboxes.length; i++) {
            sr_checkboxes[i].checked = false;
        }
        for(var sr_name in sr_data) {
            prefs.enabledSubreddits[sr_name] = false;
        }
        browser.prefs_updated();
    }, false);

    setup_de();
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
