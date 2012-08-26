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

/*
 * After some *very* informal testing, I've found that injecting the main JS at
 * "ready" time generally gives the best performance. I assume this is because
 * using MutationObserver's while the DOM is being built for the first time is
 * a bad idea due to all the updates, but I can't say for sure.
 *
 * CSS, however, is probably better off at start time.
 */

var page_mod = require("page-mod");
var self = require("self");
var simple_prefs = require("simple-prefs");

var prefs = simple_prefs.prefs;

var css_mod = page_mod.PageMod({
    include: ["*.reddit.com"],
    contentScriptWhen: "start",
    contentStyleFile: [
        self.data.url("bpmotes.css"),
        self.data.url("emote-classes.css"),
        self.data.url("combiners.css"),
        ]
});

var main_mod = page_mod.PageMod({
    include: ["*.reddit.com"],
    contentScriptFile: [
        self.data.url("mutation_summary.js"),
        self.data.url("emote-map.js"),
        self.data.url("betterponymotes.js")
        ],
    contentScriptWhen: "ready",
});

function enable_css(filename) {
    return page_mod.PageMod({
        include: ["*.reddit.com"],
        contentScriptWhen: "start",
        contentStyleFile: [self.data.url(filename)]
    });
}

function manage_css_pref(pref, filename, disabled_filename) {
    var mod;
    var anti_mod;
    simple_prefs.on(pref, function() {
        if(prefs[pref]) {
            mod = enable_css(filename);
            if(anti_mod != null) {
                anti_mod.destroy();
                anti_mod = null;
            }
        } else {
            mod.destroy();
            mod = null;
            if(disabled_filename) {
                anti_mod = enable_css(disabled_filename);
            }
        }
    });

    if(prefs[pref]) {
        mod = enable_css(filename);
    } else if(disabled_filename) {
        anti_mod = enable_css(disabled_filename);
    }
}

manage_css_pref("enableExtraCSS", "extracss.css");
manage_css_pref("enableNSFW", "nsfw-emote-classes.css", "bpmotes-sfw.css");
