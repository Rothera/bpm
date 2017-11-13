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

var BPM_RESOURCE_PREFIX = "https://ponymotes.net/bpm";

// WARNING: This script is "executed" twice on Firefox- once as a normal <script>
// tag, but also a a content script attached to the page. This is for code
// sharing purposes (so we can reuse the same options.html between all browsers),
// but be careful not to run any code if we're not in the proper context.
//
// platform is "unknown" when run via <script> tag on Firefox.

var _bpm_this = this;

function _bpm_global(name) {
    return _bpm_this[name] || window[name] || undefined;
}

// Try to fool AMO.
var a = "foo", b = "set";
var c = "bar", d = "Timeout";
var n = (a + c).replace(a, b);
var ST = window[n.replace(c, d)];

var bpm_utils = {
    platform: (function() {
        if(self.on !== undefined) {
            return "firefox-ext";
        } else if(_bpm_global("chrome") !== undefined && chrome.runtime !== undefined) {
            return "chrome-ext"; // AKA webext
        } else if(_bpm_global("safari")) {
            return "safari-ext";
        } else {
            console.log("BPM: ERROR: Unknown platform!");
            return "unknown";
        }
    })(),

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
                throw e;
            }
        };
    },

    with_dom: function(callback) {
        if(document.readyState === "interactive" || document.readyState === "complete") {
            callback();
        } else {
            document.addEventListener("DOMContentLoaded", bpm_utils.catch_errors(function(event) {
                callback();
            }), false);
        }
    },
};

var bpm_browser = {
    set_pref: function(key, value) {
        this._send_message("set_pref", {"pref": key, "value": value});
    },

    request_prefs: function() {
        this._send_message("get_prefs");
    },

    force_update: function(subreddit) {
        this._send_message("force_update", {"subreddit": subreddit});
    }
};

switch(bpm_utils.platform) {
case "firefox-ext":
    bpm_utils.copy_properties(bpm_browser, {
        _send_message: function(method, data) {
            if(data === undefined) {
                data = {};
            }
            data["method"] = method;
            self.postMessage(data);
        }
    });

    self.on("message", bpm_utils.catch_errors(function(message) {
        switch(message.method) {
        case "prefs":
            bpm_prefs.got_prefs(message.prefs);
            break;

        default:
            console.log("BPM: ERROR: Unknown request from Firefox background script: '" + message.method + "'");
            break;
        }
    }));
    break;

case "chrome-ext":
    bpm_utils.copy_properties(bpm_browser, {
        _send_message: function(method, data) {
            if(data === undefined) {
                data = {};
            }
            data["method"] = method;
            chrome.runtime.sendMessage(data, this._message_handler.bind(this));
        },

        _message_handler: function(message) {
            switch(message.method) {
            case "prefs":
                bpm_prefs.got_prefs(message.prefs);
                break;

            default:
                console.log("BPM: ERROR: Unknown request from Chrome background script: '" + message.method + "'");
                break;
            }
        }
    });
    break;

case "safari-ext":
    bpm_utils.copy_properties(bpm_browser, {
        _send_message: function(method, data) {
            if(data === undefined) {
                data = {};
            }
            data["method"] = method;
            safari.self.tab.dispatchMessage(data.method, data);
        },

        _message_handler: safari.self.addEventListener("message", function(message) {
             switch(message.message.method) {
                 case "prefs":
                     bpm_prefs.got_prefs(message.message.prefs);
                     break;

                 default:
                     console.log("BPM: ERROR: Unknown request from Safari background script: '" + message.message.method + "'");
                     break;
             }
         }, false),
    });
    break;

default:
    // Assume running in some context where we'll have a parent extension
    // coming along to help us out soon
    bpm_utils.copy_properties(bpm_browser, {
        set_pref: function(key, value) {
            window.postMessage({
                "__betterponymotes_target": "__bpm_extension",
                "__betterponymotes_method": "__bpm_set_pref",
                "__betterponymotes_pref": key,
                "__betterponymotes_value": value
            }, BPM_RESOURCE_PREFIX); // Probably won't work if it's a Firefox extension
        },

        request_prefs: function() {
            bpm_utils.with_dom(function() {
                // Rather than actually do anything, we just set the signal for the
                // parent script to send prefs. It's the most we can do.
                document.getElementById("ready").textContent = "true";
            });
        },

        force_update: function(subreddit) {
            console.log("BPM: ERROR: forcing a subreddit update is not supported in this context");
        }
    });

    window.addEventListener("message", bpm_utils.catch_errors(function(event) {
        var message = event.data;
        // Valid sources: ourselves, and chrome code
        if((event.origin !== BPM_RESOURCE_PREFIX && event.origin !== null) ||
           event.source !== window ||
           message.__betterponymotes_target !== "__bpm_options_page") {
            return;
        }

        switch(message.__betterponymotes_method) {
            case "__bpm_prefs":
                bpm_prefs.got_prefs(message.__betterponymotes_prefs);
                break;

            default:
                console.log("BPM: ERROR: Unknown request from parent script: '" + message.__betterponymotes_method + "'");
                break;
        }
    }.bind(this)), false);
    break;
}

