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
    };
}

var _doc_loaded = false;
var prefs = null;

// Called from the browser-specific code
function set_prefs(_prefs) {
    prefs = _prefs;
    if(_doc_loaded && prefs !== null) {
        run();
    }
}

// Some basic platform API's. Not much here yet.
var browser;
switch(platform) {
    case "firefox":
        // On Firefox, this script is run as a content script, so we need
        // to communicate with main.js.
        self.on("message", function(message) {
            switch(message.method) {
                case "prefs":
                    set_prefs(message.prefs);
                    break;

                default:
                    console.log("BPM: ERROR: Unknown request from Firefox background script: '" + message.method + "'");
                    break;
            }
        });

        browser = {
            prefs_updated: function() {
                self.postMessage({"method": "set_prefs", "prefs": prefs});
            },

            force_update: function(subreddit) {
                self.postMessage({"method": "force_update", "subreddit:" subreddit});
            }
        };
        break;

    // On Chrome and Opera, localStorage can be directly written to, but we
    // write by sending messages in order to keep CSS cache code in one place.
    case "chrome":
        browser = {
            prefs_updated: function() {
                chrome.extension.sendMessage({"method": "set_prefs", "prefs": prefs});
            },

            force_update: function(subreddit) {
                chrome.extension.sendMessage({"method": "force_update", "subreddit": subreddit});
            }
        };
        break;

    case "opera":
        opera.extension.addEventListener("message", function(event) {
            var message = event.data;
            switch(message.method) {
                case "prefs":
                    set_prefs(message.prefs);
                    break;

                default:
                    console.log("BPM: ERROR: Unknown request from Opera background script: '" + message.method + "'");
                    break;
            }
        }, false);

        browser = {
            prefs_updated: function() {
                opera.extension.postMessage({"method": "set_prefs", "prefs": prefs});
            },

            force_update: function(subreddit) {
                opera.extension.postMessage({"method": "force_update", "subreddit": subreddit});
            }
        };
        break;
}

function setup_emote_list(container, input, clear_button, list) {
    function add_emote(emote) {
        var element = document.createElement("span");
        element.textContent = emote + " ";
        element.className = "listed-emote";

        var close = document.createElement("a");
        close.textContent = "x";
        close.href = "#";

        close.addEventListener("click", function(event) {
            event.preventDefault();
            list.splice(list.indexOf(emote), 1);
            element.parentNode.removeChild(element);
            browser.prefs_updated();
        }, false);
        element.appendChild(close);

        container.insertBefore(element, input);
    }

    function get_emotes() {
        var text = input.value;

        // Normalize things a bit
        var emotes = text.split(",");
        emotes = emotes.map(function(s) { return s.trim(); });
        emotes = emotes.filter(function(s) { return s.length; });

        return emotes;
    }

    function insert_emotes(emotes) {
        emotes = emotes.map(function(s) {
            return (s[0] === "/" ? "" : "/") + s;
        });

        for(var i = 0; i < emotes.length; i++) {
            if(list.indexOf(emotes[i]) > -1) {
                continue; // Already in the list
            }
            if(!emote_map[emotes[i]]) {
                continue; // Not an actual emote
            }

            list.push(emotes[i]);
            browser.prefs_updated();
            add_emote(emotes[i]);
        }
    }

    // NOTE: This list is never verified against emote_map. Doing that in the
    // backend script would make some sense, but then, maybe not.
    for(var i = 0; i < list.length; i++) {
        add_emote(list[i]);
    }

    // Container defers focus to input
    container.addEventListener("click", function(event) {
        input.focus();
    }, false);

    // Handle backspaces and enter key specially. Note that keydown sees the
    // input element as it was BEFORE the key is handled.
    input.addEventListener("keydown", traceback_wrapper(function(event) {
        if(event.keyCode === 8) { // Backspace key
            if(!input.value) {
                // The input was previously empty, so chop off an emote.

                // FIXME: This is a nasty way of doing things...
                var index = list.length - 1;
                list.splice(index, 1);
                container.removeChild(container.children[index]);

                browser.prefs_updated();
            }
        } else if(event.keyCode === 13) { // Return key
            var emotes = get_emotes();
            insert_emotes(emotes);
            input.value = "";
        }
    }), false);

    // Handle commas with the "proper" way to handle input.
    input.addEventListener("input", function(event) {
        var emotes = get_emotes();
        var text = input.value.trim();
        if(text[text.length - 1] === ",") {
            input.value = "";
        } else {
            input.value = emotes.pop() || "";
        }
        insert_emotes(emotes);
    }, false);

    clear_button.addEventListener("click", function() {
        list.splice(0, list.length); // Clear in place
        // Cute hack
        var spans = container.getElementsByTagName("span");
        for(var i = 0; i < spans.length; i++) {
            container.removeChild(spans[i]);
        }
        browser.prefs_updated();
    }, false);
}

