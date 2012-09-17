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

function update_custom_css(database, prefs, subreddit, download_file) {
    console.log("BPM: Updating CSS file for r/" + subreddit);
    var key = "csscache_" + subreddit.toLowerCase();
    var random = Math.floor(Math.random() * 1000);
    var url = "http://reddit.com/r/" + subreddit + "/stylesheet.css?nocache=" + random;
    download_file(url, function(css) {
        database[key] = strip_subreddit_css(css);
        prefs.customCSSSubreddits[subreddit] = Date.now();
    });
}

// Once a week. TODO: Make configurable, within certain tolerances.
var DOWNLOAD_INTERVAL = 1000 * 60 * 60 * 24 * 7;

function check_css_cache(database, prefs, download_file) {
    var now = Date.now();
    for(var sr in prefs.customCSSSubreddits) {
        // pass
        var last_dl_time = prefs.customCSSSubreddits[sr];
        if(last_dl_time === undefined || last_dl_time + DOWNLOAD_INTERVAL < now) {
            update_custom_css(database, prefs, sr, download_file);
        }
    }
    // TODO: Remove stale CSS caches
}

function manage_prefs(database, prefs, sync, update, download_file) {
    // TODO: replace prefs argument with the database object, just assuming
    // all values are string->string except for prefs

    setup_prefs(prefs); // Initialize values
    sync(prefs);        // Write to DB (in case of new prefs)
    update(prefs);      // Init browser code (just Fx right now)
    check_css_cache(database, prefs, download_file); // Update CSS

    return {
        write_prefs: function(_prefs) {
            prefs = _prefs;
            sync(prefs);
            update(prefs);
            check_css_cache(database, prefs, download_file);
        },

        get_prefs: function() {
            return prefs;
        }
    };
}

// Firefox
if(typeof(exports) !== 'undefined') {
    exports.manage_prefs = manage_prefs;
    exports.update_custom_css = update_custom_css;
}
