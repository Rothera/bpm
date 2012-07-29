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

var prefs = simple_prefs.prefs;

var main_mod = page_mod.PageMod({
    include: ["*.reddit.com"],
    // Use non-minified jquery version for development (because
    // otherwise the tracebacks are a mile wide)
    contentScriptFile: [
        self.data.url("jquery-1.7.2.js"),
        self.data.url("mutation_summary.js"),
        self.data.url("emote-map.js"),
        self.data.url("betterponymotes.js")],
    contentScriptWhen: "ready",
    contentStyleFile: [self.data.url("emote-classes.css"), self.data.url("combiners.css"), self.data.url("misc.css")]
});

var extracss_mod;
var nsfw_mod;

function enable_css(filename) {
    return page_mod.PageMod({
        include: ["*.reddit.com"],
        contentScriptWhen: "ready",
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

manage_css_pref("enableExtraCSS", "extracss-firefox.css");
manage_css_pref("enableNSFW", "nsfw-emote-classes.css");
