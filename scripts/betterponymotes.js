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

function process(elements) {
    for(var i = 0; i < elements.length; i++) {
        // Distinction between element.href and element.getAttribute("href")- the
        // former is normalized somewhat to be a complete URL, which we don't want.
        var href = elements[i].getAttribute("href");
        if(href && href[0] == '/') {
            // Don't normalize case...
            var parts = href.split("-");
            var emote = parts[0];
            if(emote_map.hasOwnProperty(emote)) {
                //console.log("Applying CSS to " + emote + ": " + emote_map[emote]);
                elements[i].className += " " + emote_map[emote];
            }
        }
    }
}

process(document.getElementsByTagName("a"))

var observer = new MutationSummary({
    callback: function(summaries) {
        process(summaries[0].added);
    },
    queries: [
        {element: "a"}
    ]});
