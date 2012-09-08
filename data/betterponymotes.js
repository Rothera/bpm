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

// Embed JS data files, for Opera
/*$(EMOTE_MAP)*/
/*$(SR_DATA)*/

// Browser detection- this script runs unmodified on all supported platforms,
// so inspect a couple of potential global variables to see what we have.
var platform = "unknown";
// "self" exists on Chrome as well. I don't know what it is
if(typeof(self.on) !== "undefined") {
    platform = "firefox";
} else if(typeof(chrome) !== "undefined") {
    platform = "chrome";
} else if(typeof(opera) !== "undefined") {
    platform = "opera";
}

var pref_cache = null;
var pref_callbacks = [];

// callback(prefs) gets run when preferences are available
function get_prefs(callback) {
    if(pref_cache !== null) {
        callback(pref_cache);
    } else {
        pref_callbacks.push(callback);
    }
}

// Called from the browser-specific code
function set_prefs(prefs) {
    pref_cache = prefs;
    for(var i = 0; i < pref_callbacks.length; i++) {
        pref_callbacks[i](prefs);
    }
    pref_callbacks = [];
}

// Setup some platform-agnostic API's- preferences and CSS
var prefs_updated, apply_css;

switch(platform) {
    case "firefox":
        prefs_updated = function() {
            self.port.emit("set_prefs", pref_cache);
        };

        apply_css = function(filename) {
            // CSS is handled in main.js on Firefox
        };

        self.port.on("prefs", set_prefs);
        self.port.emit("get_prefs");
        break;

    case "chrome":
        prefs_updated = function() {
            chrome.extension.sendMessage({"method": "set_prefs", "prefs": pref_cache});
        };

        apply_css = function(filename) {
            // <link> to our embedded file
            var tag = document.createElement("link");
            tag.href =  chrome.extension.getURL(filename);
            tag.rel = "stylesheet";
            // I think this ends up in <head> for some reason
            document.documentElement.insertBefore(tag);
        };

        chrome.extension.sendMessage({"method": "get_prefs"}, set_prefs);
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

        prefs_updated = function() {
            opera.extension.postMessage({"method": "set_prefs", "prefs": pref_cache});
        };

        apply_css = function(filename) {
            get_file(filename, function(data) {
                var tag = document.createElement("style");
                tag.setAttribute("type", "text/css");
                tag.appendChild(document.createTextNode(data));
                document.head.insertBefore(tag, document.head.firstChild);
            });
        };

        opera.extension.addEventListener("message", function(event) {
            var message = event.data;
            switch(message.method) {
                case "file_loaded":
                    file_callbacks[message.filename](message.data);
                    delete file_callbacks[message.filename];
                    break;

                case "prefs":
                    set_prefs(message.prefs);
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
    if(element.parentNode !== null) {
        if(element.parentNode.id == id) {
            return true;
        } else {
            return hasParentWithId(element.parentNode, id);
        }
    }
    return false;
}

// Same, but for CSS classes
function hasParentWithClass(element, className) {
    if(element.parentNode !== null && element.parentNode.className !== undefined) {
        if(element.parentNode.className.indexOf(className) > -1) {
            return true;
        } else {
            return hasParentWithClass(element.parentNode, className);
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

function display_alt_text(elements) {
    for(var i = 0; i < elements.length; i++) {
        var element = elements[i];
        if(element.title) {
            // As a note: alt-text kinda has to be a block-level element. If
            // you make it inline, it has the nice property of putting it where
            // the emote was in the middle of a paragraph, but since the emote
            // itself goes to the left, it just gets split up. This also makes
            // long chains of emotes with alt-text indecipherable.
            //
            // Inline *is*, however, rather important sometimes- particularly
            // -inp emotes. As a bit of a hack, we assume the emote code has
            // already run, and check for bpflag-in/bpflag-inp.
            var at_element;
            if(element.className.indexOf("bpflag-in") > -1 || element.className.indexOf("bpflag-inp") > -1) {
                at_element = document.createElement("span");
            } else {
                at_element = document.createElement("div");
            }

            at_element.className = "bpm-alttext";
            at_element.textContent = element.title;

            var before = element.nextSibling;
            if(before !== null && before.className !== undefined && before.className.indexOf("expando-button") > -1) {
                before = before.nextSibling;
            }
            element.parentNode.insertBefore(at_element, before);
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
    // Placeholder div to create HTML in
    var bpm_div = document.createElement("div");
    // I'd sort of prefer display:none, but then I'd have to override it
    bpm_div.style.visibility = "hidden";
    document.body.appendChild(bpm_div);

    var search_html = [
        // tabindex is hack to make Esc work. Reddit uses this index in a couple
        // of places, so probably safe.
        '<div id="bpm-search-box" tabindex="100">',
        '  <div id="bpm-toprow">',
        '     <span id="bpm-dragbox"></span>',
        '     <input id="bpm-search" type="search" placeholder="Search"/>',
        '    <span id="bpm-result-count"></span>',
        '    <span id="bpm-close"></span>',
        '  </div>',
        '  <div id="bpm-search-results"></div>',
        '  <div id="bpm-bottomrow">',
        '    <span id="bpm-help-hover">help',
        '      <div id="bpm-search-help">',
        '        <p>Searching for <code>"aj"</code> will show you all emotes with <code>"aj"</code> in their names.',
        '        <p>Searching for <code>"aj happy"</code> will show you all emotes with both <code>"aj"</code> and <code>"happy"</code> in their names.',
        '        <p>The special syntax <code>"sr:subreddit"</code> will limit your results to emotes from that subreddit.',
        '        <p>Using more than one subreddit will show you emotes from all of them.',
        '      </div>',
        '    </span>',
        '    <span id="bpm-resize"></span>',
        '  </div>',
        '</div>'
        ].join("\n");
    bpm_div.innerHTML = search_html;

    // This seems to me a rather lousy way to build HTML, but oh well
    search_box_element = document.getElementById("bpm-search-box");
    var toprow_element = document.getElementById("bpm-toprow");
    dragbox_element = document.getElementById("bpm-dragbox");
    search_element = document.getElementById("bpm-search");
    count_element = document.getElementById("bpm-result-count");
    close_element = document.getElementById("bpm-close");
    results_element = document.getElementById("bpm-search-results");
    resize_element = document.getElementById("bpm-resize");
}

function show_search_box() {
    search_box_element.style.visibility = "visible";
    search_element.focus();
}

function hide_search_box() {
    search_box_element.style.visibility = "hidden";
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
    }, false);

    window.addEventListener("mouseup", function(event) {
        dragging = false;
    }, false);

    window.addEventListener("mousemove", function(event) {
        if(dragging) {
            callback(start_x, start_y, event.clientX, event.clientY);
        }
    }, false);
}

function update_search(prefs, sr_array) {
    // Split search query on spaces, remove empty strings, and lowercase terms
    var terms = search_element.value.split(" ").map(function(v) { return v.toLowerCase(); });

    var sr_terms = [];
    var match_terms = [];
    for(var t = 0; t < terms.length; t++) {
        // If it starts with "sr:" it's subreddit syntax, otherwise it's a
        // normal search term.
        if(terms[t].indexOf("sr:") == 0) {
            sr_terms.push(terms[t].substr(3));
        } else {
            match_terms.push(terms[t]);
        }
    }

    // Filter out empty strings
    sr_terms = sr_terms.filter(function(v) { return v; });
    match_terms = match_terms.filter(function(v) { return v; });

    // If there's nothing to search on, reset and stop
    if(!sr_terms.length && !match_terms.length) {
        results_element.innerHTML = "";
        count_element.textContent = "";
        return;
    }

    var results = [];
    no_match:
    for(var emote in emote_map) {
        // Cache lowercased version
        var lc_emote = emote.toLowerCase();
        // Match if ALL search terms match
        for(var t = 0; t < match_terms.length; t++) {
            if(lc_emote.indexOf(match_terms[t]) < 0) {
                continue no_match; // outer loop, not inner
            }
        }

        // emote_map[emote][1] == subreddit id
        // sr_id_map[id] == internal sr name
        // sr_data[name][1] == "human readable name"
        // Generally this name is already lowercase, though not for bpmextras
        var source_sr_name = sr_data[sr_id_map[emote_map[emote][1]]][0].toLowerCase();

        // Match if ANY subreddit terms match
        if(sr_terms.length) {
            var is_match = false;
            for(var t = 0; t < sr_terms.length; t++) {
                if(source_sr_name.indexOf(sr_terms[t]) > -1) {
                    is_match = true;
                    break;
                }
            }
            if(!is_match) {
                continue no_match;
            }
        }

        results.push(emote);
    }
    results.sort();

    // We go through all of the results regardless of search limit (as that
    // doesn't take very long), but stop building HTML when we reach enough
    // shown emotes.
    //
    // As a result, NSFW/disabled emotes don't count toward the result.
    var html = "";
    var shown = 0, hidden = 0;
    for(var i = 0; i < results.length; i++) {
        var emote_name = results[i];
        var emote_info = emote_map[emote_name];
        var is_nsfw = emote_info[0];
        var source_id = emote_info[1];

        if(!sr_array[source_id] || (is_nsfw && !prefs.enableNSFW)) {
            // TODO: enable it anyway if a pref is set? Dunno what exactly
            // we'd do
            hidden += 1;
            continue;
        }

        if(shown >= prefs.searchLimit) {
            continue;
        } else {
            shown += 1;
        }

        // Strip off leading "/".
        var class_name = "bpmote-" + sanitize(emote_name.slice(1));
        var source_name = sr_data[sr_id_map[source_id]][0];

        // Use <span> so there's no chance of emote parse code finding
        // this
        html += "<span class=\"bpm-result " + class_name + "\" title=\"" + emote_name + " from " + source_name + "\">" + emote_name + "</span>";
    }

    results_element.innerHTML = html;

    var hit_limit = shown + hidden < results.length;
    // Format text: "X results (out of N, Y hidden)"
    var text = shown + " results";
    if(hit_limit || hidden) { text += " ("; }
    if(hit_limit)           { text += "out of " + results.length; }
    if(hit_limit && hidden) { text += ", "; }
    if(hidden)              { text += hidden + " hidden"; }
    if(hit_limit || hidden) { text += ")"; }
    count_element.textContent = text;
}

function insert_emote(emote_name) {
    if(current_form === null) {
        return;
    }

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

function setup_search(prefs, sr_array) {
    inject_search_html();

    // Close it on demand
    close_element.addEventListener("click", hide_search_box);

    /*
     * Intercept mouseover for the entire search widget, so we can remember
     * which form was being used before.
     */
    search_box_element.addEventListener("mouseover", grab_current_form);

    // Another way to close it
    search_box_element.addEventListener("keyup", function(event) {
        if(event.keyCode == 27) { // Escape key
            hide_search_box();
        }
    }, false);

    // Listen for keypresses and adjust search results. Delay 500ms after
    // start of typing to make it more responsive (otherwise it typically
    // starts searching after the first keystroke, which generates a lot
    // of output for no reason).
    var waiting = false;
    search_element.addEventListener("input", function(event) {
        if(!waiting) {
            window.setTimeout(function() {
                // Re-enable searching as early as we can, just in case
                waiting = false;
                update_search(prefs, sr_array);
            }, 500);
            waiting = true;
        }
    }, false);

    // Listen for clicks
    results_element.addEventListener("click", function(event) {
        if((" " + event.target.className + " ").indexOf(" bpm-result ") > -1) {
            var emote_name = event.target.textContent; // Bit of a hack
            insert_emote(emote_name);
        }
    }, false);

    // Set up default positions
    search_box_element.style.left = prefs.searchBoxInfo[0] + "px";
    search_box_element.style.top = prefs.searchBoxInfo[1] + "px";
    search_box_element.style.width = prefs.searchBoxInfo[2] + "px";
    search_box_element.style.height = prefs.searchBoxInfo[3] + "px";
    // 98 is a magic value from the CSS.
    // 98 = height(topbar) + margins(topbar) + margins(results) + padding(results)
    //    = 20             + 30*2            + 30               + 8
    results_element.style.height = prefs.searchBoxInfo[3] - 98 + "px"; // Styling

    // Enable dragging the window around
    var search_box_x, search_box_y;
    enable_drag(dragbox_element, function() {
        search_box_x = parseInt(search_box_element.style.left, 10);
        search_box_y = parseInt(search_box_element.style.top, 10);
    }, function(start_x, start_y, x, y) {
        // Don't permit it to move out the left/top side of the window
        var sb_left = Math.max(x - start_x + search_box_x, 0);
        var sb_top = Math.max(y - start_y + search_box_y, 0);

        search_box_element.style.left = sb_left + "px";
        search_box_element.style.top = sb_top + "px";

        prefs.searchBoxInfo[0] = sb_left;
        prefs.searchBoxInfo[1] = sb_top;
        prefs_updated(); // FIXME: this will be called way too often
    });

    // Enable dragging the resize element around (i.e. resizing it)
    var search_box_width, search_box_height, results_height;
    enable_drag(resize_element, function() {
        search_box_width = parseInt(search_box_element.style.width, 10);
        search_box_height = parseInt(search_box_element.style.height, 10);
        results_height = parseInt(results_element.style.height, 10);
    }, function(start_x, start_y, x, y) {
        // 420px wide prevents the search box from collapsing too much, and 98px
        // is the height of the top bar + margins*3. An extra five pixels prevents
        // the results div from disappearing completely (which can be bad).
        var sb_width = Math.max(x - start_x + search_box_width, 420);
        var sb_height = Math.max(y - start_y + search_box_height, 98+5);

        search_box_element.style.width = sb_width + "px";
        search_box_element.style.height = sb_height + "px";
        results_element.style.height = sb_height - 98 + "px";

        prefs.searchBoxInfo[2] = sb_width;
        prefs.searchBoxInfo[3] = sb_height;
        prefs_updated(); // FIXME again
    });
}

function wire_emotes_button(button) {
    button.addEventListener("mouseover", grab_current_form);

    button.addEventListener("click", function(event) {
        var sb_element = document.getElementById("bpm-search-box");
        if(sb_element.style.visibility != "visible") {
            show_search_box();
        } else {
            hide_search_box();
        }
    }, false);
}

function inject_search_button(spans) {
    for(var i = 0; i < spans.length; i++) {
        // Matching the "formatting help" button is tricky- there's no great
        // way to find it. This seems to work, but I expect false positives from
        // reading the Reddit source code.
        if(spans[i].className.indexOf("help-toggle") > -1) {
            var existing = spans[i].getElementsByClassName("bpm-search-toggle");
            /*
             * Reddit's JS uses cloneNode() when making reply forms. As such,
             * we need to be able to handle two distinct cases- wiring up the
             * top-level reply box that's there from the start, and wiring up
             * clones of that form with our button already in it.
             */
            if(existing.length) {
                wire_emotes_button(existing[0]);
            } else {
                var button = document.createElement("button");
                button.setAttribute("type", "button"); // Default is "submit"; not good
                button.className = "bpm-search-toggle";
                button.textContent = "emotes";
                wire_emotes_button(button);
                // Put it at the end- Reddit's JS uses get(0) when looking for
                // elements related to the "formatting help" linky, and we don't
                // want to get in the way of that.
                spans[i].appendChild(button);
            }
        }
    }
}

function run(prefs) {
    var sr_array = make_sr_array(prefs);
    // Initial pass- show all emotes currently on the page.
    var posts = document.getElementsByClassName("md");
    for(var i = 0; i < posts.length; i++) {
        var links = posts[i].getElementsByTagName("a");
        // NOTE: must run alt-text AFTER emote code, always. See note in
        // display_alt_text
        process(prefs, sr_array, links);
        if(prefs.showAltText) {
            display_alt_text(links);
        }
    }

    setup_search(prefs, sr_array);
    // Find the one reply box that's there on page load. This may not always work...
    inject_search_button(document.getElementsByClassName("help-toggle"));

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
                    var links = summaries[0].added;
                    process(prefs, sr_array, links);
                    if(prefs.showAltText) {
                        display_alt_text(links.filter(function(e) { return hasParentWithClass(e, "md"); }));
                    }
                    inject_search_button(summaries[1].added);
                },
                queries: [
                    // FIXME: Ideally we'd query {element: ".md"}, but for some
                    // reason that doesn't work.
                    {element: "a"}, // new emotes
                    {element: "span"} // comment reply forms
                ]});
            break;

        case "opera":
        default:
            // MutationObserver doesn't exist outisde Fx/Chrome, so
            // fallback to basic DOM events.
            document.body.addEventListener("DOMNodeInserted", function(event) {
                var element = event.target;
                if(element.getElementsByTagName) {
                    var links = element.getElementsByTagName("a");
                    process(prefs, sr_array, links);
                    if(prefs.showAltText) {
                        // Filter list
                        var at_links = [];
                        for(var i = 0; i < links.length; i++) {
                            if(hasParentWithClass(links[i], "md")) {
                                at_links.push(links[i]);
                            }
                        }
                        display_alt_text(at_links);
                    }
                    inject_search_button(element.getElementsByClassName("help-toggle"));
                }
            }, false);
            break;
    }
}

// Does nothing on Firefox
apply_css("/bpmotes.css");
apply_css("/emote-classes.css");

get_prefs(function(prefs) {
    if(prefs.enableExtraCSS) {
        // TODO: The only reason we still keep extracss separate is because
        // we don't have a flag_map for it yet. Maybe this works better,
        // though- this file tends to take a surprisingly long time to add...
        if(platform === "opera" && is_opera_next) {
            apply_css("/extracss-next.css");
        } else {
            apply_css("/extracss.css");
        }
    }
    if(prefs.enableNSFW) {
        apply_css("/combiners-nsfw.css");
    }
});

// This script is generally run before the DOM is built. Opera may break
// that rule, but I don't know how and there's nothing we can do anyway.
window.addEventListener("DOMContentLoaded", function() {
    get_prefs(run);
}, false);
