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
                    console.log("BPM: ERROR: Opera getFile() failed on '" + filename + "'");
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
                    console.log("BPM: ERROR: Unknown request from Opera background script: '" + message.method + "'");
                    break;
            }
        }, false);

        opera.extension.postMessage({
            "method": "get_prefs"
        });
        break;
}

// Checks whether the given element has a parent with the given ID. The element
// itself does not count.
function hasParentWithId(element, id) {
    if(element.parentNode != null) {
        if(element.parentNode.id == id) {
            return true;
        } else {
            return hasParentWithId(element.parentNode, id);
        }
    }
    return false;
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
            } else if(prefs.showUnknownEmotes) {
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
                if(!element.textContent && /^\/[\w\-:!]+$/.test(emote_name) && !element.clientWidth) {
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
        console.log("BPM: ERROR: sr_array has holes; installation or prefs are broken!");
    }
    return sr_array;
}

// Emote search elements
var search_box_element;
var dragbox_element;
var search_element;
var count_element;
var close_element;
var results_element;
var resize_element;

function inject_search_html() {
    /*
    <div id="bpm-search-box">
      <div id="bpm-toprow">
        <span id="bpm-dragbox"></span>
        <input id="bpm-search" type="search" placeholder="Search"/>
        <span id="bpm-result-count"></span>
      </div>
      <div id="bpm-search-results"></div>
      <span id="bpm-resize"></span>
    </div>
    */

    // FIXME: This is a really horrible way to create HTML. In the future, we
    // should use innerHTML with our own special <div> or something.
    //
    // On the upside, we needed references to most of these elements anyway.
    search_box_element = document.createElement("div");
    var toprow_element = document.createElement("div");
    dragbox_element = document.createElement("span");
    search_element = document.createElement("input");
    count_element = document.createElement("span");
    close_element = document.createElement("span");
    results_element = document.createElement("div");
    resize_element = document.createElement("span");

    search_box_element.id = "bpm-search-box";
    toprow_element.id = "bpm-toprow";
    dragbox_element.id = "bpm-dragbox";
    search_element.id = "bpm-search";
    search_element.setAttribute("type", "search");
    search_element.setAttribute("placeholder", "Search");
    count_element.id = "bpm-result-count";
    close_element.id = "bpm-close";
    results_element.id = "bpm-search-results";
    resize_element.id = "bpm-resize";

    // Create hierarchy
    toprow_element.appendChild(dragbox_element);
    toprow_element.appendChild(search_element);
    toprow_element.appendChild(count_element);
    toprow_element.appendChild(close_element);
    search_box_element.appendChild(toprow_element);
    search_box_element.appendChild(results_element);
    search_box_element.appendChild(resize_element);

    document.body.appendChild(search_box_element);
}

var current_form = null;
function grab_current_form() {
    var active = document.activeElement;
    // Ignore our own stuff and things that are not text boxes
    if(!hasParentWithId(active, "bpm-search-box") && active !== current_form &&
       active.selectionStart !== undefined && active.selectionEnd !== undefined) {
        current_form = active;
    }
}

function enable_drag(element, start_callback, callback) {
    var start_x, start_y;
    var dragging = false;

    element.addEventListener("mousedown", function(event) {
        start_x = event.clientX;
        start_y = event.clientY;
        dragging = true;
        start_callback();
        return false;
    }, false);

    window.addEventListener("mouseup", function(event) {
        dragging = false;
        return false;
    }, false);

    window.addEventListener("mousemove", function(event) {
        if(dragging) {
            callback(start_x, start_y, event.clientX, event.clientY)
        }
        return false;
    }, false);
}

