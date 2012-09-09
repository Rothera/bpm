// ==UserScript==
// @include http://*/*
// @include https://*/*
// @exclude http://*.reddit.com/*
// @exclude https://*.reddit.com/*
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

// Embed JS files, for Opera
/*$(EMOTE_MAP)*/
/*$(SR_DATA)*/
/*$(SCRIPT_COMMON)*/

function endsWith(text, s) {
    // FIXME this sucks
    var f = text.lastIndexOf(s);
    if(f > -1) {
        return f + s.length == text.length;
    } else {
        return false;
    }
}

// As a note, this regexp is a little forgiving in some respects and strict in
// others. It will not permit text in the [] portion, but alt-text quotes don't
// have to match each other.
//
// Flags are parsed, but ignored in code. This isn't for any technical reason-
// I'm just making the assumption that more specialized syntaxes will generally
// stay in Reddit.
//
//                           <  emote  ><  flags   >   <    alt-text     >
var emote_regexp = /\[\s*\]\((\/[\w!:]+)(?:[\w!\-]*)\s*(?:["']([^"]*)["'])?\)/g;

var tag_blacklist = {
    // Meta tags that we should never touch
    "HTML": 1, "HEAD": 1, "TITLE": 1, "BASE": 1, "LINK": 1, "META": 1, "STYLE": 1, "SCRIPT": 1,
    // Some random things I'm a little worried about
    "SVG": 1, "MATH": 1
};

function process(prefs, sr_array, root) {
    // Opera does not seem to expose NodeFilter to content scripts, so we
    // cannot specify NodeFilter.SHOW_TEXT. Its value is defined to be 4 in the
    // DOM spec, though, so that works.
    //
    // Opera also throws an error if we do not specify all four arguments,
    // though Firefox and Chrome will accept just the first two.
    var walker = document.createTreeWalker(root, /*NodeFilter.SHOW_TEXT*/ 4, undefined, undefined);
    var node;
    // TreeWalker's seem to stop returning nodes if you delete a node while
    // iterating over it.
    var deletion_list = [];

    while((node = walker.nextNode()) !== null) {
        var parent = node.parentNode;

        if(!tag_blacklist[parent.tagName]) {
            emote_regexp.lastIndex = 0;

            var parts = [];
            var end_of_prev = 0; // End index of previous emote match
            var match;

            while((match = emote_regexp.exec(node.data)) !== null) {
                // Check that emote exists
                if(!emote_map[match[1]]) {
                    continue;
                }

                var emote_info = emote_map[match[1]];
                var is_nsfw = emote_info[0];
                var source_id = emote_info[1];

                // Check that it hasn't been disabled somehow
                if(!sr_array[source_id] || (is_nsfw && !prefs.enableNSFW)) {
                    continue;
                }

                // Keep text between the last emote and this one (or the start
                // of the text element)
                var before_text = node.data.slice(end_of_prev, match.index);
                if(before_text) {
                    parts.push(document.createTextNode(before_text));
                }

                // Build emote
                var emote_element = document.createElement("span");
                emote_element.className = "bpmote-" + sanitize(match[1].slice(1));
                if(match[2] !== undefined) {
                    // Alt-text. (Quotes aren't captured by the regexp)
                    emote_element.title = match[2];
                }
                parts.push(emote_element);

                // Next text element will start after this emote
                end_of_prev = match.index + match[0].length;
            }

            // If length == 0, then there were no emote matches to begin with,
            // and we should just leave it alone
            if(parts.length) {
                // There were emotes, so grab the last bit of text at the end
                var before_text = node.data.slice(end_of_prev);
                if(before_text) {
                    parts.push(document.createTextNode(before_text));
                }

                // Insert all our new nodes
                for(var i = 0; i < parts.length; i++) {
                    parent.insertBefore(parts[i], node);
                }

                // Remove original text node
                deletion_list.push(node);
            }
        }
    }

    for(var i = 0; i < deletion_list.length; i++) {
        var node = deletion_list[i];
        node.parentNode.removeChild(node);
    }
}

function run(prefs) {
    if(!prefs.enableGlobalEmotes) {
        return;
    }

    // Only apply a subset of CSS globally. We don't need bpmotes.css, extracss,
    // or combiners nonsense as we ignore all flags and have no real "custom" stuff.
    //
    // We run this here, instead of down in the main bit, to avoid applying large
    // chunks of CSS when this script is disabled.
    //
    // Does nothing on Firefox.
    apply_css("/emote-classes.css");

    var sr_array = make_sr_array(prefs);
    process(prefs, sr_array, document.body);

    switch(platform) {
        case "chrome":
        case "firefox":
            var observer = new MutationSummary({
                callback: function(summaries) {
                    var elements = summaries[0].added;
                    for(var i = 0; i < elements.length; i++) {
                        process(prefs, sr_array, elements[i]);
                    }
                },
                queries: [
                    {element: "*"} // All elements (since any of them can contain text)
                ]});
            break;

        case "opera":
        default:
            document.body.addEventListener("DOMNodeInserted", function(event) {
                var element = event.target;
                process(prefs, sr_array, elements[i]);
            }, false);
            break;
    }
}

// Manual whitelisting on Firefox, because we can't exclude URL's
if(!endsWith(document.location.hostname, "reddit.com")) {
    // This script is generally run before the DOM is built. Opera may break
    // that rule, but I don't know how and there's nothing we can do anyway.
    window.addEventListener("DOMContentLoaded", function() {
        get_prefs(run);
    }, false);
}
