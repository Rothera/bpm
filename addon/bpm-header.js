// ==UserScript==
// @description View Reddit ponymotes across the site
// @downloadURL http://rainbow.mlas1.us/betterponymotes.user.js
// @grant GM_log
// @grant GM_getValue
// @grant GM_setValue
// @include http://*/*
// @include https://*/*
// @name BetterPonymotes
// @namespace http://rainbow.mlas1.us/
// @require /*{{require_prefix}}*/bpm-resources.js?p=2&dver=/*{{data_version}}*/
// @require /*{{require_prefix}}*/pref-setup.js?p=2&cver=/*{{code_version}}*/
// @run-at document-start
// @updateURL http://rainbow.mlas1.us/betterponymotes.user.js
// @version /*{{version}}*/
// ==/UserScript==

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
var self, chrome, opera, GM_log, GM_getValue, GM_setValue;
var window, document, console, setTimeout, clearTimeout, FileReader;
var emote_map, sr_name2id, sr_id2name, tag_name2id, tag_id2name, bpm_backendsupport;
*/

(function(_bpm_this) {
"use strict";

var BPM_DEV_MODE = false;

var BPM_CODE_VERSION = "/*{{code_version}}*/";
var BPM_DATA_VERSION = "/*{{data_version}}*/";
var BPM_RESOURCE_PREFIX = "http://rainbow.mlas1.us";
var BPM_OPTIONS_PAGE = BPM_RESOURCE_PREFIX + "/options.html";

// Domain names on which the global emote converter will refuse to run,
// typically due to bad behavior. A common problem is JS attempting to
// dynamically manipulate page stylesheets, which will fail when it hits ours
// (as reading links back to chrome addresses are generally forbidden).
var BPM_DOMAIN_BLACKLIST = [
    "read.amazon.com" // Reads document.styleSheets and crashes
];

/*
 * Inspects the environment for global variables.
 *
 * On some platforms- particularly some userscript engines- the global this
 * object !== window, and the two may have significantly different properties.
 */
function _bpm_global(name) {
    return _bpm_this[name] || window[name] || undefined;
}

var bpm_exports = {};
_bpm_this.bpm = bpm_exports;
