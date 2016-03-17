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

// public functions:
// - initialize_prefs() from userscript
// - manage_prefs() from backends
// cm.force_update() from backends

var default_prefs = {
    "enableNSFW": false,
    "enableExtraCSS": true,
    "showUnknownEmotes": true,
    "hideDisabledEmotes": false,
    "stealthMode": false,
    "showAltText": true,
    "enableGlobalEmotes": false,
    "enableGlobalSearch": false,
    "clickToggleSFW": true,
    "searchLimit": 250,
    "maxEmoteSize": 0,
    "enabledSubreddits2": {}, // subreddit name -> 0/1 enabled
    "disabledEmotes": [],
    "whitelistedEmotes": [],
    "customCSSSubreddits": {}, // subreddit name -> timestamp
    "blacklistedSubreddits": {}, // subreddit name -> true

    "searchBoxInfo": [600, 25, 620, 450],
    "lastSearchQuery": "sr:mylittlepony",
    "globalIconPos": [16, 16]
    };
//Platform is not defined here so we duplicate our 'is this discord' logic
if(window.process) {
//We are always global in discord, so these prefs actually
//function as enable/disable functionality.
    default_prefs.enableGlobalEmotes = true;
    default_prefs.enableGlobalSearch = true;
//Discord-specific preferences    
    default_prefs.disableDisruptiveEmotes = true;
    default_prefs.disableEmotesInCodeBlocks = false;
}

function initialize_prefs(prefs, sr_name2id) {
    for(var key in default_prefs) {
        if(prefs[key] === undefined) {
            prefs[key] = default_prefs[key];
        }
    }

    // Migration from previous schema
    if(prefs.enabledSubreddits !== undefined) {
        for(var old_sr in prefs.enabledSubreddits) {
          // r_mlp -> r/mlp
          if(old_sr === "bpmextras") {
              continue;
          }
          var new_sr = old_sr.replace("_", "/");
          var value = Number(prefs.enabledSubreddits[old_sr])
          prefs.enabledSubreddits2[new_sr] = value;
        }
        delete prefs.enabledSubreddits;
    }

    // New subreddits
    for(var sr in sr_name2id) {
        if(prefs.enabledSubreddits2[sr] === undefined) {
            prefs.enabledSubreddits2[sr] = 1;
        }
    }
    // Removed subreddits
    for(var sr in prefs.enabledSubreddits2) {
        // Cast to int while we're at it- I think I screwed this up before
        prefs.enabledSubreddits2[sr] = +prefs.enabledSubreddits2[sr];

        if(sr_name2id[sr] === undefined) {
            console.log("Deleting " + sr);
            delete prefs.enabledSubreddits2[sr];
        }
    }
}

function sanitize_emote(s) {
    return s.toLowerCase().replace("!", "_excl_").replace(":", "_colon_").replace("#", "_hash_").replace("/", "_slash_");
}

//                  a    :suffix          [href |   ="( /emote name )"] :suffix         (through '}')
var block_regexp = /a\s*(:[a-zA-Z\-()]+)?\[href[|^]?="(\/[\w:!#\/]+)"\](:[a-zA-Z\-()]+)?[^}]*}/g;
var emote_regexp = /a\s*(:[a-zA-Z\-()]+)?\[href[|^]?="(\/[\w:!#\/]+)"\](:[a-zA-Z\-()]+)?/;