function force_number(element, default_value, callback) {
    // Validate edits
    element.addEventListener("input", function() {
        // Forbid negatives
        var value = Math.max(parseInt(element.value, 10), 0);
        if(isNaN(value)) {
            // If the input is completely invalid (or missing), we reset it and
            // pick the default.
            value = default_value;
            element.value = "";
        } else {
            // Anything resembling a number we keep. Note that parseInt()
            // ignores invalid characters after it gets a number, so this will
            // effectively forbid non-integers.
            //
            // (As an edge case, inserting e.g. "x" into the middle of an
            // otherwise valid number will truncate it.)
            element.value = value;
        }

        callback(value);
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

    force_number(search_limit, 200, function(limit) {
        prefs.searchLimit = limit;
        browser.prefs_updated();
    });

    var max_size = document.getElementById("maxEmoteSize");
    max_size.value = prefs.maxEmoteSize;

    force_number(max_size, 0, function(size) {
        prefs.maxEmoteSize = size;
        browser.prefs_updated();
    });

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

    var de_container = document.getElementById("de-container");
    var de_input = document.getElementById("de-input");
    var de_clear = document.getElementById("de-clear");
    setup_emote_list(de_container, de_input, de_clear, prefs.disabledEmotes);

    var we_container = document.getElementById("we-container");
    var we_input = document.getElementById("we-input");
    var we_clear = document.getElementById("we-clear");
    setup_emote_list(we_container, we_input, we_clear, prefs.whitelistedEmotes);

    var custom_sr_div = document.getElementById("custom-subreddits");

    function add_sr_html(subreddit) {
        // Oh god, this is awful.

        // TODO: Add some status information. Make this page dynamic, despite
        // all the communication that will have to go between us and the
        // backend. Show whether or not a CSS cache exists, how old it is,
        // and the last error (404's would especially be nice).
        var div1 = document.createElement("div");
        var div2 = document.createElement("div");
        var div3 = document.createElement("div");
        div1.className = "row custom-subreddit";
        div2.className = "span3";
        div3.className = "span3";

        var label = document.createElement("label");
        label.textContent = "r/" + subreddit;

        var force = document.createElement("button");
        var remove = document.createElement("button");
        force.className = remove.className = "btn";
        force.type = remove.type = "button";
        force.textContent = "Force Update";
        remove.textContent = "Remove";

        div1.appendChild(div2);
        div1.appendChild(div3);
        div2.appendChild(label);
        div3.appendChild(force);
        div3.appendChild(remove);

        force.addEventListener("click", (function(subreddit) { return function(event) {
            browser.force_update(subreddit);
        }; })(subreddit), false);

        remove.addEventListener("click", (function(subreddit) { return function(event) {
            delete prefs.customCSSSubreddits[subreddit];
            custom_sr_div.removeChild(div1);
            browser.prefs_updated();
        }; })(subreddit), false);

        custom_sr_div.appendChild(div1);
    }

    for(var subreddit in prefs.customCSSSubreddits) {
        add_sr_html(subreddit);
    }

    var add_input = document.getElementById("add-custom-subreddit");
    var add_button = document.getElementById("add-subreddit");

    add_input.addEventListener("input", function(event) {
        // Dunno if subreddits can have other characters or not
        add_input.value = add_input.value.replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase();
    }, false);

    function add_subreddit() {
        var sr = add_input.value;
        if(sr in prefs.customCSSSubreddits) {
            add_input.value = "";
            return;
        }
        // TODO: Make a little spinny circle icon and make a request to Reddit
        // to confirm whether or not the subreddit even exists, and deny its
        // creation if it doesn't.
        prefs.customCSSSubreddits[sr] = 0;
        browser.prefs_updated();
        add_sr_html(sr);
        add_input.value = "";
    }

    add_input.addEventListener("keydown", traceback_wrapper(function(event) {
        if(event.keyCode === 13) { // Return key
            add_subreddit();
            event.preventDefault();
            event.stopPropagation();
            return false;
        }
    }), false);

    add_button.addEventListener("click", function(event) {
        add_subreddit();
        event.preventDefault();
        event.stopPropagation();
        return false;
    }, false);
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
        self.postMessage({"method": "get_prefs"});
        break;

    case "chrome":
        chrome.extension.sendMessage({"method": "get_prefs"}, set_prefs);
        break;

    case "opera":
        opera.extension.postMessage({"method": "get_prefs"});
        break;
}
