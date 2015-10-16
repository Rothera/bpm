/*******************************************************************************
**
** This file is part of BetterPonymotes.
** Copyright (c) 2012-2015 Typhos.
** Copyright (c) 2015 TwilightShadow1.
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

"use strict";

// Short string prefixed to all log messages.
var lp = window.name ? ("[BPM] + [" + window.name + "]") : "[BPM]";

/*
 * Primitive timing analysis. Call this at certain key points in the addon
 * startup process to measure how long it's taking.
 */
var _timing_cp = "startup";
var _timing_start = Date.now();
var _timing_time = Date.now();
function timing_checkpoint(description) {
    var now = Date.now();
    var delta = now - _timing_time;
    var total = now - _timing_start;
    console.log(lp, "[TIMING]", "From " + _timing_cp + " to " + description + " " + delta + "ms, total " + total + "ms from startup");
    _timing_cp = description;
    _timing_time = now;
}

/*
 * Global dom-ready promise.
 */
var dom = new Promise(function(resolve, reject) {
    if(document.readyState === "interactive" || document.readyState === "complete") {
        timing_checkpoint("document-loaded");
        console.log(lp, "[DOM]", "DOM was loaded on startup");
        resolve();
    } else {
        document.addEventListener("DOMContentLoaded", function(event) {
            timing_checkpoint("document-loaded");
            console.log(lp, "[DOM]", "DOM loaded");
            resolve();
        }, false);
    }
});

function ajax(url) {
    return new Promise(function(resolve, reject) {
        console.log(lp, "[AJAX]", "Requesting", url);
        var xhr = new XMLHttpRequest();
        xhr.addEventListener("load", function(event) {
            console.log(lp, "[AJAX]", "Loaded", url);
            resolve(xhr);
        });
        xhr.addEventListener("error", function(event) {
            console.log(lp, "[AJAX]", "Failed", url);
            reject(xhr);
        });
        xhr.open("GET", url);
        xhr.send();
    });
}
