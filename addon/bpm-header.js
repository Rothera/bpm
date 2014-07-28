/*******************************************************************************
**
** Copyright (C) 2012 Typhos
**
** This Source Code Form is subject to the terms of the Mozilla Public
** License, v. 2.0. If a copy of the MPL was not distributed with this
** file, You can obtain one at http://mozilla.org/MPL/2.0/.
**
*******************************************************************************/

// For linting- every global we access, more or less
/*
var self, chrome, GM_getValue, GM_setValue; // Platform
var window, document, setTimeout, clearTimeout, FileReader; // Standard
var emote_map, sr_name2id, sr_id2name, tag_name2id, tag_id2name, manage_prefs; // Data
*/

(function(_global_this) {
"use strict";

var _checkpoint = (function() {
    var _start_time = Date.now(); // Grab this value before we do ANYTHING else
    var _last_time = _start_time;
    var _last_checkpoint = "head";

    return function(name) {
        var now = Date.now();
        var delta = (now - _last_time);
        var total = (now - _start_time);
        log_debug("Timing: " + _last_checkpoint + "->" + name + " = " + delta + " (total " + total + ")");

        _last_time = now;
        _last_checkpoint = name;
    };
})();

var DEV_MODE = false;

// Domain names on which the global emote converter will refuse to run,
// typically due to bad behavior. A common problem is JS attempting to
// dynamically manipulate page stylesheets, which will fail when it hits ours
// (as reading links back to chrome addresses are generally forbidden).
var DOMAIN_BLACKLIST = [
    "read.amazon.com", // Reads document.styleSheets and crashes
    "outlook.com", // Reported conflict; cause unknown
    "panelbase.net" // Reported conflict; cause unknown
];
