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

function process(node) {
    var emote = node.pathname.toLowerCase();
    if(emote_map.hasOwnProperty(emote)) {
        console.log("Applying CSS to " + emote + ": " + emote_map[emote]);
        $(node).addClass(emote_map[emote]);
    }
}

$("a").each(function(index) {
    process(this);
});

var observer = new MutationSummary({
    callback: function(summaries) {
        summaries[0].added.forEach(function(a) {
            process(a);
        });
    },
    queries: [
        {element: "a"}
    ]});
