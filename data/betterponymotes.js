// ==UserScript==
// @description View Reddit ponymotes across the site
// @downloadURL http://rainbow.mlas1.us/betterponymotes.user.js
// @grant GM_log
// @grant GM_getValue
// @grant GM_setValue
// @include http://*/*
// @include https://*/*
// @name BetterPonymotes
// @namespace http://rainbow.mlas1.us/
// @require emote-map.js?p=2&dver=54
// @require sr-data.js?p=2&dver=54
// @require pref-setup.js?p=2&cver=30
// @run-at document-start
// @updateURL http://rainbow.mlas1.us/betterponymotes.user.js
// @version 30.54
// ==/UserScript==

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

var BPM_CODE_VERSION = 30;
var BPM_DATA_VERSION = 54;
var BPM_RESOURCE_PREFIX = "http://rainbow.mlas1.us/";

var _bpm_global = (!this ? window : this);

var bpm_utils = {
    // Browser detection- this script runs unmodified on all supported platforms,
    // so inspect a couple of potential global variables to see what we have.
    platform: (function(global) {
        // FIXME: "self" is a standard object, though self.on is specific to
        // Firefox content scripts. I'd prefer something a little more clearly
        // affiliated, though.
        //
        // Need to check GM_log first, because stuff like chrome.extension
        // exists even in userscript contexts.
        if(global.GM_log !== undefined) {
            return "userscript";
        } else if(self.on !== undefined) {
            return "firefox-ext";
        } else if(global.chrome !== undefined && global.chrome.extension !== undefined) {
            return "chrome-ext";
        } else if(global.opera !== undefined && global.opera.extension !== undefined) {
            return "opera-ext";
        } else {
            // bpm_log doesn't exist, so this is as good a guess as we get
            console.log("BPM: ERROR: Unknown platform!");
            return "unknown";
        }
    })(_bpm_global),

    MutationObserver: (function(global) { return global.MutationObserver || global.WebKitMutationObserver || global.MozMutationObserver || null; })(_bpm_global),

    observe: function(setup_mo, init_mo, setup_dni) {
        // Wrapper to run MutationObserver-based code where possible, and fall
        // back to DOMNodeInserted otherwise.
        if(this.MutationObserver !== null) {
            var observer = setup_mo();

            try {
                init_mo(observer);
                return;
            } catch(e) {
                bpm_log("BPM: ERROR: Can't use MutationObserver. Falling back to DOMNodeInserted. (info: L" + e.lineNumber + ": ", e.name + ": " + e.message + ")");
            }
        }

        setup_dni();
    },

    style_tag: function(css) {
        var tag = document.createElement("style");
        tag.type = "text/css";
        tag.appendChild(document.createTextNode(css));
        return tag;
    },

    stylesheet_link: function(url) {
        var tag = document.createElement("link");
        tag.href = url;
        tag.rel = "stylesheet";
        tag.type = "text/css";
        return tag;
    },

    copy_properties: function(to, from) {
        for(var key in from) {
            to[key] = from[key];
        }
    },

    has_class: function(element, class_name) {
        return (" " + element.className + " ").indexOf(" " + class_name + " ") > -1;
    },

    id_above: function(element, id) {
        if(element.id === id) {
            return true;
        } else if(element.parentNode !== null) {
            return bpm_utils.id_above(element.parentNode, id);
        } else {
            return false;
        }
    },

    class_above: function(element, class_name) {
        if(element.className === undefined) {
            return false;
        }

        if(bpm_utils.has_class(element, class_name)) {
            return true;
        }

        if(element.parentNode !== null) {
            return bpm_utils.class_above(element.parentNode, class_name);
        }
    },

    ends_with: function(text, s) {
        return text.slice(-s.length) === s;
    },

    catch_errors: function(f) {
        return function() {
            try {
                return f.apply(this, arguments);
            } catch(e) {
                bpm_log("BPM: ERROR: Exception on line " + e.lineNumber + ": ", e.name + ": " + e.message);
            }
        };
    },

    // Converts an emote name (or similar) to the associated CSS class.
    //
    // Keep this in sync with the Python code.
    sanitize: function(s) {
        return s.toLowerCase().replace("!", "_excl_").replace(":", "_colon_");
    },

    enable_drag: function(element, start_callback, callback) {
        var start_x, start_y;
        var dragging = false;

        element.addEventListener("mousedown", function(event) {
            start_x = event.clientX;
            start_y = event.clientY;
            dragging = true;
            start_callback(event);
        }, false);

        window.addEventListener("mouseup", function(event) {
            dragging = false;
        }, false);

        window.addEventListener("mousemove", function(event) {
            if(dragging) {
                callback(event, start_x, start_y, event.clientX, event.clientY);
            }
        }, false);
    },

    with_dom: function(callback) {
        if(document.readyState === "interactive" || document.readyState === "complete") {
            callback();
        } else {
            document.addEventListener("DOMContentLoaded", function(event) {
                callback();
            }, false);
        }
    }
};

// Chrome is picky about bind().
var bpm_log = bpm_utils.platform === "userscript" ? GM_log : console.log.bind(console);

