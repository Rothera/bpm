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

function process(element) {
    // Distinction between element.href and element.getAttribute("href")- the
    // former is normalized somewhat to be a complete URL, which we don't want.
    var href = element.getAttribute("href");
    if(href) {
        // Don't normalize case...
        var parts = href.split("-");
        var emote = parts[0];
        if(emote_map.hasOwnProperty(emote)) {
            //console.log("Applying CSS to " + emote + ": " + emote_map[emote]);
            element.className += " " + emote_map[emote];
        }
    }
}

var anchors = document.getElementsByTagName("a");
for(var i = 0; i < anchors.length; i++) {
    process(anchors[i]);
}

var observer = new MutationSummary({
    callback: function(summaries) {
        summaries[0].added.forEach(function(a) {
            process(a);
        });
    },
    queries: [
        {element: "a"}
    ]});
