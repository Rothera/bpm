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
});

// Enable the button that opens the page
simple_prefs.on("openPrefs", function() {
    tabs.open(self.data.url("options.html"));
});

// Main script. As an optimization, we just replace this mod (in order to change
// the list of matching URLs) whenever the global conversion option changes.
// This has a nasty side effect- the workers don't seem to be able to save
// settings. The practical result of this is that fiddling with the option will
// mean currently-open pages won't save the positions of the emote search window,
// I think.

/*
 * PageMod controlling code. We control the main mod, extracss, and combiners
 * from here.
 *
 * There is some complexity involved in this- the global emotes option affects
 * whether or not each of these mods affect "*" or "*.reddit.com", and we need
 * to rebuild each one when that changes. Unfortunately, page workers seem to get
 * "cut off" when this happens- they can no longer write to prefs, meaning the
 * search box won't remember where it was anymore from those pages.
 *
 * Additionally, the extracss and combiners mod have their own options, deciding
 * whether or not they're enabled at all.
 */

function make_mod(options) {
    // Makes a page mod from the specified options list, automatically setting
    // the include list to something appropriate.

    options.include = [storage.prefs.enableGlobalEmotes ? "*" : "*.reddit.com"];
    return page_mod.PageMod(options);
}

function make_css_mod(filename) {
    return make_mod({
        contentScriptWhen: "start",
        contentStyleFile: [self.data.url(filename)]
    });
}

function configure_css(mod, pref, filename, bgm_changed) {
    // If BGM changed and the mod is enabled, we need to reconfigure it.
    // Otherwise we just check whether or not the pref itself has changed.

    if(bgm_changed && mod !== null) {
        mod.destroy();
        mod = null;
    }

    if(pref && mod === null) {
        var tmp = make_css_mod(filename);
        return tmp;
    } else if(!pref && mod !== null) {
        mod.destroy();
        return null;
    }

    return mod;
}

var main_mod = null;
var extracss_mod = null;
var combiners_mod = null;

// Previous global emotes setting. Compare with ===/!== so the null triggers the
// initial run properly in prefs_updated().
var bgm_enabled = null;

// Monitor prefs for CSS-related changes
function prefs_updated() {
    var bgm_changed = storage.prefs.enableGlobalEmotes !== bgm_enabled;

    extracss_mod = configure_css(extracss_mod, storage.prefs.enableExtraCSS, "extracss.css", bgm_changed);
    combiners_mod = configure_css(combiners_mod, storage.prefs.enableNSFW, "combiners-nsfw.css", bgm_changed);

    if(bgm_changed) {
        if(main_mod !== null) {
            main_mod.destroy();
        }

        main_mod = make_mod({
            contentScriptWhen: "start",
            contentStyleFile: [
                self.data.url("bpmotes.css"),
                self.data.url("emote-classes.css")
                ],
            contentScriptFile: [
                self.data.url("mutation_summary.js"),
                self.data.url("emote-map.js"),
                self.data.url("sr-data.js"),
                self.data.url("betterponymotes.js")
                ],
            onAttach: on_cs_attach
            });
    }

    bgm_enabled = storage.prefs.enableGlobalEmotes;
}

prefs_updated(); // Initial run