var bpm_browser = {
    css_parent: function() {
        return document.head;
    },

    add_css: function(css) {
        if(css) {
            var tag = bpm_utils.style_tag(css);
            this.css_parent().insertBefore(tag, this.css_parent().firstChild);
        }
    },

    set_pref: function(key, value) {
        this._send_message("set_pref", {"pref": key, "value": value});
    },

    request_prefs: function() {
        this._send_message("get_prefs");
    },

    request_custom_css: function() {
        this._send_message("get_custom_css");
    }

    // Missing attributes/methods:
    //    function css_parent()
    //    function _send_message(method, data)
    //    function link_css(filename)
    // Assumed globals:
    //    var sr_id_map
    //    var sr_data
    //    var emote_map
};

switch(bpm_utils.platform) {
case "firefox-ext":
    bpm_utils.copy_properties(bpm_browser, {
        _send_message: function(method, data) {
            if(data === undefined) {
                data = {};
            }
            data["method"] = method;
            self.postMessage(data);
        },

        link_css: function(filename) {
            // FIXME: Hardcoding this sucks. It's likely to continue working for
            // a good long while, but we should prefer make a request to the
            // backend for the prefix (not wanting to do that is the reason for
            // hardcoding it). Ideally self.data.url() would be accessible to
            // content scripts, but it's not...
            var url = "resource://jid1-thrhdjxskvsicw-at-jetpack/betterponymotes/data" + filename;
            var tag = bpm_utils.stylesheet_link(url);
            // Seems to work in Firefox, and we get to put our tags in a pretty
            // place!
            this.css_parent().insertBefore(tag, this.css_parent().firstChild);
        }
    });

    self.on("message", function(message) {
        switch(message.method) {
        case "prefs":
            bpm_prefs.got_prefs(message.prefs);
            break;

        case "custom_css":
            bpm_browser.add_css(message.css);
            break;

        default:
            bpm_log("BPM: ERROR: Unknown request from Firefox background script: '" + message.method + "'");
            break;
        }
    });
    break;

case "chrome-ext":
    bpm_utils.copy_properties(bpm_browser, {
        css_parent: function() {
            return document.documentElement;
        },

        _send_message: function(method, data) {
            if(data === undefined) {
                data = {};
            }
            data["method"] = method;
            chrome.extension.sendMessage(data, this._message_handler.bind(this));
        },

        _message_handler: function(message) {
            switch(message.method) {
            case "prefs":
                bpm_prefs.got_prefs(message.prefs);
                break;

            case "custom_css":
                bpm_browser.add_css(message.css);
                break;

            default:
                bpm_log("BPM: ERROR: Unknown request from Chrome background script: '" + message.method + "'");
                break;
            }
        },

        link_css: function(filename) {
            var tag = bpm_utils.stylesheet_link(chrome.extension.getURL(filename));
            // document.head does not exist at this point in Chrome (it's null).
            // Trying to access it seems to blow it away. Strange. This will
            // have to suffice (though it gets them "backwards").
            this.css_parent().insertBefore(tag, this.css_parent().firstChild);
        }
    });
    break;

case "opera-ext":
    bpm_utils.copy_properties(bpm_browser, {
        _send_message: function(method, data) {
            if(data === undefined) {
                data = {};
            }
            data["method"] = method;
            opera.extension.postMessage(data);
        },

        link_css: function(filename) {
            this._get_file(filename, function(data) {
                var tag = bpm_utils.style_tag(data);
                this.css_parent().insertBefore(tag, this.css_parent().firstChild);
            }.bind(this));
        }
    });

    // Opera Next (12.50) has a better API to load the contents of an
    // embedded file than making a request to the backend process. Use
    // that if available.
    if(opera.extension.getFile) {
        bpm_utils.copy_properties(bpm_browser, {
            _is_opera_next: true, // Close enough

            _get_file: function(filename, callback) {
                var file = opera.extension.getFile(filename);
                if(file) {
                    var reader = new FileReader();
                    reader.onload = function() {
                        callback(reader.result);
                    };
                    reader.readAsText(file);
                } else {
                    bpm_log("BPM: ERROR: Opera getFile() failed on '" + filename + "'");
                }
            }
        });
    } else {
        bpm_utils.copy_properties(bpm_browser, {
            _is_opera_next: false,
            _file_callbacks: {},

            _get_file: function(filename, callback) {
                this._file_callbacks[filename] = callback;
                this._send_message("get_file", {"filename": filename});
            }
        });
    }

    opera.extension.addEventListener("message", function(event) {
        var message = event.data;
        switch(message.method) {
        case "file_loaded":
            bpm_browser._file_callbacks[message.filename](message.data);
            delete bpm_browser._file_callbacks[message.filename];
            break;

        case "prefs":
            bpm_prefs.got_prefs(message.prefs);
            break;

        case "custom_css":
            bpm_browser.add_css(message.css);
            break;

        default:
            bpm_log("BPM: ERROR: Unknown request from Opera background script: '" + message.method + "'");
            break;
        }
    }, false);
    break;

case "userscript":
    bpm_utils.copy_properties(bpm_browser, {
        prefs: null,

        set_pref: function(key, value) {
            // this.prefs shared with bpm_prefs, so no need to worry
            this._sync_prefs();
        },

        _sync_prefs: function() {
            GM_setValue("prefs", JSON.stringify(this.prefs));
        },

        request_prefs: function() {
            var tmp = GM_getValue("prefs");
            if(tmp === undefined) {
                tmp = "{}";
            }

            this.prefs = JSON.parse(tmp);
            bpm_backendsupport.setup_prefs(this.prefs, sr_data);
            this._sync_prefs();

            bpm_prefs.got_prefs(this.prefs);
        },

        request_custom_css: function() {
        },

        link_css: function(filename) {
            var url = BPM_RESOURCE_PREFIX + filename + "?p=2&dver=" + BPM_DATA_VERSION;
            var tag = bpm_utils.stylesheet_link(url);
            this.css_parent().insertBefore(tag, this.css_parent().firstChild);
        }
    });
    break;
}

