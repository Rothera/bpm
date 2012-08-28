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

if(typeof(self.on) !== "undefined") {
    var bpm_platform = "firefox";
} else if(typeof(chrome) !== "undefined") {
    var bpm_platform = "chrome";
} else if(typeof(opera) !== "undefined") {
    var bpm_platform = "opera";
} else {
    console.log("BPM: ERROR: Unknown browser platform!");
    var bpm_platform = "unknown";
}

/*
 * CSS Support
 *
 * Firefox: All of this is handled in main.js.
 * Chrome: enable_css() creates links directly to the embedded stylesheet files.
 * Opera: On Opera Next, the stylesheet files are read directly and applied as
 *    <style> tags. Otherwise, a request is send to background.js for the
 *    contents of the files.
 */

switch(bpm_platform) {
    case "chrome":
        var enable_css = function(filename) {
            var tag = document.createElement("link");
            tag.href =  chrome.extension.getURL(filename);
            tag.rel = "stylesheet";
            document.documentElement.insertBefore(tag);
        };
        break;

    case "opera":
        if(opera.extension.getFile) {
            var is_opera_next = true; // Close enough!
            /* Opera Next (12.50) has getFile(), which we prefer */
            var get_file = function(filename, callback) {
                var file = opera.extension.getFile(filename);
                if(file) {
                    var reader = new FileReader();
                    reader.onload = function() {
                        callback(reader.result);
                    };
                    reader.readAsText(file);
                } else {
                    console.log("ERROR: getFile() failed on " + filename);
                }
            };
        } else {
            var file_callbacks = {};

            var on_message = function(event) {
                var message = event.data;
                switch(message.request) {
                    case "fileLoaded":
                        file_callbacks[message.filename](message.data);
                        delete file_callbacks[message.filename];
                        break;

                    default:
                        console.log("ERROR: Unknown request from background script: " + message.request);
                        break;
                }
            };
            opera.extension.addEventListener("message", on_message, false);

            var get_file = function(filename, callback) {
                file_callbacks[filename] = callback;
                opera.extension.postMessage({
                    "request": "getFile",
                    "filename": filename
                });
            };
        }

        var enable_css = function(filename) {
            get_file(filename, function(data) {
                var tag = document.createElement("style");
                tag.setAttribute("type", "text/css");
                tag.appendChild(document.createTextNode(data));
                document.head.insertBefore(tag, document.head.firstChild);
            });
        };
        break;
}

/*
 * Preferences
 *
 * Firefox: As yet, never handled here. (Otherwise, strongly typed key/value.)
 * Chrome: Strongly typed JSON data.
 * Opera: Key/value string storage.
 */

switch(bpm_platform) {
    case "chrome":
        var pref_boolean = function(prefs, name) {
            return prefs[name];
        };
        break;

    case "opera":
        var pref_boolean = function(prefs, name) {
            return prefs[name] == "true";
        };
        break;
}

function apply_basic_css() {
    enable_css("/bpmotes.css");
    enable_css("/emote-classes.css");
    enable_css("/combiners.css");
}

function apply_other_css(prefs) {
    if(pref_boolean(prefs, "enableNSFW")) {
        enable_css("/nsfw-emote-classes.css");
    } else {
        enable_css("/bpmotes-sfw.css");
    }

    if(pref_boolean(prefs, "enableExtraCSS")) {
        if(bpm_platform === "opera" && is_opera_next) {
            // Requires unprefixed CSS; both are bundled
            enable_css("/extracss-next.css");
        } else {
            enable_css("/extracss.css");
        }
    }
}

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
                var emote_info = emote_map[emote];
                var is_nsfw = emote_info[0];
                var source_id = emote_info[1];
                // But do normalize it when working out the CSS class. Also
                // strip off leading "/".
                var css_class = "bpmote-" + sanitize(emote.slice(1));

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
                        element.className += " " + "bpflag-" + sanitize(flag);
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
                var before = window.getComputedStyle(element, ":before").backgroundImage;
                // "" in Opera, "none" in Firefox and Chrome.
                if((!after || after == "none") && (!before || before == "none")) {
                    // Unknown emote? Good enough
                    element.className += " bpm-unknown";
                    element.textContent = "Unknown emote " + emote;
                    element.id = "tmp";
                }
            }
        }
    }
}

function proc_emotes() {
    process(document.getElementsByTagName("a"));

    switch(bpm_platform) {
        case "firefox":
        case "chrome":

            var observer = new MutationSummary({
                callback: function(summaries) {
                    process(summaries[0].added);
                },
                queries: [
                    {element: "a"}
                ]});
            break;

        case "opera":
        default:
            document.body.addEventListener("DOMNodeInserted", function(event) {
                var element = event.target;
                if(element.getElementsByTagName) {
                    process(element.getElementsByTagName("a"));
                }
            }, false);
            break;
    }
}

/*
 * Firefox and Chrome run this script before the DOM is built, and I'm not sure
 * when exactly Opera does. We always wait for the DOM to parse emotes.
 */

/*
 * CSS Application:
 *
 * Firefox: Not done here.
 * Chrome: Basic CSS is applied before the DOM is constructed; the rest, when
 *     the preferences are available.
 * Opera: All CSS is applied when the DOM is constructed.
 *     (Before would be preferable, but I couldn't find a way to make the approach
 *     work for some reason.)
 */

switch(bpm_platform) {
    case "firefox":
        /*
         * Firefox: CSS is applied in main.js.
         */
        window.addEventListener("DOMContentLoaded", function() {
            proc_emotes();
        }, false);
        break;

    case "chrome":
        /*
         * Chrome: Apply some CSS as early as possible, and wait for prefs to apply
         * the rest.
         */
        apply_basic_css();

        chrome.extension.sendMessage({method: "getPrefs"}, function(prefs) {
            apply_other_css(prefs);
        });

        window.addEventListener("DOMContentLoaded", function() {
            proc_emotes();

            // Fix for Chrome, which sometimes doesn't rerender unknown emote
            // elements. The result is that until the element is "nudged" in
            // some way- merely viewing it in the Console/Elements tabs will do-
            // it won't display.
            //
            // RES seems to reliably set things off, but that won't always be
            // installed. Perhaps some day we'll trigger it implicitly through
            // other means and be able to get rid of this, but for now it seems
            // not to matter.
            var tag = document.createElement("style");
            tag.setAttribute("type", "text/css");
            document.head.appendChild(tag);
        }, false);
        break;

    case "opera":
        /*
         * Opera: Prefs are always available, but for some reason we can't apply
         * CSS until the DOM is available.
         */
        window.addEventListener("DOMContentLoaded", function() {
            apply_basic_css();
            apply_other_css(widget.preferences);
            proc_emotes();
        }, false);
        break;
}