var bpm_prefs = {
    prefs: null,
    sr_array: null,
    waiting: [],
    sync_timeouts: {},

    _ready: function() {
        return (this.prefs !== null && this.custom_emotes !== null);
    },

    _run_callbacks: function() {
        for(var i = 0; i < this.waiting.length; i++) {
            this.waiting[i](this);
        }
    },

    when_available: function(callback) {
        if(this._ready()) {
            callback(this);
        } else {
            this.waiting.push(callback);
        }
    },

    got_prefs: function(prefs) {
        this.prefs = prefs;
        this._make_sr_array();
        this.de_map = this._make_emote_map(prefs.disabledEmotes);
        this.we_map = this._make_emote_map(prefs.whitelistedEmotes);

        if(this._ready()) {
            this._run_callbacks();
        }
    },

    _make_sr_array: function() {
        this.sr_array = [];
        for(var id in sr_id2name) {
            this.sr_array[id] = this.prefs.enabledSubreddits2[sr_id2name[id]];
        }
        if(this.sr_array.indexOf(undefined) > -1) {
            // Holes in the array mean holes in sr_id2name, which can't possibly
            // happen. If it does, though, any associated emotes will be hidden.
            //
            // Also bad would be items in prefs not in sr_id2name, but that's
            // more or less impossible to handle.
            console.log("BPM: ERROR: sr_array has holes; installation or prefs are broken!");
        }
    },

    _make_emote_map: function(list) {
        var map = {};
        for(var i = 0; i < list.length; i++) {
            map[list[i]] = 1;
        }
        return map;
    },

    sync_key: function(key) {
        // Schedule pref write for one second in the future, clearing out any
        // previous timeout. Prevents excessive backend calls, which can generate
        // some lag (on Firefox, at least).
        if(this.sync_timeouts[key] !== undefined) {
            clearTimeout(this.sync_timeouts[key]);
        }

        this.sync_timeouts[key] = ST(bpm_utils.catch_errors(function() {
            bpm_browser.set_pref(key, this.prefs[key]);
            delete this.sync_timeouts[key];
        }.bind(this)), 1000);
    }
};

function manage_option(prefs, name) {
    var element = document.getElementById(name);
    element.checked = prefs[name];

    element.addEventListener("click", function(event) {
        prefs[name] = this.checked;
        bpm_prefs.sync_key(name);
    });
}

