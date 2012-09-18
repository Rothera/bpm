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

// Firefox
if(this.require !== undefined) {
    var sr_data = require("sr-data").sr_data;
}

var default_prefs = {
    "enableNSFW": false,
    "enableExtraCSS": true,
    "enabledSubreddits": {}, // subreddit name -> boolean enabled
    "showUnknownEmotes": true,
    "searchLimit": 200,
    "searchBoxInfo": [600, 25, 600, 450],
    "showAltText": true,
    "enableGlobalEmotes": false,
    "disabledEmotes": [],
    "whitelistedEmotes": [],
    "maxEmoteSize": 0,
    "customCSSSubreddits": {} // subreddit name -> timestamp
    };

function setup_prefs(prefs) {
    if(prefs.showAltText === undefined) {
        prefs.showAltText = false; // Off by default for upgrades only
    }

    for(var key in default_prefs) {
        if(prefs[key] === undefined) {
            prefs[key] = default_prefs[key];
        }
    }

    for(var sr in sr_data) {
        if(prefs.enabledSubreddits[sr] === undefined) {
            prefs.enabledSubreddits[sr] = true;
        }
    }
    // TODO: Remove subreddits from prefs that are no longer in the addon.
}

var emote_regexp = /a\s*(:[a-zA-Z\-()]+)?\[href[|^]?="\/[\w:!]+"\](:[a-zA-Z\-()]+)?[^}]*}/g;

function strip_subreddit_css(data) {
    // Strip comments
    data = data.replace(/\/\*[^*]*\*+(?:[^\/][^*]*\*+)*\//g, "");
    // Strip PONYSCRIPT-IGNORE blocks
    data = data.replace(/START-PONYSCRIPT-IGNORE[^{]*{[^}]*}[\s\S]*?END-PONYSCRIPT-IGNORE[^{]*{[^}]*}/g, "");
    // Strip !important tags
    data = data.replace(/\s*!important/gi, "");
    // Strip leading spaces and newlines
    data = data.replace(/^\s*|\n/gm, "");

    // Locate all emote blocks
    var emote_text = "";
    var match;
    while((match = emote_regexp.exec(data)) !== null) {
        emote_text += match[0] + "\n";
    }

    return emote_text;
}

function update_css_cache(pref_manager, subreddit, download_file) {
    console.log("BPM: Updating CSS file for r/" + subreddit);
    var key = "csscache_" + subreddit.toLowerCase();
    var random = Math.floor(Math.random() * 1000);
    // Chrome doesn't permit setting User-Agent (because it sucks), but this
    // should help a little bit
    var url = "http://reddit.com/r/" + subreddit + "/stylesheet.css?__ua=BetterPonymotes&nocache=" + random;
    download_file(url, function(css) {
        pref_manager.db()[key] = strip_subreddit_css(css);
        pref_manager.get().customCSSSubreddits[subreddit] = Date.now();
        pref_manager._sync();
    });
}

// Once a week. TODO: Make configurable, within certain tolerances.
var DOWNLOAD_INTERVAL = 1000 * 60 * 60 * 24 * 7;

function check_css_cache(pref_manager, old_subreddits, download_file) {
    var now = Date.now();
    var prefs = pref_manager.get();
    var rebuild = false;
    for(var sr in prefs.customCSSSubreddits) {
        var last_dl_time = prefs.customCSSSubreddits[sr];
        if(last_dl_time === undefined || last_dl_time + DOWNLOAD_INTERVAL < now) {
            update_css_cache(pref_manager, sr, download_file);
            rebuild = true;
        }

        var idx = old_subreddits.indexOf(sr);
        if(idx > -1) {
            old_subreddits.splice(idx, 1);
        }
    }
    // TODO: Remove stale CSS caches

    // If there's any subreddits left, some were removed from prefs, so we need
    // to rebuild the cache.
    return rebuild || old_subreddits.length;
}

function force_css_update(pref_manager, subreddit, download_file) {
    update_css_cache(pref_manager, subreddit, download_file);
    pref_manager.rebuild_css_cache();
}

function manage_prefs(database, prefs, sync, update, download_file) {
    // TODO: replace prefs argument with the database object, just assuming
    // all values are string->string except for prefs

    var cached_subreddits = [];
    var css_cache = undefined;

    function _post_write() {
        manager._sync();
        var rebuild = check_css_cache(manager, cached_subreddits, download_file); // Update CSS
        if(rebuild || css_cache === undefined) {
            manager.rebuild_css_cache();
        }

        cached_subreddits = [];
        for(var sr in prefs.customCSSSubreddits) {
            cached_subreddits.push(sr);
        }
    }

    var manager = {
        write: function(_prefs) {
            prefs = _prefs;
            _post_write();
        },

        get: function() {
            return prefs;
        },

        db: function() {
            return database;
        },

        _sync: function() {
            sync(prefs);
            update(prefs);
        },

        rebuild_css_cache: function() {
            css_cache = "";
            for(var subreddit in prefs.customCSSSubreddits) {
                var key = "csscache_" + subreddit.toLowerCase();
                if(database[key] !== undefined) {
                    console.log("BPM: -- Adding " + subreddit);
                    css_cache += database[key];
                }
            }
        },

        custom_css: function() {
            return css_cache;
        }
    };

    setup_prefs(prefs);
    _post_write();

    return manager;
}

// Firefox
if(typeof(exports) !== 'undefined') {
    exports.manage_prefs = manage_prefs;
    exports.force_css_update = force_css_update;
}
