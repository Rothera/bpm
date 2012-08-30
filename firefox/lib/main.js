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

var page_mod = require("page-mod");
var self = require("self");
var simple_prefs = require("simple-prefs");
var simple_storage = require("simple-storage");
var tabs = require("tabs");

var sr_data = require("sr-data");

var storage = simple_storage.storage;

// Initialize prefs to defaults
if(!storage.prefs) {
    storage.prefs = {
        "enableNSFW": false,
        "enableExtraCSS": false
    };

    if(simple_prefs.prefs.enableNSFW !== undefined) {
        // Copy old prefs
        storage.prefs.enableNSFW = simple_prefs.prefs.enableNSFW;
        storage.prefs.enableExtraCSS = simple_prefs.prefs.enableExtraCSS;
    }
}

if(!storage.prefs.enabledSubreddits) {
    storage.prefs.enabledSubreddits = {};
}

for(var sr in sr_data.sr_data) {
    if(storage.prefs.enabledSubreddits[sr] === undefined) {
        storage.prefs.enabledSubreddits[sr] = true;
    }
}
// TODO: Remove subreddits from prefs that are no longer in the addon.

// Setup communication with prefs page
var prefs_mod = page_mod.PageMod({
    include: [self.data.url("options.html")],
    contentScriptWhen: "start",
    contentScriptFile: [
        self.data.url("sr-data.js"),
        self.data.url("options.js")
        ],
    onAttach: function(worker) {
        worker.port.on("get_prefs", function() {
            worker.port.emit("prefs", storage.prefs);
        });
        worker.port.on("set_prefs", function(prefs) {
            storage.prefs = prefs;
            prefs_updated();
        });
    }
})

// Enable the button that opens the page
simple_prefs.on("openPrefs", function() {
    tabs.open(self.data.url("options.html"));
});

// Main script
var main_mod = page_mod.PageMod({
    include: ["*.reddit.com"],
    contentScriptWhen: "start",
    contentStyleFile: [
        self.data.url("bpmotes.css"),
        self.data.url("emote-classes.css"),
        // NOTE: Keeping extracss separate in accordance with bpm.js
        self.data.url("combiners.css"),
        ],
    contentScriptFile: [
        self.data.url("mutation_summary.js"),
        self.data.url("emote-map.js"),
        self.data.url("sr-data.js"),
        self.data.url("betterponymotes.js")
        ],
    onAttach: function(worker) {
        worker.port.on("get_prefs", function() {
            worker.port.emit("prefs", storage.prefs);
        });
    }
});

// This is the only preference we control from this side. Other browsers do not
// have this hot-reloading capability, though that is mostly by accident.
var extracss_mod = null;

function enable_css(filename) {
    return page_mod.PageMod({
        include: ["*.reddit.com"],
        contentScriptWhen: "start",
        contentStyleFile: [self.data.url(filename)]
    });
}

// Monitor enableExtraCSS for changes
function prefs_updated() {
    if(storage.prefs.enableExtraCSS && extracss_mod === null) {
        extracss_mod = enable_css("extracss.css");
    } else if(!storage.prefs.enableExtraCSS && extracss_mod !== null) {
        extracss_mod.destroy();
        extracss_mod = null;
    }
}

prefs_updated(); // Initial run