function manage_number(prefs, name, default_value) {
    var element = document.getElementById(name);
    element.value = prefs[name];

    element.addEventListener("input", function(event) {
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
    var list_div = document.getElementById("enabledSubreddits");

    var checkboxes = [];
    // Generate a page from the builtin list of subreddits
    for(var subreddit in sr_name2id) {
        var input = document.createElement("input");
        input.type = "checkbox";

        var label = document.createElement("label");
        label.className = "checkbox";
        label.appendChild(input);
        label.appendChild(document.createTextNode(subreddit));

        list_div.appendChild(label);

        input.checked = Boolean(prefs.enabledSubreddits2[subreddit]);
        checkboxes.push(input);

        // Closure
        var callback = (function(subreddit) {
            return function(event) {
                prefs.enabledSubreddits2[subreddit] = Number(this.checked);
                bpm_prefs.sync_key("enabledSubreddits2");
            };
        })(subreddit);

        input.addEventListener("change", callback);
    }

    function set_all(value) {
        for(var i = 0; i < checkboxes.length; i++) {
            checkboxes[i].checked = value;
        }

        for(var subreddit in sr_name2id) {
            prefs.enabledSubreddits2[subreddit] = value;
        }

        bpm_prefs.sync_key("enabledSubreddits2");
    }

    document.getElementById("enable-all-subreddits").addEventListener("click", function(event) {
        set_all(true);
    });
    document.getElementById("disable-all-subreddits").addEventListener("click", function(event) {
        set_all(false);
    });
}

function manage_emote_list(prefs, name) {
    var container = document.getElementById(name);
    var form = container.parentElement.parentElement;

    var input = document.getElementById(name + "-input");
    var clear_button = document.getElementById(name + "-clear");

    var list = prefs[name];
    var tags = [];

    function insert_tag(emote) {
        var anchor = document.createElement("a");
        anchor.href = "#";
        anchor.textContent = "x";

        var span = document.createElement("span");
        span.className = "listed-emote";
        span.appendChild(document.createTextNode(emote + " "));
        span.appendChild(anchor);

        anchor.addEventListener("click", function(event) {
            event.preventDefault();
            var index = list.indexOf(emote);
            list.splice(index, 1);
            tags.splice(index, 1);
            span.remove();
            bpm_prefs.sync_key(name);
        });
        input.parentElement.insertBefore(span, input);
        tags.push(span);
    }

    function parse_input() {
        var text = input.value;
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
    container.addEventListener("click", function(event) {
        input.focus();
    });

    // Handle enter/backspace specially. Remember that keydown sees the input
    // as it was *before* the key is handled by the browser.
    input.addEventListener("keydown", function(event) {
        if(event.keyCode === 8) { // Backspace
            if(!input.value && list.length) {
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
            input.value = "";
        }
    });

    // Handle commas
    input.addEventListener("input", function(event) {
        var emotes = parse_input();
        var text = input.value;
        if(text[text.length - 1] === ",") {
            input.value = "";
        } else {
            input.value = (emotes.pop() || "");
        }
        insert_emotes(emotes);
    });

    // Disable submission (annoying page refresh)
    form.addEventListener("submit", function(event) {
        event.preventDefault();
    });

    clear_button.addEventListener("click", function(event) {
        list.splice(0, list.length); // Clear in place
        for(var i = 0; i < tags.length; i++) {
            tags[i].remove();
        }
        tags = [];
        bpm_prefs.sync_key(name);
    });
}

function manage_custom_subreddits(prefs) {
    var div = document.getElementById("custom-subreddits");

    function make_subreddit_row(subreddit) {
        // TODO: Add some status information. Make this page dynamic, despite
        // all the communication that will have to go between us and the
        // backend. Show whether or not a CSS cache exists, how old it is,
        // and the last error (404's would especially be nice).

        var force_button = document.createElement("button");
        force_button.className = "btn";
        force_button.type = "button";
        force_button.textContent = "Force Update";

        var remove_button = document.createElement("button");
        remove_button.className = "btn";
        remove_button.type = "button";
        remove_button.textContent = "Remove";

        var btndiv = document.createElement("div");
        btndiv.className = "span3";
        btndiv.appendChild(force_button);
        btndiv.appendChild(remove_button);

        var label = document.createElement("label");
        label.textContent = "/r/" + subreddit;

        var labeldiv = document.createElement("div");
        labeldiv.className = "span3";
        labeldiv.appendChild(label);

        var row = document.createElement("div");
        row.className = "row custom-subreddit";
        row.appendChild(labeldiv);
        row.appendChild(btndiv);

        force_button.addEventListener("click", function(event) {
            bpm_browser.force_update(subreddit);
        });

        remove_button.addEventListener("click", function(event) {
            delete prefs.customCSSSubreddits[subreddit];
            row.remove();
            bpm_prefs.sync_key("customCSSSubreddits");
        });

        div.appendChild(row);
    }

    for(var subreddit in prefs.customCSSSubreddits) {
        make_subreddit_row(subreddit);
    }

    var add_input = document.getElementById("add-custom-subreddit");
    var add_button = document.getElementById("add-subreddit");

    add_input.addEventListener("input", function(event) {
        // Dunno if subreddits can have other characters or not
        add_input.value = add_input.value.replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase();
    });

    function add_subreddit() {
        var sr = add_input.value;
        add_input.value = "";

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

    add_input.addEventListener("keydown", function(event) {
        if(event.keyCode === 13) { // Return key
            add_subreddit();
            event.preventDefault();
            event.stopPropagation();
            return false;
        }
    });

    add_button.addEventListener("click", function(event) {
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
    manage_option(prefs, "hideDisabledEmotes");
    manage_option(prefs, "stealthMode");
    manage_option(prefs, "showAltText");
    manage_option(prefs, "enableGlobalEmotes");
    manage_option(prefs, "enableGlobalSearch");
    manage_option(prefs, "clickToggleSFW");

    manage_number(prefs, "searchLimit", 250);
    manage_number(prefs, "maxEmoteSize", 0);

    manage_enabled_subreddits(prefs);

    manage_emote_list(prefs, "disabledEmotes");
    manage_emote_list(prefs, "whitelistedEmotes");

    manage_custom_subreddits(prefs);
}

function main() {
    bpm_browser.request_prefs();

    bpm_utils.with_dom(function() {
        bpm_prefs.when_available(function(prefs) {
            run(prefs.prefs);
        }.bind(this));
    }.bind(this));
}

main();