var bpm_prefs = {
    prefs: null,
    sr_array: null,
    waiting: [],
    sync_timeouts: {},

    when_available: function(callback) {
        if(this.prefs) {
            callback(this);
        } else {
            this.waiting.push(callback);
        }
    },

    got_prefs: function(prefs) {
        this.prefs = prefs;
        this.make_sr_array();
        this.de_map = this.make_emote_map(prefs.disabledEmotes);
        this.we_map = this.make_emote_map(prefs.whitelistedEmotes);

        for(var i = 0; i < this.waiting.length; i++) {
            this.waiting[i](this);
        }
    },

    make_sr_array: function() {
        this.sr_array = [];
        for(var id in sr_id_map) {
            this.sr_array[id] = this.prefs.enabledSubreddits[sr_id_map[id]];
        }
        if(this.sr_array.indexOf(undefined) > -1) {
            // Holes in the array mean holes in sr_id_map, which can't possibly
            // happen. If it does, though, any associated emotes will be hidden.
            //
            // Also bad would be items in prefs not in sr_id_map, but that's
            // more or less impossible to handle.
            bpm_log("BPM: ERROR: sr_array has holes; installation or prefs are broken!");
        }
    },

    make_emote_map: function(list) {
        var map = {};
        for(var i = 0; i < list.length; i++) {
            map[list[i]] = 1;
        }
        return map;
    },

    sync_key: function(key) {
        // Schedule pref write for one second in the future, clearing out any
        // previous timeout. Prevents excessive backend calls, which can generate
        // some lag (on Firefox, at least).
        if(this.sync_timeouts[key] !== undefined) {
            clearTimeout(this.sync_timeouts[key]);
        }

        this.sync_timeouts[key] = setTimeout(function() {
            bpm_browser.set_pref(key, this.prefs[key]);
            delete this.sync_timeouts[key];
        }.bind(this), 1000);
    }
};

var bpm_converter = {
    process: function(prefs, elements) {
        for(var i = 0; i < elements.length; i++) {
            var element = elements[i];
            if(element.className.indexOf("bpm-") > -1) {
                // Already processed: has bpm-emote or bpm-unknown on it. It
                // doesn't really matter if this function runs on emotes more
                // than once (it's safe), but that may change, and the class
                // spam is annoying.
                continue;
            }

            // There is an important distinction between element.href and
            // element.getAttribute("href")- the former is mangled by the
            // browser to be a complete URL, which we don't want.
            var href = element.getAttribute("href");
            if(href && href[0] === '/') {
                // Don't normalize case for emote lookup
                var parts = href.split("-");
                var emote_name = parts[0];

                if(emote_map[emote_name]) {
                    var emote_info = emote_map[emote_name];
                    var is_nsfw = emote_info[0];
                    var source_id = emote_info[1];
                    var emote_size = emote_info[2];

                    // Click blocker CSS/JS
                    element.className += " bpm-emote";
                    element.dataset["emote"] = emote_name; // Used in alt-text

                    if(!prefs.we_map[emote_name]) {
                        var nsfw_class = prefs.prefs.hideDisabledEmotes ? " bpm-hidden" : " bpm-nsfw";
                        var disabled_class = prefs.prefs.hideDisabledEmotes ? " bpm-hidden" : " bpm-disabled";
                        // Ordering matters a bit here- placeholders for NSFW emotes
                        // come before disabled emotes.
                        if(is_nsfw && !prefs.prefs.enableNSFW) {
                            element.className += nsfw_class;
                            if(!element.textContent) {
                                // Any existing text (there really shouldn't be any)
                                // will look funny with our custom CSS, but there's
                                // not much we can do.
                                element.textContent = "NSFW " + emote_name;
                            }
                            continue;
                        }

                        if(!prefs.sr_array[source_id] || prefs.de_map[emote_name]) {
                            element.className += disabled_class;
                            if(!element.textContent) {
                                element.textContent = "Disabled " + emote_name;
                            }
                            continue;
                        }

                        if(prefs.prefs.maxEmoteSize && emote_size > prefs.prefs.maxEmoteSize) {
                            element.className += disabled_class;
                            if(!element.textContent) {
                                element.textContent = "Large emote " + emote_name;
                            }
                            continue;
                        }
                    }

                    // Strip off leading "/".
                    element.className += " bpmote-" + bpm_utils.sanitize(emote_name.slice(1));

                    // Apply flags in turn. We pick on the naming a bit to prevent
                    // spaces and such from slipping in.
                    for(var p = 1; p < parts.length; p++) {
                        // Normalize case
                        var flag = parts[p].toLowerCase();
                        if(/^[\w\!]+$/.test(flag)) {
                            element.className += " bpflag-" + bpm_utils.sanitize(flag);
                        }
                    }
                } else if(prefs.prefs.showUnknownEmotes) {
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
                        if((!after || after === "none") && (!before || before === "none")) {
                            // Unknown emote? Good enough
                            element.className += " bpm-unknown";
                            element.textContent = "Unknown emote " + emote_name;
                        }
                    }
                }
            }
        }
    },

    // Known spoiler "emotes". Not all of these are known to BPM, and it's not
    // really worth moving this to a data file somewhere.
    // - /spoiler is from r/mylittlepony (and copied around like mad)
    // - /s is from r/falloutequestria (and r/mylittleanime has a variant)
    // - #s is from r/doctorwho
    // - /b and /g are from r/dresdenfiles
    spoiler_links: ["/spoiler", "/s", "#s", "/b", "/g"],

    // NOTE/FIXME: Alt-text isn't really related to emote conversion as-is, but
    // since it runs on a per-emote basis, it kinda goes here anyway.
    display_alt_text: function(elements) {
        for(var i = 0; i < elements.length; i++) {
            var element = elements[i];

            // Can't rely on .bpm-emote and data-emote to exist for spoiler
            // links, as many of them aren't known.
            var href = element.getAttribute("href");
            if(href && this.spoiler_links.indexOf(href.split("-")[0]) > -1) {
                continue;
            }

            if(element.title) {
                // Work around due to RES putting tag links in the middle of
                // posts. (Fucking brilliant!)
                if(bpm_utils.has_class(element, "userTagLink") ||
                   bpm_utils.has_class(element, "voteWeight")) {
                    continue;
                }

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

                // Try to move to the other side of RES's image expand buttons,
                // because otherwise they end awfully
                var before = element.nextSibling;
                while((before !== null && before.className !== undefined) &&
                      (bpm_utils.has_class(before, "expando-button") ||
                       bpm_utils.has_class(before, "bpm-sourceinfo"))) {
                    before = before.nextSibling;
                }

                if(before !== null && bpm_utils.has_class(before, "bpm-alttext")) {
                    // Already processed (before node is our previous alt text)
                    continue;
                }
                element.parentNode.insertBefore(at_element, before);
            }

            // If it's an emote, replace the actual alt-text with source
            // information
            if(bpm_utils.has_class(element, "bpm-emote")) {
                var emote_name = element.dataset["emote"];
                var source_id = emote_map[emote_name][1];
                var sr_name = sr_data[sr_id_map[source_id]][0];
                element.title = emote_name + " from " + sr_name;
            }
        }
    },

    process_posts: function(prefs, posts) {
        for(var i = 0; i < posts.length; i++) {
            var links = posts[i].getElementsByTagName("a");
            // NOTE: must run alt-text AFTER emote code, always. See note in
            // display_alt_text
            this.process(prefs, links);
            if(prefs.prefs.showAltText) {
                this.display_alt_text(links);
            }
        }
    }
};

