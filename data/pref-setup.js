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

var emote_regexp = /a\s*(:[a-zA-Z\-()]+)?\[href[|^]?="\/[\w:!#\/]+"\](:[a-zA-Z\-()]+)?[^}]*}/g;

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

// Essentially a list compare, because JS sucks
function subreddits_changed(old, n) {
    if(old.length != n.length) {
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

// Once a week. TODO: Make configurable, within certain tolerances.
var DOWNLOAD_INTERVAL = 1000 * 60 * 60 * 24 * 7;

function css_manager(pref_manager, download_file) {
    this.pm = pref_manager;
    this.cached_subreddits = [];
    this.css_cache = null;
    this.download_file = download_file;

    // Done from pref_manager
    //this.check_cache();
}

css_manager.prototype = {
    force_update: function(subreddit) {
        this.download_update(subreddit);
    },

    rebuild_cache: function() {
        var prefs = this.pm.get();
        var database = this.pm.database;
        this.cached_subreddits = [];

        this.css_cache = "";
        for(var subreddit in prefs.customCSSSubreddits) {
            var key = "csscache_" + subreddit.toLowerCase();
            if(database[key] !== undefined) {
                this.css_cache += database[key];
                this.cached_subreddits.push(subreddit);
            }
        }
    },

    check_cache: function() {
        var now = Date.now();
        var prefs = this.pm.get();
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
        var random = Math.floor(Math.random() * 1000);
        // Chrome doesn't permit setting User-Agent (because it sucks), but this
        // should help a little bit
        var url = "http://reddit.com/r/" + subreddit + "/stylesheet.css?__ua=BetterPonymotes&nocache=" + random;
        this.download_file(url, function(css) {
            this.pm.database[key] = strip_subreddit_css(css);
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

        if(this.css_cache === null || changed) {
            this.rebuild_cache();
        }
    }
};

function manage_prefs(database, prefs, sync, update, download_file) {
    // TODO: replace prefs argument with the database object, just assuming
    // all values are string->string except for prefs

    var manager = {
        write: function(_prefs) {
            prefs = _prefs;
            this._sync();
            this.cm.after_pref_write();
        },

        get: function() {
            return prefs;
        },

        database: database,

        _sync: function() {
            sync(prefs);
            update(prefs);
        }
    };

    setup_prefs(prefs);
    manager._sync();
    manager.cm = new css_manager(manager, download_file);
    manager.cm.after_pref_write();

    return manager;
}

// Firefox
if(typeof(exports) !== 'undefined') {
    exports.manage_prefs = manage_prefs;
}
