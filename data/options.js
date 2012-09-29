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

function manage_option(prefs, name) {
    var element = $("#" + name);
    element.attr("checked", prefs[name]);
    element.change(function(event) {
        prefs[name] = this.checked;
        bpm_prefs.sync_key(name);
    });
}

function manage_number(prefs, name, default_value) {
    var element = $("#" + name);
    element.val(prefs[name]);

    element.on("input", function(event) {
        // Forbid negatives
        var value = Math.max(parseInt(this.value, 10), 0);
        if(isNaN(value)) {
            // Completely unusable input- reset to default
            value = default_value;
            this.value = "";
        } else {
            // Effectively removes non-integers from the form.
            this.value = value;
        }

        prefs[name] = value;
        bpm_prefs.sync_key(name);
    });
}

function manage_enabled_subreddits(prefs) {
    // Subreddit enabler
    var list_div = $("#enabledSubreddits");

    var checkboxes = [];
    // Generate a page from the builtin list of subreddits
    for(var subreddit in sr_data) {
        var full_name = sr_data[subreddit][0];

        var label = $("<label><input type='checkbox'> " + full_name + "</label>");
        var input = label.find("input");
        list_div.append(label);
        input.attr("checked", prefs.enabledSubreddits[subreddit]);
        checkboxes.push(input[0]);

        // Closure
        var callback = (function(subreddit) {
            return function(event) {
                prefs.enabledSubreddits[subreddit] = this.checked;
                bpm_prefs.sync_key("enabledSubreddits");
            };
        })(subreddit);

        input.change(callback);
    }

    function set_all(value) {
        for(var i = 0; i < checkboxes.length; i++) {
            checkboxes[i].checked = value;
        }

        for(var subreddit in sr_data) {
            prefs.enabledSubreddits[subreddit] = value;
        }

        bpm_prefs.sync_key("enabledSubreddits");
    }

    $("#enable-all-subreddits").click(function(event) {
        set_all(true);
    });
    $("#disable-all-subreddits").click(function(event) {
        set_all(false);
    });
}

function manage_emote_list(prefs, name) {
    var container = $("#" + name);
    var input = $("#" + name + "-input");
    var clear_button = $("#" + name + "-clear");

    var list = prefs[name];
    var tags = [];

    function insert_tag(emote) {
        var span = $("<span class='listed-emote'>" + emote + " <a href='#'>x</a></span>");
        var anchor = span.find("a");
        anchor.click(function(event) {
            event.preventDefault();
            var index = list.indexOf(emote);
            list.splice(index, 1);
            tags.splice(index, 1);
            span.remove();
            bpm_prefs.sync_key(name);
        });
        input.before(span);
        tags.push(span);
    }

    function parse_input() {
        var text = input.val();
        var emotes = text.split(",");
        // Normalize things a bit
        emotes = emotes.map(function(s) { return s.trim(); });
        emotes = emotes.filter(function(s) { return s.length; });
        return emotes;
    }

    function insert_emotes(emotes) {
        emotes = emotes.map(function(s) {
            return (s[0] === "/" ? "" : "/") + s;
        });

        var changed = false;
        for(var i = 0; i < emotes.length; i++) {
            if(list.indexOf(emotes[i]) > -1) {
                continue; // Already in the list
            }
            if(!emote_map[emotes[i]]) {
                continue; // Not an emote (NOTE: what about global emotes?)
            }

            list.push(emotes[i]);
            insert_tag(emotes[i]);
            changed = true;
        }

        if(changed) {
            bpm_prefs.sync_key(name);
        }
    }

    // NOTE: This list isn't verified against emote_map at all. Should we?
    for(var i = 0; i < list.length; i++) {
        insert_tag(list[i]);
    }

    // Defer focus
    container.click(function(event) {
        input.focus();
    });

    // Handle enter/backspace specially. Remember that keydown sees the input
    // as it was *before* the key is handled by the browser.
    input.keydown(function(event) {
        if(event.keyCode === 8) { // Backspace
            if(!input.val() && list.length) {
                // Empty input means chop off the last item
                var index = list.length - 1;
                tags[index].remove();

                list.splice(index, 1);
                tags.splice(index, 1);

                bpm_prefs.sync_key(name);
            }
        } else if(event.keyCode === 13) { // Return key
            var emotes = parse_input();
            insert_emotes(emotes);
            input.val("");
        }
    });

    // Handle commas
    input.on("input", function(event) {
        var emotes = parse_input();
        var text = input.val();
        if(text[text.length - 1] === ",") {
            input.val("");
        } else {
            input.val(emotes.pop() || "");
        }
        insert_emotes(emotes);
    });

    clear_button.click(function(event) {
        list.splice(0, list.length); // Clear in place
        for(var i = 0; i < tags.length; i++) {
            tags[i].remove();
        }
        tags = [];
        bpm_prefs.sync_key(name);
    });
}

