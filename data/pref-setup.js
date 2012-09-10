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
    "enabledSubreddits": {},
    "showUnknownEmotes": true,
    "searchLimit": 200,
    "searchBoxInfo": [600, 25, 600, 450],
    "showAltText": true,
    "enableGlobalEmotes": false
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

// Firefox
if(typeof(exports) !== 'undefined') {
    exports.setup_prefs = setup_prefs;
}
