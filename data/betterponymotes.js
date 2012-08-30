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

// Embed JS data files, for Opera
/*$(EMOTE_MAP)*/
/*$(SR_DATA)*/

"use strict";

// Browser detection- this script runs unmodified on all supported platforms,
// so inspect a couple of potential global variables to see what we have.
function current_platform() {
    // "self" exists on Chrome as well. I don't know what it is
    if(typeof(self.on) !== "undefined") {
        return "firefox";
    } else if(typeof(chrome) !== "undefined") {
        return "chrome";
    } else if(typeof(opera) !== "undefined") {
        return "opera";
    } else {
        return "unknown";
    }
}
var platform = current_platform();

// Setup some platform-agnostic API's- preferences and CSS
var browser;
switch(platform) {
    case "firefox":
        browser = {
            // TODO: This little block of preferences code is duplicated...
            _pref_cache: null,
            _pref_callbacks: [],

            get_prefs: function(callback) {
                if(this._pref_cache) {
                    callback(this._pref_cache);
                } else {
                    this._pref_callbacks.push(callback);
                }
            },

            apply_css: function(filename) {
                // CSS is handled in main.js on Firefox
            }
        };

        self.port.on("prefs", function(prefs) {
            browser._pref_cache = prefs;
            browser._pref_callbacks.forEach(function(callback) {
                callback(browser._pref_cache);
            });
            browser._pref_callbacks = [];
        });

        self.port.emit("get_prefs");
        break;

    case "chrome":
        browser = {
            _pref_cache: null,
            _pref_callbacks: [],

            get_prefs: function(callback) {
                if(this._pref_cache) {
                    callback(this._pref_cache);
                } else {
                    this._pref_callbacks.push(callback);
                }
            },

            apply_css: function(filename) {
                // <link> to our embedded file
                var tag = document.createElement("link");
                tag.href =  chrome.extension.getURL(filename);
                tag.rel = "stylesheet";
                // I think this ends up in <head> for some reason
                document.documentElement.insertBefore(tag);
            }
        };

        chrome.extension.sendMessage({"method": "get_prefs"}, function(prefs) {
            browser._pref_cache = prefs;
            browser._pref_callbacks.forEach(function(callback) {
                callback(browser._pref_cache);
            });
            browser._pref_callbacks = [];
        });
        break;

    case "opera":
        var is_opera_next;
        var get_file;

        // Opera Next (12.50) has a better API to load the contents of an
        // embedded file than making a request to the backend process. Use
        // that if available.
        if(opera.extension.getFile) {
            is_opera_next = true; // Close enough!
            get_file = function(filename, callback) {
                var file = opera.extension.getFile(filename);
                if(file) {
                    var reader = new FileReader();
                    reader.onload = function() {
                        callback(reader.result);
                    };
                    reader.readAsText(file);
                } else {
                    console.log("BPM: ERROR: getFile() failed on '" + filename + "'");
                }
            };
        } else {
            is_opera_next = false;
            var file_callbacks = {};

            get_file = function(filename, callback) {
                file_callbacks[filename] = callback;
                opera.extension.postMessage({
                    "method": "get_file",
                    "filename": filename
                });
            };
        }

        browser = {
            _pref_cache: null,
            _pref_callbacks: [],

            get_prefs: function(callback) {
                if(this._pref_cache) {
                    callback(this._pref_cache);
                } else {
                    this._pref_callbacks.push(callback);
                }
            },

            apply_css: function(filename) {
                get_file(filename, function(data) {
                    var tag = document.createElement("style");
                    tag.setAttribute("type", "text/css");
                    tag.appendChild(document.createTextNode(data));
                    document.head.insertBefore(tag, document.head.firstChild);
                });
            }
        };

        opera.extension.addEventListener("message", function(event) {
            var message = event.data;
            switch(message.method) {
                case "file_loaded":
                    file_callbacks[message.filename](message.data);
                    delete file_callbacks[message.filename];
                    break;

                case "prefs":
                    browser._pref_cache = message.prefs;
                    browser._pref_callbacks.forEach(function(callback) {
                        callback(browser._pref_cache);
                    });
                    browser._pref_callbacks = [];
                    break;

                default:
                    console.log("ERROR: Unknown request from background script: " + message.method);
                    break;
            }
        }, false);

        opera.extension.postMessage({
            "method": "get_prefs"
        });
        break;
}

// Converts an emote name (or similar) to the associated CSS class.
//
// Keep this in sync with the Python code.
function sanitize(s) {
    return s.toLowerCase().replace("!", "_excl_").replace(":", "_colon_");
}

