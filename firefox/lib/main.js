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
        self.data.url("betterponymotes.js")
        ],
    onAttach: function(worker) {
        worker.port.on("getPrefs", function() {
            worker.port.emit("prefs", prefs);
        });
    }
});

function enable_css(filename) {
    return page_mod.PageMod({
        include: ["*.reddit.com"],
        contentScriptWhen: "start",
        contentStyleFile: [self.data.url(filename)]
    });
}

function manage_css_pref(pref, filename) {
    var mod;
    simple_prefs.on(pref, function() {
        if(prefs[pref]) {
            mod = enable_css(filename);
        } else {
            mod.destroy();
            mod = null;
        }
    });

    if(prefs[pref]) {
        mod = enable_css(filename);
    }
}

manage_css_pref("enableExtraCSS", "extracss.css");