function setup_search() {
    inject_search_html();

    // Close it on demand
    close_element.addEventListener("click", function(event) {
        search_box_element.style.visibility = "hidden";
    }, false);

    /*
     * Intercept mouseover for the entire search widget, so we can remember
     * which form was being used before.
     */
    search_box_element.addEventListener("mouseover", function(event) {
        grab_current_form();
    }, false);

    // Listen for keypresses and adjust search results. Delay 500ms after
    // start of typing to make it more responsive (otherwise it typically
    // starts searching after the first keystroke, which generates a lot
    // of output for no reason).
    var waiting = false;
    search_element.addEventListener("input", function(event) {
        if(!waiting) {
            window.setTimeout(update_search, 500);
            waiting = true;
        }
    }, false);

    function update_search() {
        // Re-enable searching as early as we can, just in case
        waiting = false;
        if(!search_element.value) {
            results_element.innerHTML = "";
            count_element.textContent = "";
            return;
        }
        var results = [];
        for(var emote in emote_map) {
            if(emote.toLowerCase().indexOf(search_element.value.toLowerCase()) != -1) {
                results.push(emote);
            }
        }
        count_element.textContent = results.length + " results";
        results.sort();
        var html = "";
        for(var i = 0; i < results.length; i++) {
            // TODO: filter nsfw and disabled emotes out where appropriate
            // ALSO TODO: add option to instead add the usual placeholders
            var class_name = "bpmote-" + sanitize(results[i].slice(1));
            // Where did I go wrong?
            var subreddit_name = sr_data[sr_id_map[emote_map[results[i]][1]]][0];
            // Use <span> so there's no chance of emote parse code finding
            // this
            html += "<span class=\"bpm-result " + class_name + "\" title=\"From " + subreddit_name + "\">" + results[i] + "</span>";
        }
        results_element.innerHTML = html;
    }

    // Listen for clicks
    results_element.addEventListener("click", function(event) {
        if(current_form === null) {
            return;
        }

        if((" " + event.target.className + " ").indexOf(" bpm-result ") != -1) {
            var emote_name = event.target.textContent; // Bit of a hack
            var start = current_form.selectionStart;
            var end = current_form.selectionEnd;
            if(start !== undefined && end !== undefined) {
                var emote_len;
                if(start != end) {
                    // Make selections into alt-text.
                    // "[](" + ' "' + '")'
                    emote_len = 7 + emote_name.length + (end - start);
                    current_form.value = (
                        current_form.value.substring(0, start) +
                        "[](" + emote_name + " \"" +
                        current_form.value.substring(start, end) + "\")" +
                        current_form.value.substring(end));
                } else {
                    // "[](" + ")"
                    emote_len = 4 + emote_name.length;
                    current_form.value = (
                        current_form.value.substring(0, start) +
                        "[](" + emote_name + ")" +
                        current_form.value.substring(end));
                }
                current_form.selectionStart = end + emote_len;
                current_form.selectionEnd = end + emote_len;
            }
        }
    }, false);

    // Enable dragging the window around
    var search_box_x, search_box_y;
    enable_drag(dragbox_element, function() {
        search_box_x = parseInt(window.getComputedStyle(search_box_element).left, 10);
        search_box_y = parseInt(window.getComputedStyle(search_box_element).top, 10);
    }, function(start_x, start_y, x, y) {
        search_box_element.style.left = Math.max(x - start_x + search_box_x, 0) + "px";
        search_box_element.style.top = Math.max(y - start_y + search_box_y, 0) + "px";
    });

    // Enable dragging the resize element around (i.e. resizing it)
    var search_box_width, search_box_height, results_height;
    enable_drag(resize_element, function() {
        search_box_width = parseInt(window.getComputedStyle(search_box_element).width, 10);
        search_box_height = parseInt(window.getComputedStyle(search_box_element).height, 10);
        results_height = parseInt(window.getComputedStyle(results_element).height, 10);
    }, function(start_x, start_y, x, y) {
        search_box_element.style.width = Math.max(x - start_x + search_box_width, 365) + "px";
        search_box_element.style.height = Math.max(y - start_y + search_box_height, 90+5) + "px";
        results_element.style.height = Math.max(y - start_y + results_height, 0+5) + "px";
    });
}

function inject_search_button(anchors) {
    for(var i = 0; i < anchors.length; i++) {
        // Matching the "formatting help" button is tricky- there's no great
        // way to find it. This seems to work, but I expect false positives from
        // reading the Reddit source code.
        if(anchors[i].className.indexOf("help-toggle") > -1) {
            var button = document.createElement("button");
            button.setAttribute("type", "button"); // Default is "submit"; not good
            button.textContent = "emotes";
            anchors[i].insertBefore(button, anchors[i].firstChild);

            button.addEventListener("mouseover", function(event) {
                grab_current_form();
            }, false);

            button.addEventListener("click", function(event) {
                document.getElementById("bpm-search-box").style.visibility = "visible";
                event.stopPropagation();
                return false;
            }, false);
        }
    }
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
        // Find the one reply box that's there on page load
        inject_search_button(document.getElementsByTagName("span"));

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
                        inject_search_button(summaries[1].added);
                    },
                    queries: [
                        {element: "a"},
                        {element: "span"}
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
                        inject_search_button(element.getElementsByTagName("span"));
                    }
                }, false);
                break;
        }

        setup_search();
    });
}, false);
