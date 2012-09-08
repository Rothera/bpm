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

// Load/initialize prefs to defaults
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

if(!storage.prefs) {
    storage.prefs = {};

    if(simple_prefs.prefs.enableNSFW !== undefined) {
        // Copy old prefs
        storage.prefs.enableNSFW = simple_prefs.prefs.enableNSFW;
        storage.prefs.enableExtraCSS = simple_prefs.prefs.enableExtraCSS;
    }
}

if(storage.prefs.showAltText === undefined) {
    storage.prefs.showAltText = false; // Off by default for upgrades only
}

for(var key in default_prefs) {
    if(storage.prefs[key] === undefined) {
        storage.prefs[key] = default_prefs[key];
    }
}

for(var sr in sr_data.sr_data) {
    if(storage.prefs.enabledSubreddits[sr] === undefined) {
        storage.prefs.enabledSubreddits[sr] = true;
    }
}
// TODO: Remove subreddits from prefs that are no longer in the addon.

function on_cs_attach(worker) {
    worker.port.on("get_prefs", function() {
        worker.port.emit("prefs", storage.prefs);
    });
    worker.port.on("set_prefs", function(prefs) {
        storage.prefs = prefs;
        prefs_updated();
    });
}

// Setup communication with prefs page
var prefs_mod = page_mod.PageMod({
    include: [self.data.url("options.html")],
    contentScriptWhen: "start",
    contentScriptFile: [
        self.data.url("sr-data.js"),
        self.data.url("options.js")
        ],
    onAttach: on_cs_attach
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
        ],
    contentScriptFile: [
        self.data.url("mutation_summary.js"),
        self.data.url("emote-map.js"),
        self.data.url("sr-data.js"),
        self.data.url("script-common.js"),
        self.data.url("betterponymotes.js")
        ],
    onAttach: on_cs_attach
});

// This is the only preference we control from this side. Other browsers do not
// have this hot-reloading capability, though that is mostly by accident.
var extracss_mod = null;
var combiners_mod = null;

function enable_css(filename) {
    return page_mod.PageMod({
        include: ["*.reddit.com"],
        contentScriptWhen: "start",
        contentStyleFile: [self.data.url(filename)]
    });
}

// Monitor prefs for CSS-related changes
function prefs_updated() {
    if(storage.prefs.enableExtraCSS && extracss_mod === null) {
        extracss_mod = enable_css("extracss.css");
    } else if(!storage.prefs.enableExtraCSS && extracss_mod !== null) {
        extracss_mod.destroy();
        extracss_mod = null;
    }

    if(storage.prefs.enableNSFW && combiners_mod === null) {
        combiners_mod = enable_css("combiners-nsfw.css");
    } else if(!storage.prefs.enableNSFW && combiners_mod !== null) {
        combiners_mod.destroy();
        combiners_mod = null;
    }
}

prefs_updated(); // Initial run
