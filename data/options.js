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

var bpm_utils = {
    // Browser detection- this script runs unmodified on all supported platforms,
    // so inspect a couple of potential global variables to see what we have.
    platform: (function(global) {
        // FIXME: "self" is a standard object, though self.on is specific to
        // Firefox content scripts. I'd prefer something a little more clearly
        // affiliated, though.
        if(self.on !== undefined) {
            return "firefox-ext";
        } else if(global.chrome !== undefined && global.chrome.extension !== undefined) {
            return "chrome-ext";
        } else if(global.opera !== undefined && global.opera.extension !== undefined) {
            return "opera-ext";
        } else {
            console.log("BPM: ERROR: Unknown platform!");
            return "unknown";
        }
    })(this),

    copy_properties: function(to, from) {
        for(var key in from) {
            to[key] = from[key];
        }
    },

    catch_errors: function(f) {
        return function() {
            try {
                return f.apply(this, arguments);
            } catch(e) {
                console.log("BPM: ERROR: Exception on line " + e.lineNumber + ": ", e.name + ": " + e.message);
            }
        };
    }
};

var bpm_browser = {
    send_message: function(method, data) {
        if(data === undefined) {
            this._send_message({"method": method});
        } else {
            data["method"] = method;
            this._send_message(data);
        }
    }
};

switch(bpm_utils.platform) {
case "firefox-ext":
    bpm_utils.copy_properties(bpm_browser, {
        _send_message: function(data) {
            self.postMessage(data);
        }
    });

    self.on("message", function(message) {
        switch(message.method) {
        case "prefs":
            bpm_prefs.got_prefs(message.prefs);
            break;

        default:
            console.log("BPM: ERROR: Unknown request from Firefox background script: '" + message.method + "'");
            break;
        }
    });
    break;

case "chrome-ext":
    bpm_utils.copy_properties(bpm_browser, {
        _send_message: function(data) {
            chrome.extension.sendMessage(data);
        }
    });
    break;

case "opera-ext":
    bpm_utils.copy_properties(bpm_browser, {
        _send_message: function(data) {
            opera.extension.postMessage(data);
        }
    });

    opera.extension.addEventListener("message", function(event) {
        var message = event.data;
        switch(message.method) {
        case "prefs":
            bpm_prefs.got_prefs(message.prefs);
            break;

        default:
            console.log("BPM: ERROR: Unknown request from Opera background script: '" + message.method + "'");
            break;
        }
    }, false);
    break;
}

var bpm_prefs = {
    prefs: null,
    sr_array: null,
    waiting: [],

    when_available: function(callback) {
        if(this.prefs) {
            callback(this);
        } else {
            this.waiting.push(callback);
        }
    },

    got_prefs: function(prefs) {
        this.prefs = prefs;
        this.make_sr_array();
        this.de_map = this.make_emote_map(prefs.disabledEmotes);
        this.we_map = this.make_emote_map(prefs.whitelistedEmotes);

        for(var i = 0; i < this.waiting.length; i++) {
            this.waiting[i](this);
        }
    },

    make_sr_array: function() {
        this.sr_array = [];
        for(var id in sr_id_map) {
            this.sr_array[id] = this.prefs.enabledSubreddits[sr_id_map[id]];
        }
        if(this.sr_array.indexOf(undefined) > -1) {
            // Holes in the array mean holes in sr_id_map, which can't possibly
            // happen. If it does, though, any associated emotes will be hidden.
            //
            // Also bad would be items in prefs not in sr_id_map, but that's
            // more or less impossible to handle.
            console.log("BPM: ERROR: sr_array has holes; installation or prefs are broken!");
        }
    },

    make_emote_map: function(list) {
        var map = {};
        for(var i = 0; i < list.length; i++) {
            map[list[i]] = 1;
        }
        return map;
    },

    sync_key: function(key) {
        // No sync_timeouts for options page; would be bad as we don't want to
        // lose any prefs due to quickly closing the page
        bpm_browser.send_message("set_pref", {"pref": key, "value": this.prefs[key]});
    },

    force_update: function(subreddit) {
        bpm_browser.send_message("force_update", {"subreddit": subreddit});
    }
};

