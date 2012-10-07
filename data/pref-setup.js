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

var bpm_backendsupport = {
    default_prefs: {
        "enableNSFW": false,
        "enableExtraCSS": true,
        "enabledSubreddits": {}, // subreddit name -> boolean enabled
        "showUnknownEmotes": true,
        "searchLimit": 200,
        "searchBoxInfo": [600, 25, 600, 450],
        "lastSearchQuery": "sr:mylittlepony", // only shows about a third, but that's ok
        "showAltText": true,
        "enableGlobalEmotes": false,
        "enableGlobalSearch": false,
        "globalIconPos": [16, 16],
        "disabledEmotes": [],
        "whitelistedEmotes": [],
        "hideDisabledEmotes": false,
        "maxEmoteSize": 0,
        "customCSSSubreddits": {} // subreddit name -> timestamp
        },

    setup_prefs: function(prefs, sr_data) {
        for(var key in this.default_prefs) {
            if(prefs[key] === undefined) {
                prefs[key] = this.default_prefs[key];
            }
        }

        for(var sr in sr_data) {
            if(prefs.enabledSubreddits[sr] === undefined) {
                prefs.enabledSubreddits[sr] = true;
            }
        }
        // TODO: Remove subreddits from prefs that are no longer in the addon.
    },

    sanitize: function(s) {
        return s.toLowerCase().replace("!", "_excl_").replace(":", "_colon_").replace("#", "_hash_").replace("/", "_slash_");
    },

    //             a    :suffix          [href |   ="( /emote name )"] :suffix         (through '}')
    block_regexp: /a\s*(:[a-zA-Z\-()]+)?\[href[|^]?="(\/[\w:!#\/]+)"\](:[a-zA-Z\-()]+)?[^}]*}/g,
    emote_regexp: /a\s*(:[a-zA-Z\-()]+)?\[href[|^]?="(\/[\w:!#\/]+)"\](:[a-zA-Z\-()]+)?/,

    strip_subreddit_css: function(data) {
        // Strip comments
        data = data.replace(/\/\*[^*]*\*+(?:[^\/][^*]*\*+)*\//g, "");
        // Strip PONYSCRIPT-IGNORE blocks
        data = data.replace(/START-PONYSCRIPT-IGNORE[^{]*{[^}]*}[\s\S]*?END-PONYSCRIPT-IGNORE[^{]*{[^}]*}/g, "");
        // Strip !important tags
        data = data.replace(/\s*!important/gi, "");
        // Strip leading spaces and newlines
        data = data.replace(/^\s*|\n/gm, "");

        this.block_regexp.lastIndex = 0;

        // Locate all emotes and emote CSS
        var emote_text = "";
        var emotes = [];
        var block_match, emote_match;
        while((block_match = this.block_regexp.exec(data)) !== null) {
            var css_chunk = block_match[0];
            while((emote_match = this.emote_regexp.exec(css_chunk)) !== null) {
                var emote = emote_match[2].toLowerCase();
                if(emotes.indexOf(emote) < 0) {
                    emotes.push(emote);
                }

                // Sanitize class names and convert to .bpm-cmote structure
                var class_name = (".bpm-cmote-" + this.sanitize(emote.slice(1)) +
                                  (emote_match[1] ? emote_match[1] : "") +
                                  (emote_match[3] ? emote_match[3] : ""));
                css_chunk = css_chunk.replace(this.emote_regexp, class_name);
            }
            emote_text += css_chunk + "\n";
        }

        return [emotes, emote_text];
    },

    // Essentially a list compare, because JS sucks
    subreddits_changed: function(old, n) {
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
    },

    manage_prefs: function(sr_data, hooks) {
        var prefs = hooks.read_json("prefs");

        var manager = {
            write: function(_prefs) {
                prefs = _prefs;
                this._sync();
                this.cm.after_pref_write();
            },

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
                hooks.prefs_updated(prefs);
            }
        };

        this.setup_prefs(prefs, sr_data);
        manager._sync();
        manager.cm = new css_manager(manager);
        manager.cm.after_pref_write();

        return manager;
    }
};

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
                    this.emote_cache[emote_names[i]] = 1;
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
        var url = "http://reddit.com/r/" + subreddit + "/stylesheet.css?__ua=BetterPonymotes";
        this.pm.dl_queue.add(url, function(css) {
            var tmp = bpm_backendsupport.strip_subreddit_css(css);
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
        var changed = bpm_backendsupport.subreddits_changed(this.cached_subreddits, tmp);

        if(this.css_cache === null || this.emote_cache === null || changed) {
            this.rebuild_cache();
        }
    }
};

// Firefox
if(typeof(exports) !== "undefined") {
    exports.bpm_backendsupport = bpm_backendsupport;
}