var bpm_search = {
    container: null,
    dragbox: null,
    search: null,
    count: null,
    close: null,
    results: null,
    resize: null,
    global_icon: null, // Global << thing
    firstrun: false,

    init: function(prefs) {
        this.inject_html();

        // Close it on demand
        this.close.addEventListener("click", function(event) {
            this.hide();
        }.bind(this), false);

        /*
         * Intercept mouseover for the entire search widget, so we can remember
         * which form was being used before.
         */
        this.container.addEventListener("mouseover", function(event) {
            this.grab_target_form();
        }.bind(this), false);

        // Another way to close it
        this.container.addEventListener("keyup", function(event) {
            if(event.keyCode === 27) { // Escape key
                this.hide();
            }
        }.bind(this), false);

        // Listen for keypresses and adjust search results. Delay 500ms after
        // start of typing to make it more responsive (otherwise it typically
        // starts searching after the first keystroke, which generates a lot
        // of output for no reason).
        var waiting = false;
        this.search.addEventListener("input", function(event) {
            if(!waiting) {
                window.setTimeout(function() {
                    // Re-enable searching as early as we can, just in case
                    waiting = false;
                    this.update_search(prefs);
                }.bind(this), 500);
                waiting = true;
            }
        }.bind(this), false);

        // Listen for clicks
        this.results.addEventListener("click", function(event) {
            if((" " + event.target.className + " ").indexOf(" bpm-result ") > -1) {
                // .dataset would probably be nicer, but just in case...
                var emote_name = event.target.getAttribute("data-emote");
                this.insert_emote(emote_name);
            }
        }.bind(this), false);

        // Set up default positions
        this.container.style.left = prefs.prefs.searchBoxInfo[0] + "px";
        this.container.style.top = prefs.prefs.searchBoxInfo[1] + "px";
        this.container.style.width = prefs.prefs.searchBoxInfo[2] + "px";
        this.container.style.height = prefs.prefs.searchBoxInfo[3] + "px";
        // 98 is a magic value from the CSS.
        // 98 = height(topbar) + margins(topbar) + margins(results) + padding(results)
        //    = 20             + 30*2            + 30               + 8
        this.results.style.height = prefs.prefs.searchBoxInfo[3] - 98 + "px"; // Styling
        this.global_icon.style.left = prefs.prefs.globalIconPos[0] + "px";
        this.global_icon.style.top = prefs.prefs.globalIconPos[1] + "px";

        // Enable dragging the window around
        var search_box_x, search_box_y;
        bpm_utils.enable_drag(this.dragbox, function(event) {
            search_box_x = parseInt(this.container.style.left, 10);
            search_box_y = parseInt(this.container.style.top, 10);
        }.bind(this), function(event, start_x, start_y, x, y) {
            // Don't permit it to move out the left/top side of the window
            var sb_left = Math.max(x - start_x + search_box_x, 0);
            var sb_top = Math.max(y - start_y + search_box_y, 0);

            this.container.style.left = sb_left + "px";
            this.container.style.top = sb_top + "px";

            prefs.prefs.searchBoxInfo[0] = sb_left;
            prefs.prefs.searchBoxInfo[1] = sb_top;
            bpm_prefs.sync_key("searchBoxInfo"); // FIXME: this will be called way too often
        }.bind(this));

        // Enable dragging the resize element around (i.e. resizing it)
        var search_box_width, search_box_height, results_height;
        bpm_utils.enable_drag(this.resize, function(event) {
            search_box_width = parseInt(this.container.style.width, 10);
            search_box_height = parseInt(this.container.style.height, 10);
            results_height = parseInt(this.results.style.height, 10);
        }.bind(this), function(event, start_x, start_y, x, y) {
            // 420px wide prevents the search box from collapsing too much, and 98px
            // is the height of the top bar + margins*3. An extra five pixels prevents
            // the results div from disappearing completely (which can be bad).
            var sb_width = Math.max(x - start_x + search_box_width, 420);
            var sb_height = Math.max(y - start_y + search_box_height, 98+5);

            this.container.style.width = sb_width + "px";
            this.container.style.height = sb_height + "px";
            this.results.style.height = sb_height - 98 + "px";

            prefs.prefs.searchBoxInfo[2] = sb_width;
            prefs.prefs.searchBoxInfo[3] = sb_height;
            bpm_prefs.sync_key("searchBoxInfo"); // FIXME again
        }.bind(this));

        // Enable dragging the global button around
        var global_icon_x, global_icon_y;
        bpm_utils.enable_drag(this.global_icon, function(event) {
            global_icon_x = parseInt(this.global_icon.style.left, 10);
            global_icon_y = parseInt(this.global_icon.style.top, 10);
        }.bind(this), function(event, start_x, start_y, x, y) {
            if(!event.ctrlKey && !event.metaKey) {
                return;
            }

            // Don't permit it to move out the left/top side of the window
            var gi_left = Math.max(x - start_x + global_icon_x, 0);
            var gi_top = Math.max(y - start_y + global_icon_y, 0);

            this.global_icon.style.left = gi_left + "px";
            this.global_icon.style.top = gi_top + "px";

            prefs.prefs.globalIconPos[0] = gi_left;
            prefs.prefs.globalIconPos[1] = gi_top;
            bpm_prefs.sync_key("globalIconPos"); // FIXME yet again
        }.bind(this));
    },

    inject_html: function() {
        // Placeholder div to create HTML in
        var div = document.createElement("div");
        // I'd sort of prefer display:none, but then I'd have to override it
        div.style.visibility = "hidden";

        var html = [
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
            '</div>',
            '<div id="bpm-global-icon" title="Hold Ctrl (Command/Meta) to drag"></div>'
            ].join("\n");
        div.innerHTML = html;
        document.body.appendChild(div);

        // This seems to me a rather lousy way to build HTML, but oh well
        this.container = document.getElementById("bpm-search-box");
        this.dragbox = document.getElementById("bpm-dragbox");
        this.search = document.getElementById("bpm-search");
        this.count = document.getElementById("bpm-result-count");
        this.close = document.getElementById("bpm-close");
        this.results = document.getElementById("bpm-search-results");
        this.resize = document.getElementById("bpm-resize");

        this.global_icon = document.getElementById("bpm-global-icon");
    },

    show: function(prefs) {
        this.container.style.visibility = "visible";
        this.search.focus();

        if(!this.firstrun) {
            this.firstrun = true;
            this.search.value = prefs.prefs.lastSearchQuery;
            this.update_search(prefs);
        }
    },

    hide: function() {
        this.container.style.visibility = "hidden";
    },

    target_form: null,

    grab_target_form: function() {
        var active = document.activeElement;
        // Ignore our own stuff and things that are not text boxes
        if(!bpm_utils.id_above(active, "bpm-search-box") && active !== bpm_search.target_form &&
           active.selectionStart !== undefined && active.selectionEnd !== undefined) {
            this.target_form = active;
        }
    },

    insert_emote: function(emote_name) {
        if(this.target_form === null) {
            return;
        }

        var start = this.target_form.selectionStart;
        var end = this.target_form.selectionEnd;
        if(start !== undefined && end !== undefined) {
            var emote_len;
            if(start !== end) {
                // Make selections into alt-text.
                // "[](" + ' "' + '")'
                emote_len = 7 + emote_name.length + (end - start);
                this.target_form.value = (
                    this.target_form.value.slice(0, start) +
                    "[](" + emote_name + " \"" +
                    this.target_form.value.slice(start, end) + "\")" +
                    this.target_form.value.slice(end));
            } else {
                // "[](" + ")"
                emote_len = 4 + emote_name.length;
                this.target_form.value = (
                    this.target_form.value.slice(0, start) +
                    "[](" + emote_name + ")" +
                    this.target_form.value.slice(end));
            }
            this.target_form.selectionStart = end + emote_len;
            this.target_form.selectionEnd = end + emote_len;

            // Trigger preview update in RES, which *specifically* listens for keyup.
            var event = document.createEvent("Event");
            event.initEvent("keyup", true, true);
            this.target_form.dispatchEvent(event);
        }
    },

    update_search: function(prefs) {
        // Split search query on spaces, remove empty strings, and lowercase terms
        var terms = this.search.value.split(" ").map(function(v) { return v.toLowerCase(); });
        prefs.prefs.lastSearchQuery = terms.join(" ");
        bpm_prefs.sync_key("lastSearchQuery");

        var sr_terms = [];
        var match_terms = [];
        for(var t = 0; t < terms.length; t++) {
            // If it starts with "sr:" it's subreddit syntax, otherwise it's a
            // normal search term.
            if(terms[t].indexOf("sr:") === 0) {
                sr_terms.push(terms[t].slice(3));
            } else {
                match_terms.push(terms[t]);
            }
        }

        // Filter out empty strings
        sr_terms = sr_terms.filter(function(v) { return v; });
        match_terms = match_terms.filter(function(v) { return v; });

        // If there's nothing to search on, reset and stop
        if(!sr_terms.length && !match_terms.length) {
            this.results.innerHTML = "";
            this.count.textContent = "";
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
            var emote_size = emote_info[2];

            // if((blacklisted) && !whitelisted)
            if((!prefs.sr_array[source_id] || (is_nsfw && !prefs.prefs.enableNSFW) ||
                prefs.de_map[emote_name] ||
                (prefs.prefs.maxEmoteSize && emote_size > prefs.prefs.maxEmoteSize)) &&
               !prefs.we_map[emote_name]) {
                // TODO: enable it anyway if a pref is set? Dunno what exactly
                // we'd do
                hidden += 1;
                continue;
            }

            if(shown >= prefs.prefs.searchLimit) {
                continue;
            } else {
                shown += 1;
            }

            // Strip off leading "/".
            var class_name = "bpmote-" + bpm_utils.sanitize(emote_name.slice(1));
            var source_name = sr_data[sr_id_map[source_id]][0];

            // Use <span> so there's no chance of emote parse code finding
            // this.
            html += "<span data-emote=\"" + emote_name + "\" class=\"bpm-result " +
                    class_name + "\" title=\"" + emote_name + " from " + source_name + "\"></span>";
        }

        this.results.innerHTML = html;

        var hit_limit = shown + hidden < results.length;
        // Format text: "X results (out of N, Y hidden)"
        var text = shown + " results";
        if(hit_limit || hidden) { text += " ("; }
        if(hit_limit)           { text += "out of " + results.length; }
        if(hit_limit && hidden) { text += ", "; }
        if(hidden)              { text += hidden + " hidden"; }
        if(hit_limit || hidden) { text += ")"; }
        this.count.textContent = text;
    },

    inject_search_button: function(prefs, spans) {
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
                    this.wire_emotes_button(prefs, existing[0]);
                } else {
                    var button = document.createElement("button");
                    // Default is "submit", which is not good (saves the comment).
                    // Safari has some extremely weird bug where button.type
                    // seems to be readonly. Writes fail silently.
                    button.setAttribute("type", "button");
                    button.className = "bpm-search-toggle";
                    button.textContent = "emotes";
                    // Since we come before the save button in the DOM, we tab
                    // first, but this is generally annoying. Correcting this
                    // ideally would require either moving, or editing the save
                    // button, which I'd rather not do.
                    //
                    // So instead it's just untabbable.
                    button.tabIndex = 100;
                    this.wire_emotes_button(prefs, button);
                    // Put it at the end- Reddit's JS uses get(0) when looking for
                    // elements related to the "formatting help" linky, and we don't
                    // want to get in the way of that.
                    spans[i].appendChild(button);
                }
            }
        }
    },

    setup_global_search: function(prefs) {
        this.global_icon.style.visibility = "visible";

        this.global_icon.addEventListener("click", function(event) {
            // Don't open at the end of a drag (only works if you release the
            // mouse button before the ctrl/meta key though...)
            if(!event.ctrlKey && !event.metaKey) {
                this.show(prefs);
            }
        }.bind(this), false);
    },

    wire_emotes_button: function(prefs, button) {
        button.addEventListener("mouseover", function(event) {
            this.grab_target_form();
        }.bind(this), false);

        button.addEventListener("click", function(event) {
            var sb_element = document.getElementById("bpm-search-box");
            if(sb_element.style.visibility !== "visible") {
                this.show(prefs);
            } else {
                this.hide();
            }
        }.bind(this), false);
    }
};