function manage_custom_subreddits(prefs) {
    var div = $("#custom-subreddits");

    function make_subreddit_row(subreddit) {
        // TODO: Add some status information. Make this page dynamic, despite
        // all the communication that will have to go between us and the
        // backend. Show whether or not a CSS cache exists, how old it is,
        // and the last error (404's would especially be nice).
        var row = $([
            "<div class='row custom-subreddit'>",
            "  <div class='span3'>",
            "    <label>r/" + subreddit + "</label>",
            "  </div>",
            "  <div class='span3'>",
            "    <button class='btn' type='button'>Force Update</button>",
            "    <button class='btn' type='button'>Remove</button>",
            "  </div>",
            "</div>"
            ].join(""));

        var force_button = $(row.find("button")[0]);
        var remove_button = $(row.find("button")[1]);

        force_button.click(function(event) {
            bpm_prefs.force_update(subreddit);
        });

        remove_button.click(function(event) {
            delete prefs.customCSSSubreddits[subreddit];
            row.remove();
            bpm_prefs.sync_key("customCSSSubreddits");
        });

        div.append(row);
    }

    for(var subreddit in prefs.customCSSSubreddits) {
        make_subreddit_row(subreddit);
    }

    var add_input = $("#add-custom-subreddit");
    var add_button = $("#add-subreddit");

    add_input.on("input", function(event) {
        // Dunno if subreddits can have other characters or not
        add_input.val(add_input.val().replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase());
    });

    function add_subreddit() {
        var sr = add_input.val();
        add_input.val("");

        if(sr in prefs.customCSSSubreddits) {
            return;
        }

        // TODO: Make a little spinny circle icon and make a request to Reddit
        // to confirm whether or not the subreddit even exists, and deny its
        // creation if it doesn't.
        prefs.customCSSSubreddits[sr] = 0;
        bpm_prefs.sync_key("customCSSSubreddits");
        make_subreddit_row(sr);
    }

    add_input.keydown(function(event) {
        if(event.keyCode === 13) { // Return key
            add_subreddit();
            event.preventDefault();
            event.stopPropagation();
            return false;
        }
    });

    add_button.click(function(event) {
        add_subreddit();
        event.preventDefault();
        event.stopPropagation();
        return false;
    });
}

function run(prefs) {
    manage_option(prefs, "enableNSFW");
    manage_option(prefs, "enableExtraCSS");
    manage_option(prefs, "showUnknownEmotes");
    manage_option(prefs, "showAltText");
    manage_option(prefs, "enableGlobalEmotes");
    manage_option(prefs, "enableGlobalSearch");

    manage_number(prefs, "searchLimit", 200);
    manage_number(prefs, "maxEmoteSize", 0);

    manage_enabled_subreddits(prefs);

    manage_emote_list(prefs, "disabledEmotes");
    manage_emote_list(prefs, "whitelistedEmotes");

    manage_custom_subreddits(prefs);
}

function main() {
    var _doc_loaded = false;
    var _prefs_loaded = null;

    window.addEventListener("DOMContentLoaded", function() {
        _doc_loaded = true;
        if(_doc_loaded && _prefs_loaded !== null) {
            run(_prefs_loaded.prefs);
        }
    }, false);

    bpm_prefs.when_available(function(prefs) {
        _prefs_loaded = prefs;
        if(_doc_loaded && _prefs_loaded !== null) {
            run(prefs.prefs);
        }
    });

    switch(bpm_utils.platform) {
    case "firefox-ext":
        bpm_browser.send_message("get_prefs");
        break;

    case "chrome-ext":
        chrome.extension.sendMessage({"method": "get_prefs"}, bpm_prefs.got_prefs.bind(bpm_prefs));
        break;

    case "opera-ext":
        bpm_browser.send_message("get_prefs");
        break;
    }
}

main();
