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

var match_pattern = require("match-pattern");
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

// Main CSS file. Due to technical limitations- we can't specify the BGM mod as
// excluding Reddit- this is swapped between matching "*" if BGM is enabled and
// "*.reddit.com" when disabled. An unfortunate hack.
//
// Additionally, swapping this out while pages are loaded with globablly
// converted emotes will pull the CSS out from under them, making the emotes
// effectively impossible to read. One of the cases where hot-reloading of
// preferences in Firefox doesn't work too well.
var core_css_mod = null;

function set_core_css_filter(pattern) {
    if(core_css_mod !== null) {
        core_css_mod.destroy();
        core_css_mod = null;
    }

    core_css_mod = page_mod.PageMod({
        include: [pattern],
        contentScriptWhen: "start",
        contentStyleFile: [
            self.data.url("emote-classes.css"),
            ]
    });
}

// Main script
var main_mod = page_mod.PageMod({
    include: ["*.reddit.com"],
    contentScriptWhen: "start",
    contentStyleFile: [
        self.data.url("bpmotes.css")
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

// These are the only preferences we control from this side. Other browsers do
// not have this hot-reloading capability, though that is mostly by accident.
var extracss_mod = null;
var combiners_mod = null;
var globalemotes_mod = null;

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

    if(storage.prefs.enableGlobalEmotes) {
        set_core_css_filter("*");

        if(globalemotes_mod === null) {
            globalemotes_mod = page_mod.PageMod({
                include: ["*"],
                contentScriptWhen: "start",
                contentScriptFile: [
                    self.data.url("mutation_summary.js"),
                    self.data.url("emote-map.js"),
                    self.data.url("sr-data.js"),
                    self.data.url("script-common.js"),
                    self.data.url("betterglobalmotes.js")
                    ],
                onAttach: on_cs_attach
            });
        }
    } else {
        set_core_css_filter("*.reddit.com");

        if(globalemotes_mod !== null) {
            globalemotes_mod.destroy();
            globalemotes_mod = null;
        }
    }
}

prefs_updated(); // Initial run