// Emote processing: takes prefs, a pre-processed array of enabled subreddits,
// and a list of elements.
function process(prefs, sr_array, elements) {
    for(var i = 0; i < elements.length; i++) {
        var element = elements[i];
        // There is an important distinction between element.href and
        // element.getAttribute("href")- the former is mangled by the
        // browser to be a complete URL, which we don't want.
        var href = element.getAttribute("href");
        if(href && href[0] == '/') {
            // Don't normalize case for emote lookup
            var parts = href.split("-");
            var emote_name = parts[0];

            if(emote_map[emote_name]) {
                var emote_info = emote_map[emote_name];
                var is_nsfw = emote_info[0];
                var source_id = emote_info[1];

                if(!sr_array[source_id]) {
                    element.className += " bpm-disabled";
                    if(!element.textContent) {
                        // Any existing text (there really shouldn't be any)
                        // will look funny with our custom CSS, but there's
                        // not much we can do.
                        element.textContent = "Disabled " + emote_name;
                    }
                    continue;
                }

                if(!is_nsfw || prefs.enableNSFW) {
                    // Strip off leading "/".
                    element.className += " bpmote-" + sanitize(emote_name.slice(1));
                } else {
                    element.className += " bpm-nsfw";
                    if(!element.textContent) {
                        element.textContent = "NSFW " + emote_name;
                    }
                }

                // Apply flags in turn. We pick on the naming a bit to prevent
                // spaces and such from slipping in.
                for(var p = 1; p < parts.length; p++) {
                    // Normalize case
                    var flag = parts[p].toLowerCase();
                    if(/^[\w\!]+$/.test(flag)) {
                        element.className += " bpflag-" + sanitize(flag);
                    }
                }
            } else if(!element.textContent && /^\/[\w\-:!]+$/.test(emote_name) && !element.clientWidth) {
                /*
                 * If there's:
                 *    1) No text
                 *    2) href matches regexp (no slashes, mainly)
                 *    3) No size (missing bg image means it won't display)
                 *    4) No :after or :before tricks to display the image
                 *       (some subreddits do emotes with those selectors)
                 * Then it's probably an emote, but we don't know what it is.
                 * Thanks to nallar for his advice/code here.
                 */
                var after = window.getComputedStyle(element, ":after").backgroundImage;
                var before = window.getComputedStyle(element, ":before").backgroundImage;
                // "" in Opera, "none" in Firefox and Chrome.
                if((!after || after == "none") && (!before || before == "none")) {
                    // Unknown emote? Good enough
                    element.className += " bpm-unknown";
                    element.textContent = "Unknown emote " + emote_name;
                }
            }
        }
    }
}

// Converts a map of enabled subreddits to an array, indexed by subreddit ID.
function make_sr_array(prefs) {
    var sr_array = [];
    for(var id in sr_id_map) {
        sr_array[id] = prefs.enabledSubreddits[sr_id_map[id]];
    }
    if(sr_array.indexOf(undefined) > -1) {
        // Holes in the array mean holes in sr_id_map, which can't possibly
        // happen. If it does, though, any associated emotes will be hidden.
        //
        // Also bad would be items in prefs not in sr_id_map, but that's
        // more or less impossible to handle.
        console.log("BPM: ERROR: sr_enabled not filled");
    }
    return sr_array;
}

// Does nothing on Firefox
browser.apply_css("/bpmotes.css");
browser.apply_css("/emote-classes.css");
browser.apply_css("/combiners.css");

browser.get_prefs(function(prefs) {
    if(prefs.enableExtraCSS) {
        // TODO: The only reason we still keep extracss separate is because
        // we don't have a flag_map for it yet. Maybe this works better,
        // though- this file tends to take a surprisingly long time to add...
        if(platform === "opera" && is_opera_next) {
            browser.apply_css("/extracss-next.css");
        } else {
            browser.apply_css("/extracss.css");
        }
    }
});

// This script is generally run before the DOM is built. Opera may break
// that rule, but I don't know how and there's nothing we can do anyway.
window.addEventListener("DOMContentLoaded", function() {
    browser.get_prefs(function(prefs) {
        var sr_array = make_sr_array(prefs);
        // Initial pass- show all emotes currently on the page.
        process(prefs, sr_array, document.getElementsByTagName("a"));

        switch(platform) {
            case "chrome":
                // Fix for Chrome, which sometimes doesn't rerender unknown
                // emote elements. The result is that until the element is
                // "nudged" in some way- merely viewing it in the Console/
                // Elements tabs will do- it won't display.
                //
                // RES seems to reliably set things off, but that won't
                // always be installed. Perhaps some day we'll trigger it
                // implicitly through other means and be able to get rid of
                // this, but for now it seems not to matter.
                var tag = document.createElement("style");
                tag.setAttribute("type", "text/css");
                document.head.appendChild(tag);

                // Fallthrough

            case "firefox":
                // TODO: for our simplistic purposes, we really should just
                // use MutationObserver directly.
                //
                // As a relevant side note, it's a terrible idea to set this
                // up before the DOM is built, because otherwise monitoring
                // it for changes slows the initial process down horribly.
                var observer = new MutationSummary({
                    callback: function(summaries) {
                        process(prefs, sr_array, summaries[0].added);
                    },
                    queries: [
                        {element: "a"}
                    ]});
                break;

            case "opera":
            default:
                // MutationObserver doesn't exist outisde Fx/Chrome, so
                // fallback to basic DOM events.
                document.body.addEventListener("DOMNodeInserted", function(event) {
                    var element = event.target;
                    if(element.getElementsByTagName) {
                        process(prefs, sr_array, element.getElementsByTagName("a"));
                    }
                }, false);
                break;
        }
    });
}, false);
