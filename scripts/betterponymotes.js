// ==UserScript==
// @include http://*.reddit.com/*
// @include https://*.reddit.com/*
// ==/UserScript==

/*
 * THIS FILE IS NOT A USERSCRIPT. DO NOT ATTEMPT TO INSTALL IT AS SUCH.
 *
 * The above header is used by Opera.
 */

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

// Embed emote-map.js, for Opera
/*$(EMOTE_MAP)*/

function sanitize(s) {
    return s.toLowerCase().replace("!", "_excl_").replace(":", "_colon_");
}

function process(elements) {
    for(var i = 0; i < elements.length; i++) {
        var element = elements[i];
        // Distinction between element.href and element.getAttribute("href")- the
        // former is normalized somewhat to be a complete URL, which we don't want.
        var href = element.getAttribute("href");
        if(href && href[0] == '/') {
            // Don't normalize case for emote lookup
            var parts = href.split("-");
            var emote = parts[0];
            if(emote_map[emote]) {
                // But do normalize it when working out the CSS class. Also
                // strip off leading "/".
                var css_class = "bpmotes-" + sanitize(emote.slice(1));
                var is_nsfw = emote_map[emote] == 2;

                var nsfw_class = is_nsfw ? " bpm-nsfw " : " ";
                element.className += nsfw_class + css_class;

                // It'd be nice to set textContent="NSFW" in the correct cases,
                // but this script doesn't know whether or not the emote is
                // actually enabled. If it is, we don't want it, so for now it's
                // easier just to do the text in CSS (see bpmotes-sfw.css).
                //
                // As an alternative, we could consider adding e.g.
                //    <span class="bpmotes-sfw-only">NSFW</span>
                // And make that class invisible by default. I don't think the
                // complexity is worth it for now, though.

                // Apply flags in turn. We pick on the naming a bit to prevent
                // spaces and such from slipping in.
                for(var p = 1; p < parts.length; p++) {
                    // Normalize case
                    var flag = parts[p].toLowerCase();
                    if(/^[\w\!]+$/.test(flag)) {
                        element.className += " " + "bpflags-" + sanitize(flag);
                    }
                }
            } else if(!element.textContent && /^\/[\w\-:!]+$/.test(emote) && !element.clientWidth) {
                /*
                 * If there's:
                 *    1) No text
                 *    2) href matches regexp (no slashes, mainly)
                 *    3) No size (missing bg image means it won't display)
                 *    4) No :after or :before tricks to display the image (some
                 *       subreddits do emotes with those selectors)
                 * Then it's probably an emote, but we don't know what it is.
                 */
                var after = window.getComputedStyle(element, ":after").backgroundImage;
                // "" in Opera, "none" in Firefox and Chrome.
                if(!after || after == "none") {
                    var before = window.getComputedStyle(element, ":before").backgroundImage;
                    if(!before || before == "none") {
                        // Unknown emote? Good enough
                        element.className += " " + "bpm-unknown";
                        element.textContent = "Unknown emote " + emote;
                    }
                }
            }
        }
    }
}

/*
 * Firefox and Chrome run this script when the DOM has been built. I'm not sure
 * exactly when it's run in Opera, though.
 */

if(self || chrome) {
    process(document.getElementsByTagName("a"))

    var observer = new MutationSummary({
        callback: function(summaries) {
            process(summaries[0].added);
        },
        queries: [
            {element: "a"}
        ]});
} else if(opera) {
    window.addEventListener("DOMContentLoaded", function() {
        process(document.getElementsByTagName("a"))

        document.body.addEventListener("DOMNodeInserted", function(event) {
            var element = event.target;
            if(element.getElementsByTagName) {
                process(element.getElementsByTagName("a"));
            }
        }, false);
    }, false);
}