function strip_subreddit_css(data) {
    // Strip comments
    data = data.replace(/\/\*[^*]*\*+(?:[^\/][^*]*\*+)*\//g, "");
    // Strip PONYSCRIPT-IGNORE blocks
    data = data.replace(/START-PONYSCRIPT-IGNORE[^{]*{[^}]*}[\s\S]*?END-PONYSCRIPT-IGNORE[^{]*{[^}]*}/g, "");
    // Strip !important tags
    data = data.replace(/\s*!important/gi, "");
    // Strip leading spaces and newlines
    data = data.replace(/^\s*|\n/gm, "");

    block_regexp.lastIndex = 0;

    // Locate all emotes and emote CSS
    var emote_text = "";
    var emotes = [];
    var block_match, emote_match;
    while((block_match = block_regexp.exec(data)) !== null) {
        var css_chunk = block_match[0];
        while((emote_match = emote_regexp.exec(css_chunk)) !== null) {
            var emote = emote_match[2].toLowerCase();
            if(emotes.indexOf(emote) < 0) {
                emotes.push(emote);
            }

            // Sanitize class names and convert to .bpm-cmote structure
            var class_name = (".bpm-cmote-" + sanitize_emote(emote.slice(1)) +
                              (emote_match[1] ? emote_match[1] : "") +
                              (emote_match[3] ? emote_match[3] : ""));
            css_chunk = css_chunk.replace(emote_regexp, class_name);
        }
        emote_text += css_chunk + "\n";
    }

    return [emotes, emote_text];
}

// Essentially a list compare, because JS sucks
function subreddits_changed(old, n) {
    if(old.length !== n.length) {
        return true;
    }

    // Copy
    var common = old.slice(0);

    // Remove all elements in n
    for(var i = 0; i < n.length; i++) {
        var idx = common.indexOf(n[i]);
        if(idx < 0) {
            return true;
        }
        common.splice(idx, 1);
    }

    // Should be empty?
    return common.length;
}

function manage_prefs(sr_name2id, hooks) {
    var prefs = hooks.read_json("prefs");

    var manager = {
        get: function() {
            return prefs;
        },

        db_json: hooks.read_json,
        db_set_json: hooks.write_json,
        db_key: hooks.read_value,
        db_set_key: hooks.write_value,

        set_pref: function(key, value) {
            if(prefs[key] === undefined) {
                console.log("BPM: ERROR: Attempt to write to nonexistent pref key " + key);
                return;
            }
            prefs[key] = value;
            this._sync();
            this.cm.after_pref_write();
        },

        // Wait 2.5s between hitting Reddit
        dl_queue: new TaskQueue(hooks.set_timeout, hooks.download_file, 2500),

        _sync: function() {
            hooks.write_json("prefs", prefs);
        }
    };

    initialize_prefs(prefs, sr_name2id);
    manager._sync();
    manager.cm = new css_manager(manager);
    manager.cm.after_pref_write();

    return manager;
}

function TaskQueue(set_timeout, callback, delay) {
    this.set_timeout = set_timeout;
    this.callback = callback;
    this.delay = delay;
    this.last_run = 0;
    this.queue = [];
    this.running = false;
}

TaskQueue.prototype = {
    add: function() {
        this.queue.push(Array.prototype.slice.call(arguments));

        // The task chain will keep itself running so long as there are items
        // in the queue, so don't worry about that
        if(!this.running) {
            this.running = true;
            // Wait until we're allowed to run things again
            var wait = (this.last_run + this.delay) - Date.now();
            if(wait > 0) {
                this.set_timeout(this.run_next.bind(this), wait);
            } else {
                // May as well just call it directly
                this.run_next();
            }
        }
    },

    run_next: function() {
        // Set up args list: first is always done(), rest is as passed
        var args = this.queue.shift();

        args.unshift(function() {
            this.last_run = Date.now();
            // If the queue isn't empty yet, keep running
            if(this.queue.length) {
                this.set_timeout(this.run_next.bind(this), this.delay);
            } else {
                this.running = false;
            }
        }.bind(this));

        // Run task
        this.callback.apply(undefined, args);
    }
};

// Once a week. TODO: Make configurable, within certain tolerances.
var DOWNLOAD_INTERVAL = 1000 * 60 * 60 * 24 * 7;

function css_manager(pref_manager) {
    this.pm = pref_manager;
    this.cached_subreddits = [];
    this.css_cache = null;
    this.emote_cache = null;

    // Done from pref_manager
    //this.check_cache();
}

css_manager.prototype = {
    force_update: function(subreddit) {
        this.download_update(subreddit);
    },

    rebuild_cache: function() {
        var prefs = this.pm.get();
        var emote_lists = this.pm.db_json("customcss_emotes");
        this.cached_subreddits = [];

        this.css_cache = "";
        this.emote_cache = {};

        for(var subreddit in prefs.customCSSSubreddits) {
            var key = "csscache_" + subreddit.toLowerCase();
            if(this.pm.db_key(key) !== undefined) {
                this.css_cache += this.pm.db_key(key);
                this.cached_subreddits.push(subreddit);
            }

            if(emote_lists[subreddit] !== undefined) {
                var emote_names = emote_lists[subreddit];
                for(var i = 0; i < emote_names.length; i++) {
                    this.emote_cache[emote_names[i]] = subreddit;
                }
            }
        }
    },

    check_cache: function() {
        var now = Date.now();
        var prefs = this.pm.get();

        if(this.pm.db_json("customcss_emotes") === undefined) {
            this.pm.db_set_json("customcss_emotes", {});

            // Upgrade path: clear old CSS caches, as they're invalid
            for(var subreddit in prefs.customCSSSubreddits) {
                prefs.customCSSSubreddits[subreddit] = 0;
            }
        }

        for(var subreddit in prefs.customCSSSubreddits) {
            var last_dl_time = prefs.customCSSSubreddits[subreddit];
            if(last_dl_time === undefined || last_dl_time + DOWNLOAD_INTERVAL < now) {
                this.download_update(subreddit);
            }
        }
        // TODO: Remove stale CSS caches
    },

    download_update: function(subreddit) {
        // TODO: space these requests out somewhat
        var prefs = this.pm.get();
        console.log("BPM: Downloading updated CSS file for r/" + subreddit);
        var key = "csscache_" + subreddit.toLowerCase();
        // Chrome doesn't permit setting User-Agent (because it sucks), but this
        // should help a little bit
        var url = "https://www.reddit.com/r/" + subreddit + "/stylesheet.css?__ua=BetterPonymotes";
        this.pm.dl_queue.add(url, function(css) {
            var tmp = strip_subreddit_css(css);
            var extracted_emotes = tmp[0];
            var stripped_css = tmp[1];

            var custom_emotes = this.pm.db_json("customcss_emotes");
            custom_emotes[subreddit] = extracted_emotes;
            this.pm.db_set_json("customcss_emotes", custom_emotes);
            this.pm.db_set_key(key, stripped_css);

            prefs.customCSSSubreddits[subreddit] = Date.now();
            this.pm._sync();
            this.rebuild_cache();
        }.bind(this));
    },

    after_pref_write: function() {
        this.check_cache();

        var tmp = []; // ...
        for(var sr in this.pm.get().customCSSSubreddits) {
            tmp.push(sr);
        }
        // Always true for first run (compare [] to any other list)
        var changed = subreddits_changed(this.cached_subreddits, tmp);

        if(this.css_cache === null || this.emote_cache === null || changed) {
            this.rebuild_cache();
        }
    }
};

// Firefox
if(typeof(exports) !== "undefined") {
    exports.manage_prefs = manage_prefs;
}