var bpm_global = {
    // As a note, this regexp is a little forgiving in some respects and strict in
    // others. It will not permit text in the [] portion, but alt-text quotes don't
    // have to match each other.
    //
    //                           <   emote   >   <    alt-text     >
    emote_regexp: /\[\]\((\/[\w!:\-]+)\s*(?:["']([^"]*)["'])?\)/g,

    tag_blacklist: {
        // Meta tags that we should never touch
        "HTML": 1, "HEAD": 1, "TITLE": 1, "BASE": 1, "LINK": 1, "META": 1, "STYLE": 1, "SCRIPT": 1,
        // Some random things I'm a little worried about
        "SVG": 1, "MATH": 1
    },

    process: function(prefs, root) {
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

            if(!this.tag_blacklist[parent.tagName]) {
                this.emote_regexp.lastIndex = 0;

                var new_elements = [];
                var end_of_prev = 0; // End index of previous emote match
                var match;

                while((match = this.emote_regexp.exec(node.data)) !== null) {
                    // Don't normalize case for emote lookup
                    var parts = match[1].split("-");
                    var emote_name = parts[0];

                    // Check that emote exists
                    if(!emote_map[emote_name]) {
                        continue;
                    }

                    var emote_info = emote_map[emote_name];
                    var is_nsfw = emote_info[0];
                    var source_id = emote_info[1];
                    var emote_size = emote_info[2];

                    // Check that it hasn't been disabled somehow
                    if(!prefs.we_map[emote_name] &&
                        (!prefs.sr_array[source_id] || prefs.de_map[emote_name] ||
                         (is_nsfw && !prefs.prefs.enableNSFW) ||
                         (prefs.prefs.maxEmoteSize && emote_size > prefs.prefs.maxEmoteSize))) {
                        continue;
                    }

                    // Keep text between the last emote and this one (or the start
                    // of the text element)
                    var before_text = node.data.slice(end_of_prev, match.index);
                    if(before_text) {
                        new_elements.push(document.createTextNode(before_text));
                    }

                    // Build emote. (Global emotes are always -in)
                    var element = document.createElement("span");
                    element.className = "bpflag-in bpmote-" + bpm_utils.sanitize(emote_name.slice(1));

                    // Don't need to do validation on flags, since our matching
                    // regexp is strict enough to begin with (although it will
                    // match ":", something we don't permit elsewhere).
                    for(var p = 1; p < parts.length; p++) {
                        var flag = parts[p].toLowerCase();
                        element.className += " bpflag-" + bpm_utils.sanitize(flag);
                    }

                    if(match[2] !== undefined) {
                        // Alt-text. (Quotes aren't captured by the regexp)
                        element.title = match[2];
                    }
                    new_elements.push(element);

                    // Next text element will start after this emote
                    end_of_prev = match.index + match[0].length;
                }

                // If length == 0, then there were no emote matches to begin with,
                // and we should just leave it alone
                if(new_elements.length) {
                    // There were emotes, so grab the last bit of text at the end
                    var before_text = node.data.slice(end_of_prev);
                    if(before_text) {
                        new_elements.push(document.createTextNode(before_text));
                    }

                    // Insert all our new nodes
                    for(var i = 0; i < new_elements.length; i++) {
                        parent.insertBefore(new_elements[i], node);
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
    },

    run: function(prefs) {
        if(!prefs.prefs.enableGlobalEmotes) {
            return;
        }

        // We run this here, instead of down in the main bit, to avoid applying large
        // chunks of CSS when this script is disabled.
        bpm_core.init_css();

        if(prefs.prefs.enableGlobalSearch) {
            bpm_search.init(prefs);
            bpm_search.setup_global_search(prefs);
        }

        this.process(prefs, document.body);

        bpm_utils.observe(function() {
            return new bpm_utils.MutationObserver(bpm_utils.catch_errors(function(mutations, observer) {
                for(var m = 0; m < mutations.length; m++) {
                    var added = mutations[m].addedNodes;
                    if(added === null || !added.length) {
                        continue; // Nothing to do
                    }

                    for(var a = 0; a < added.length; a++) {
                        // Check that the "node" is actually the kind of node
                        // we're interested in (as opposed to Text nodes for
                        // one thing)
                        this.process(prefs, added[a]);
                    }
                }
            }.bind(this)));
        }.bind(this), function(observer) {
            observer.observe(document, {"childList": true, "subtree": true});
        }, function() {
            document.body.addEventListener("DOMNodeInserted", function(event) {
                var element = event.target;
                this.process(prefs, element);
            }.bind(this), false);
        }.bind(this));
    }
};

var bpm_core = {
    init_css: function() {
        bpm_browser.link_css("/bpmotes.css");
        bpm_browser.link_css("/emote-classes.css");

        bpm_prefs.when_available(function(prefs) {
            if(prefs.prefs.enableExtraCSS) {
                // TODO: The only reason we still keep extracss separate is because
                // we don't have a flag_map for it yet. Maybe this works better,
                // though- this file tends to take a surprisingly long time to add...
                if(bpm_utils.platform === "opera-ext" && bpm_browser._is_opera_next) {
                    bpm_browser.link_css("/extracss-next.css");
                } else {
                    bpm_browser.link_css("/extracss.css");
                }
            }

            if(prefs.prefs.enableNSFW) {
                bpm_browser.link_css("/combiners-nsfw.css");
            }
        }.bind(this));
    },

    run: function(prefs) {
        // Inject our filter SVG for Firefox. Chrome renders this thing as a
        // massive box, but "display: none" (or putting it in <head>) makes
        // Firefox hide all of the emotes we apply the filter to- as if *they*
        // had display:none. Furthermore, "height:0;width:0" isn't quite enough
        // either, as margins or something make the body move down a fair bit
        // (leaving a white gap). "position:fixed" is a workaround for that.
        //
        // We also can't include either the SVG or the CSS as a normal resource
        // because Firefox throws security errors. No idea why.
        //
        // Can't do this before the DOM is built, because we use document.body
        // by necessity.
        //
        // Christ. I hope people use the fuck out of -i after this nonsense.
        if(bpm_utils.platform === "firefox-ext") {
            var svg_src = [
                '<svg version="1.1" baseProfile="full" xmlns="http://www.w3.org/2000/svg"',
                ' style="height: 0; width: 0; position: fixed">',
                '  <filter id="bpm-invert">',
                '    <feColorMatrix in="SourceGraphic" type="hueRotate" values="180"/>',
                '  </filter>',
                '</svg>'
            ].join("\n");
            var div = document.createElement("div");
            div.innerHTML = svg_src;
            document.body.insertBefore(div.firstChild, document.body.firstChild);

            bpm_browser.add_css(".bpflag-i { filter: url(#bpm-invert); }");
        }

        // Initial pass- show all emotes currently on the page.
        var posts = document.getElementsByClassName("md");
        bpm_converter.process_posts(prefs, posts);

        bpm_search.init(prefs);
        // Find the one reply box that's there on page load. This may not always work...
        bpm_search.inject_search_button(prefs, document.getElementsByClassName("help-toggle"));

        // Add emote click blocker
        document.body.addEventListener("click", function(event) {
            if(bpm_utils.has_class(event.target, "bpm-emote")) {
                event.preventDefault();
            }
        }.bind(this), false);

        if(bpm_utils.platform === "chrome-ext") {
            // Fix for Chrome, which sometimes doesn't rerender unknown
            // emote elements. The result is that until the element is
            // "nudged" in some way- merely viewing it in the Console/platform
            // Elements tabs will do- it won't display.
            //
            // RES seems to reliably set things off, but that won't
            // always be installed. Perhaps some day we'll trigger it
            // implicitly through other means and be able to get rid of
            // this, but for now it seems not to matter.
            var tag = document.createElement("style");
            tag.type = "text/css";
            document.head.appendChild(tag);
        }

            // As a relevant note, it's a terrible idea to set this up before
            // the DOM is built, because monitoring it for changes seems to slow
            // the process down horribly.

            // What we do here: for each mutation, inspect every .md we can
            // find- whether the node in question is deep within one, or contains
            // some.
        bpm_utils.observe(function() {
            return new bpm_utils.MutationObserver(bpm_utils.catch_errors(function(mutations, observer) {
                for(var m = 0; m < mutations.length; m++) {
                    var added = mutations[m].addedNodes;
                    if(added === null || !added.length) {
                        continue; // Nothing to do
                    }

                    for(var a = 0; a < added.length; a++) {
                        // Check that the "node" is actually the kind of node
                        // we're interested in (as opposed to Text nodes for
                        // one thing)
                        var root = added[a];
                        if(root.getElementsByTagName === undefined) {
                            continue;
                        }

                        if(bpm_utils.class_above(root, "md")) {
                            // Inside of a formatted text block, take all the
                            // links we can find
                            bpm_converter.process_posts(prefs, [root]);
                        } else {
                            // Outside of formatted text, try to find some
                            // underneath us
                            var posts = root.getElementsByClassName("md");
                            bpm_converter.process_posts(prefs, posts);
                        }

                        var spans = root.getElementsByTagName("span");
                        bpm_search.inject_search_button(prefs, spans);
                    }
                }
            }.bind(this)));
        }.bind(this), function(observer) {
            // FIXME: For some reason observe(document.body, [...]) doesn't work
            // on Firefox. It just throws an exception. document works.
            observer.observe(document, {"childList": true, "subtree": true});
        }, function() {
            // MutationObserver doesn't exist outisde Fx/Chrome, so
            // fallback to basic DOM events.
            document.body.addEventListener("DOMNodeInserted", function(event) {
                var root = event.target;

                if(root.getElementsByTagName) {
                    if(bpm_utils.class_above(root, "md")) {
                        bpm_converter.process_posts(prefs, [root]);
                    } else {
                        var posts = root.getElementsByClassName("md");
                        bpm_converter.process_posts(prefs, posts);
                    }

                    bpm_search.inject_search_button(prefs, root.getElementsByClassName("help-toggle"));
                }
            }.bind(this), false);
        }.bind(this));
    },

    main: function() {
        if(window !== window.top) {
            if(bpm_utils.ends_with(window.location.hostname, "redditmedia.com")) {
                return; // Reddit ad pages
            }
            if(bpm_utils.ends_with(window.location.hostname, "tumblr.com")) {
                return; // Quick, hopefully temporary hack to fix a problem with Tumblr
            }
            // Chrome restricts our access, because Chrome is stupid
            if(window.top !== undefined && bpm_utils.ends_with(window.top.location.hostname, "reddit.com")) {
                // Avoid running in Reddit-enclosed frames. This prevents us from
                // getting in the way inside frames added by some addons- esp.
                // inline YT viewers. I don't know what else.
                //
                // Frames on other sites will just have to live with multiple copies
                // of the global emote thing. That's usually desirable anyway, since
                // the search box can't inject emotes into sub-frame forms. (Maybe
                // we should, though?)
                return;
            }
        }

        bpm_browser.request_prefs();
        bpm_browser.request_custom_css();

        if(bpm_utils.ends_with(document.location.hostname, "reddit.com")) {
            // Most environments permit us to create <link> tags before
            // DOMContentLoaded (though Chrome forces us to use documentElement).
            // Scriptish is one that does not- there's no clear way to
            // manipulate the partial DOM, so we delay.
            var init_later = false;
            if(bpm_browser.css_parent()) {
                this.init_css();
            } else {
                init_later = true;
            }

            // This script is generally run before the DOM is built. Opera may break
            // that rule, but I don't know how and there's nothing we can do anyway.
            bpm_utils.with_dom(function() {
                if(init_later) {
                    this.init_css();
                }

                bpm_prefs.when_available(function(prefs) {
                    this.run(prefs);
                }.bind(this));
            }.bind(this));
        } else {
            bpm_utils.with_dom(function() {
                bpm_prefs.when_available(function(prefs) {
                    bpm_global.run(prefs);
                }.bind(this));
            }.bind(this));
        }
    }
};

bpm_core.main();
