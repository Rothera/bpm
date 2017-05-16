/*******************************************************************************
**
** This file is part of BetterPonymotes.
** Copyright (c) 2012-2015 Typhos.
** Copyright (c) 2015 TwilightShadow1.
** Copyright (c) 2016 ByzantineFailure
**
** This program is free software: you can redistribute it and/or modify it
** under the terms of the GNU Affero General Public License as published by
** the Free Software Foundation, either version 3 of the License, or (at your
** option) any later version.
**
** This program is distributed in the hope that it will be useful, but WITHOUT
** ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
** FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public License
** for more details.
**
** You should have received a copy of the GNU Affero General Public License
** along with this program.  If not, see <http://www.gnu.org/licenses/>.
**
*******************************************************************************/

(function(_global_this) {
"use strict";

//Discord requires that we require in our resources
//This will be processed by webpack at build time
if(window.process) {
    var resources = require('./bpm-resources');
    var tag_name2id = resources.tag_name2id;
    var sr_id2name = resources.sr_id2name;
    var sr_name2id = resources.sr_name2id;
    var tag_id2name = resources.tag_id2name;
    var emote_map = resources.emote_map;
}

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
    "panelbase.net", // Reported conflict; cause unknown
    "fimfiction.net",
    "starnetb.lcc.edu" // Reported conflict
];


// Used to determine which domain BPM is running on.
// This affects button injection and some css classes.
var is_reddit = false;
var is_modreddit = false;
var is_voat = false;
if (ends_with(document.location.hostname, "mod.reddit.com")) {
    is_modreddit = true;
} else if (ends_with(document.location.hostname, "reddit.com")) {
    is_reddit = true;
} else if (ends_with(document.location.hostname, "voat.co")) {
    is_voat = true;
}