function setup_emote_list(prefs, container, input, clear_button, pref_name) {
    var list = prefs[pref_name];

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
            bpm_prefs.sync_key(pref_name);
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
            bpm_prefs.sync_key(pref_name);
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
    input.addEventListener("keydown", bpm_utils.catch_errors(function(event) {
        if(event.keyCode === 8) { // Backspace key
            if(!input.value) {
                // The input was previously empty, so chop off an emote.

                // FIXME: This is a nasty way of doing things...
                var index = list.length - 1;
                list.splice(index, 1);
                container.removeChild(container.children[index]);

                bpm_prefs.sync_key(pref_name);
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
        bpm_prefs.sync_key(pref_name);
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

function run(prefs) {
    // Basic boolean on/off checkbox pref
    function checkbox_pref(id) {
        var element = document.getElementById(id);
        element.checked = prefs[id];
        element.addEventListener("change", function() {
            prefs[id] = this.checked;
            bpm_prefs.sync_key(id);
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
        bpm_prefs.sync_key("searchLimit");
    });

    var max_size = document.getElementById("maxEmoteSize");
    max_size.value = prefs.maxEmoteSize;

    force_number(max_size, 0, function(size) {
        prefs.maxEmoteSize = size;
        bpm_prefs.sync_key("maxEmoteSize");
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
                bpm_prefs.sync_key("enabledSubreddits");
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
        bpm_prefs.sync_key("enabledSubreddits");
    }, false);

    document.getElementById("disable-all").addEventListener("click", function() {
        for(var i = 0; i < sr_checkboxes.length; i++) {
            sr_checkboxes[i].checked = false;
        }
        for(var sr_name in sr_data) {
            prefs.enabledSubreddits[sr_name] = false;
        }
        bpm_prefs.sync_key("enabledSubreddits");
    }, false);

    var de_container = document.getElementById("de-container");
    var de_input = document.getElementById("de-input");
    var de_clear = document.getElementById("de-clear");
    setup_emote_list(prefs, de_container, de_input, de_clear, "disabledEmotes");

    var we_container = document.getElementById("we-container");
    var we_input = document.getElementById("we-input");
    var we_clear = document.getElementById("we-clear");
    setup_emote_list(prefs, we_container, we_input, we_clear, "whitelistedEmotes");

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
            bpm_prefs.force_update(subreddit);
        }; })(subreddit), false);

        remove.addEventListener("click", (function(subreddit) { return function(event) {
            delete prefs.customCSSSubreddits[subreddit];
            custom_sr_div.removeChild(div1);
            bpm_prefs.sync_key("customCSSSubreddits");
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
        bpm_prefs.sync_key("customCSSSubreddits");
        add_sr_html(sr);
        add_input.value = "";
    }

    add_input.addEventListener("keydown", bpm_utils.catch_errors(function(event) {
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

function main() {
    var _doc_loaded = false;
    var _prefs_loaded = null;

    window.addEventListener("DOMContentLoaded", function() {
        _doc_loaded = true;
        if(_doc_loaded && _prefs_loaded) {
            run(_prefs_loaded.prefs);
        }
    }, false);

    bpm_prefs.when_available(function(prefs) {
        _prefs_loaded = prefs;
        if(_doc_loaded && _prefs_loaded) {
            run(prefs.prefs);
        }
    });

    switch(bpm_utils.platform) {
    case "firefox-ext":
        // Make backend request for prefs
        self.postMessage({"method": "get_prefs"});
        break;

    case "chrome-ext":
        chrome.extension.sendMessage({"method": "get_prefs"}, set_prefs);
        break;

    case "opera-ext":
        opera.extension.postMessage({"method": "get_prefs"});
        break;
    }
}

main();
