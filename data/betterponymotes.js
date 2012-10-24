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
// @require bpm-data.js?p=2&dver=68_1
// @require pref-setup.js?p=2&cver=42
// @run-at document-start
// @updateURL http://rainbow.mlas1.us/betterponymotes.user.js
// @version 42.68.1
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

var BPM_CODE_VERSION = "42";
var BPM_DATA_VERSION = "68_1";
var BPM_RESOURCE_PREFIX = "http://rainbow.mlas1.us";
var BPM_OPTIONS_PAGE = BPM_RESOURCE_PREFIX + "/options.html";

var _bpm_this = this;

/*
 * Inspects the environment for global variables.
 *
 * On some platforms- particularly some userscript engines- the global this
 * object !== window, and the two may have significantly different properties.
 */
function _bpm_global(name) {
    return _bpm_this[name] || window[name] || undefined;
}

/*
 * Misc. utility functions.
 */
var bpm_utils = {
    /*
     * A string referring to the current platform BPM is running on. This is a
     * best guess, made by inspecting global variables, and needed because this
     * script runs unmodified on all supported platforms.
     */
    platform: (function() {
        // FIXME: "self" is a standard object, though self.on is specific to
        // Firefox content scripts. I'd prefer something a little more clearly
        // affiliated, though.
        //
        // Need to check GM_log first, because stuff like chrome.extension
        // exists even in userscript contexts.
        if(_bpm_global("GM_log")) {
            return "userscript";
        } else if(self.on) {
            return "firefox-ext";
        } else if(_bpm_global("chrome") && chrome.extension) {
            return "chrome-ext";
        } else if(_bpm_global("opera") && opera.extension) {
            return "opera-ext";
        } else {
            // bpm_log doesn't exist, so this is as good a guess as we get
            console.log("BPM: ERROR: Unknown platform!");
            return "unknown";
        }
    })(),

    /*
     * A reference to the MutationObserver object. It's unprefixed on Firefox,
     * but not on Chrome. Safari presumably has this as well. Defined to be
     * null on platforms that don't support it.
     */
    MutationObserver: (_bpm_global("MutationObserver") || _bpm_global("WebKitMutationObserver") || _bpm_global("MozMutationObserver") || null),

    /*
     * Wrapper to monitor the DOM for inserted nodes, using either
     * MutationObserver or DOMNodeInserted, falling back for a broken MO object.
     */
    observe_document: function(callback) {
        if(bpm_utils.MutationObserver) {
            var observer = new bpm_utils.MutationObserver(bpm_utils.catch_errors(function(mutations, observer) {
                for(var m = 0; m < mutations.length; m++) {
                    var added = mutations[m].addedNodes;
                    if(!added || !added.length) {
                        continue; // Nothing to do
                    }

                    callback(added);
                }
            }));

            try {
                // FIXME: For some reason observe(document.body, [...]) doesn't work
                // on Firefox. It just throws an exception. document works.
                observer.observe(document, {"childList": true, "subtree": true});
                return;
            } catch(e) {
                // Failed with whatever the error of the week is
                bpm_log("BPM: ERROR: Can't use MutationObserver. Falling back to DOMNodeInserted. (info: L" + e.lineNumber + ": ", e.name + ": " + e.message + ")");
            }
        }

        document.body.addEventListener("DOMNodeInserted", bpm_utils.catch_errors(function(event) {
            callback([event.target]);
        }));
    },

    /*
     * Generates a random string made of [a-z] characters, default 24 chars
     * long.
     */
    random_id: function(length) {
        if(length === undefined) {
            length = 24;
        }

        var index, tmp = "";
        for(var i = 0; i < length; i++) {
            index = Math.floor(Math.random() * 25);
            tmp += "abcdefghijklmnopqrstuvwxyz"[index];
        }
        return tmp;
    },

    /*
     * Makes a nice <style> element out of the given CSS.
     */
    style_tag: function(css) {
        var tag = document.createElement("style");
        tag.type = "text/css";
        tag.textContent = css;
        return tag;
    },

    /*
     * Makes a nice <link> element to the given URL (for CSS).
     */
    stylesheet_link: function(url) {
        var tag = document.createElement("link");
        tag.href = url;
        tag.rel = "stylesheet";
        tag.type = "text/css";
        return tag;
    },

    /*
     * Copies all properties on one object to another.
     */
    copy_properties: function(to, from) {
        for(var key in from) {
            to[key] = from[key];
        }
    },

    /*
     * Determines whether this element, or any ancestor, have the given id.
     */
    id_above: function(element, id) {
        while(true) {
            if(element.id === id) {
                return true;
            } else if(element.parentElement) {
                element = element.parentElement;
            } else {
                return false;
            }
        }
    },

    /*
     * Determines whether this element, or any ancestor, have the given class.
     */
    class_above: function(element, class_name) {
        while(true) {
            if(element.classList.contains(class_name)) {
                return element;
            } else if(element.parentElement) {
                element = element.parentElement;
            } else {
                return null;
            }
        }
    },

    /*
     * str.endswith()
     */
    ends_with: function(text, s) {
        return text.slice(-s.length) === s;
    },

    /*
     * Wraps a function with an error-detecting variant. Useful for callbacks
     * and the like, since some browsers (Firefox...) have a way of swallowing
     * exceptions.
     */
    catch_errors: function(f) {
        return function() {
            try {
                return f.apply(this, arguments);
            } catch(e) {
                bpm_log("BPM: ERROR: Exception on line " + e.lineNumber + ": ", e.name + ": " + e.message);
                throw e;
            }
        };
    },

    /*
     * Escapes an emote name (or similar) to match the CSS classes.
     *
     * Must be kept in sync with other copies, and the Python code.
     */
    sanitize: function(s) {
        return s.toLowerCase().replace("!", "_excl_").replace(":", "_colon_").replace("#", "_hash_").replace("/", "_slash_");
    },

    /*
     * Helper function to make elements "draggable", i.e. clicking and dragging
     * them will move them around.
     */
    enable_drag: function(element, start_callback, callback) {
        var on_mousemove = bpm_utils.catch_errors(function(event) {
            callback(event, start_x, start_y, event.clientX, event.clientY);
        });

        var start_x, start_y;

        element.addEventListener("mousedown", bpm_utils.catch_errors(function(event) {
            start_x = event.clientX;
            start_y = event.clientY;
            window.addEventListener("mousemove", on_mousemove, false);
            document.body.classList.add("bpm-noselect");
            start_callback(event);
        }), false);

        window.addEventListener("mouseup", bpm_utils.catch_errors(function(event) {
            window.removeEventListener("mousemove", on_mousemove, false);
            document.body.classList.remove("bpm-noselect");
        }), false);
    },

    /*
     * Runs the given callback when the DOM is ready, i.e. when DOMContentLoaded
     * fires. If that has already happened, runs the callback immediately.
     */
    with_dom: function(callback) {
        if(document.readyState === "interactive" || document.readyState === "complete") {
            callback();
        } else {
            document.addEventListener("DOMContentLoaded", bpm_utils.catch_errors(function(event) {
                callback();
            }), false);
        }
    },

    /*
     * A fairly reliable indicator as to whether or not BPM is currently
     * running in a frame.
     */
    // Firefox is funny about window/.self/.parent/.top, such that comparing
    // references is unreliable. frameElement is the only test I've found so
    // far that works consistently.
    is_frame: (window !== window.top || window.frameElement),

    _msg_script: function(id, message) {
        /*
         * BetterPonymotes hack to enable cross-origin frame communication in
         * broken browsers.
         */
        // Locate iframe, send message, remove class.
        var iframe = document.getElementsByClassName(id)[0];
        if(iframe) {
            iframe.contentWindow.postMessage(message, "*");
            iframe.classList.remove(id);
            // Locate this script tag and remove it.
            var script = document.getElementById(id);
            script.parentNode.removeChild(script);
        }
    },

    /*
     * Send a message to an iframe via postMessage(), working around any browser
     * shortcomings to do so.
     *
     * "message" must be JSON-compatible.
     *
     * Note that the targetOrigin of the postMessage() call is "*", no matter
     * what. Don't send anything even slightly interesting.
     */
    message_iframe: function(frame, message) {
        if(frame.contentWindow) {
            // Right now, only Firefox and Opera let us access this API.
            frame.contentWindow.postMessage(message, "*");
        } else {
            // Chrome and Opera don't permit *any* access to these variables for
            // some stupid reason, despite them being available on the page.
            // Inject a <script> tag that does the dirty work for us.
            var id = "__betterponymotes_esh_" + this.random_id();
            frame.classList.add(id);
            var script = document.createElement("script");
            script.type = "text/javascript";
            script.id = id;
            document.head.appendChild(script);
            script.textContent = "(" + this._msg_script.toString() + ")('" + id + "', " + JSON.stringify(message) + ");";
        }
    },

    _tag_blacklist: {
        // Meta tags we should never touch
        "HEAD": 1, "TITLE": 1, "BASE": 1, "LINK": 1, "META": 1, "STYLE": 1, "SCRIPT": 1,
        // Things I'm worried about
        "IFRAME": 1, "OBJECT": 1, "CANVAS": 1, "SVG": 1, "MATH": 1, "TEXTAREA": 1
    },
    /*
     * Walks the DOM tree from the given root, running a callback on each node
     * where its nodeType === node_filter. Pass only three arguments.
     *
     * This is supposed to be much faster than TreeWalker, and also chunks its
     * work into batches of 1000, waiting 50ms in between in order to ensure
     * browser responsiveness no matter the size of the tree.
     */
    walk_dom: function(root, node_filter, process, node, depth) {
        if(!node) {
            if(this._tag_blacklist[root.tagName]) {
                return; // A bit odd, but possible
            } else {
                // Treat root as a special case
                if(root.nodeType === node_filter) {
                    process(root);
                }
                node = root.firstChild;
                depth = 1;
            }
        }
        var num = 1000;
        // If the node/root was null for whatever reason, we die here
        while(node && num > 0) {
            num--;
            if(!this._tag_blacklist[node.tagName]) {
                // Only process valid nodes.
                if(node.nodeType === node_filter) {
                    process(node);
                }
                // Descend (but never into blacklisted tags).
                if(node.hasChildNodes()) {
                    node = node.firstChild;
                    depth++;
                    continue;
                }
            }
            while(!node.nextSibling) {
                node = node.parentNode;
                depth--;
                if(!depth) {
                    return; // Done!
                }
            }
            node = node.nextSibling;
        }
        if(!num) {
            setTimeout(function() {
                this.walk_dom(root, node_filter, process, node, depth);
            }.bind(this), 50);
        }
    },

    /*
     * Locates an element at or above the given one matching a particular test.
     */
    locate_matching_ancestor: function(element, predicate, none) {
        while(true) {
            if(predicate(element)) {
                return element;
            } else if(element.parentElement) {
                element = element.parentElement;
            } else {
                return none;
            }
        }
    },

    /*
     * Current subreddit being displayed, or null if there doesn't seem to be one.
     */
    current_subreddit: (function() {
        // FIXME: what other characters are valid?
        var match = document.location.href.match(/reddit\.com\/r\/([\w]+)/);
        if(match) {
            return match[1].toLowerCase();
        } else {
            return null;
        }
    })(),

    /*
     * Locates an element with the given class name. Logs a warning message if
     * more than one element matches. Returns null if there wasn't one.
     */
    find_class: function(root, class_name) {
        var elements = root.getElementsByClassName(class_name);
        if(!elements.length) {
            return null;
        } else if(elements.length === 1) {
            return elements[0];
        } else {
            bpm_log("BPM: ERROR: Multiple elements under " + root + " with class '" + class_name + "'");
            return elements[0];
        }
    }
};

/*
 * Log function. You should use this in preference to console.log(), which isn't
 * always available.
 */
// Chrome is picky about bind().
var bpm_log = bpm_utils.platform === "userscript" ? GM_log : console.log.bind(console);

/*
 * Misc utility functions to help make your way around Reddit's HTML.
 */
var bpm_redditutil = {
    /*
     * Shows an "error" message under an edit form, in the standard style.
     * Comparable to the "we need something here" message when you try to post
     * an empty comment.
     */
    enable_warning: function(bottom_area, class_name, message) {
        var element = bpm_utils.find_class(bottom_area, class_name);
        if(!element) {
            element = document.createElement("span");
            element.classList.add("error");
            element.classList.add(class_name);
            // Insert before the .usertext-buttons div
            var before = bpm_utils.find_class(bottom_area, "usertext-buttons");
            bottom_area.insertBefore(element, before);
        }
        element.style.display = "";
        element.textContent = message;
    },

    /*
     * Disables a previously-generated error message, if it exists.
     */
    disable_warning: function(bottom_area, class_name) {
        var element = bpm_utils.find_class(bottom_area, class_name);
        if(element) {
            element.parentNode.removeChild(element);
        }
    }
};

// Keep sync with bpgen.
var _BPM_FLAG_NSFW = 1;
var _BPM_FLAG_REDIRECT = 1 << 1;

/*
 * Emote lookup utilities. These are rather helpful, since our data format is
 * optimized for space and memory, not easy of access.
 */
var bpm_data = {
    /*
     * Tries to locate an emote, either builtin or global.
     */
    lookup_emote: function(name, custom_emotes) {
        return (this.lookup_core_emote(name) ||
                this.lookup_custom_emote(name, custom_emotes) ||
                null);
    },

    /*
     * Looks up a builtin emote's information. Returns an object with a couple
     * of properties, or null if the emote doesn't exist.
     */
    lookup_core_emote: function(name) {
        // Refer to bpgen.py:encode() for the details of this encoding
        var data = emote_map[name];
        if(!data) {
            return null;
        }

        var parts = data.split(",");
        var flag_data = parts[0];
        var source_data = parts[1];
        var tag_data = parts[2];

        var flags = parseInt(flag_data.slice(0, 1), 16);     // Hexadecimal
        var source_id = parseInt(flag_data.slice(1, 3), 16); // Hexadecimal
        var size = parseInt(flag_data.slice(3, 7), 16);      // Hexadecimal
        var is_nsfw = (flags & _BPM_FLAG_NSFW);
        var is_redirect = (flags & _BPM_FLAG_REDIRECT);

        var sources = [], start = 0, str;
        while((str = source_data.slice(start, start+2)) !== "") {
            sources.push(parseInt(str, 16));
            start += 2;
        }

        var tags = [];
        start = 0;
        while((str = tag_data.slice(start, start+2)) !== "") {
            tags.push(parseInt(str, 16));
            start += 2;
        }

        var base;
        if(is_redirect) {
            base = parts[3];
        } else {
            base = name;
        }

        return {
            name: name,
            is_nsfw: Boolean(is_nsfw),
            source_id: source_id,
            source_name: sr_id2name[source_id],
            max_size: size,

            sources: sources,
            tags: tags,

            css_class: "bpmote-" + bpm_utils.sanitize(name.slice(1)),
            base: base
        };
    },

    /*
     * Looks up a custom emote's information. The returned object is rather
     * sparse, but roughly compatible with core emote's properties.
     */
    lookup_custom_emote: function(name, custom_emotes) {
        if(custom_emotes[name] === undefined) {
            return null;
        }

        return {
            name: name,
            is_nsfw: false,
            source_id: null,
            source_name: "custom subreddit",
            max_size: null,

            sources: [],
            tags: [],

            css_class: "bpm-cmote-" + bpm_utils.sanitize(name.slice(1)),
            base: null
        };
    }
};

/*
 * Browser compatibility object. (Mostly implemented per-browser.)
 */
var bpm_browser = {
    /*
     * Returns an object that CSS-related tags can be attached to before the DOM
     * is built. May be undefined or null if there is no such object.
     */
    css_parent: function() {
        return document.head;
    },

    /*
     * Appends a <style> tag for the given CSS.
     */
    add_css: function(css) {
        if(css) {
            var tag = bpm_utils.style_tag(css);
            this.css_parent().insertBefore(tag, this.css_parent().firstChild);
        }
    },

    /*
     * Sends a set_pref message to the backend. Don't do this too often, as
     * some browsers incur a significant overhead for each call.
     */
    set_pref: function(key, value) {
        this._send_message("set_pref", {"pref": key, "value": value});
    },

    /*
     * Sends a message to the backend requesting a copy of the preferences.
     */
    request_prefs: function() {
        this._send_message("get_prefs");
    },

    /*
     * Sends a message to the backend requesting the custom CSS data.
     */
    request_custom_css: function() {
        this._send_message("get_custom_css");
    }

    // Missing attributes/methods:
    //    function css_parent()
    //    function _send_message(method, data)
    //    function link_css(filename)
    // Assumed globals:
    //    var sr_id2name
    //    var sr_name2id
    //    var emote_map
};

switch(bpm_utils.platform) {
case "firefox-ext":
    bpm_utils.copy_properties(bpm_browser, {
        _send_message: function(method, data) {
            if(data === undefined) {
                data = {};
            }
            data.method = method;
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

    self.on("message", bpm_utils.catch_errors(function(message) {
        switch(message.method) {
        case "prefs":
            bpm_prefs.got_prefs(message.prefs);
            break;

        case "custom_css":
            bpm_browser.add_css(message.css);
            bpm_prefs.got_custom_emotes(message.emotes);
            break;

        default:
            bpm_log("BPM: ERROR: Unknown request from Firefox background script: '" + message.method + "'");
            break;
        }
    }));
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
            data.method = method;
            chrome.extension.sendMessage(data, this._message_handler.bind(this));
        },

        _message_handler: function(message) {
            switch(message.method) {
            case "prefs":
                bpm_prefs.got_prefs(message.prefs);
                break;

            case "custom_css":
                bpm_browser.add_css(message.css);
                bpm_prefs.got_custom_emotes(message.emotes);
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
            data.method = method;
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
                    reader.onload = bpm_utils.catch_errors(function() {
                        callback(reader.result);
                    });
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

    opera.extension.addEventListener("message", bpm_utils.catch_errors(function(event) {
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
            bpm_prefs.got_custom_emotes(message.emotes);
            break;

        default:
            bpm_log("BPM: ERROR: Unknown request from Opera background script: '" + message.method + "'");
            break;
        }
    }), false);
    break;

case "userscript":
    bpm_utils.copy_properties(bpm_browser, {
        prefs: null,

        set_pref: function(key, value) {
            this.prefs[key] = value;
            this._sync_prefs();
        },

        _sync_prefs: function() {
            GM_setValue("prefs", JSON.stringify(this.prefs));
        },

        request_prefs: function() {
            var tmp = GM_getValue("prefs");
            if(!tmp) {
                tmp = "{}";
            }

            this.prefs = JSON.parse(tmp);
            bpm_backendsupport.setup_prefs(this.prefs, sr_name2id);
            this._sync_prefs();

            bpm_prefs.got_prefs(this.prefs);
            bpm_prefs.got_custom_emotes({}); // No support
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

/*
 * Preferences interface.
 */
var bpm_prefs = {
    /*
     * Preferences object and caches:
     *    - prefs: actual preferences object
     *    - custom_emotes: map of extracted custom CSS emotes
     *    - sr_array: array of enabled subreddits. sr_array[sr_id] === enabled
     */
    prefs: null,
    custom_emotes: null,
    sr_array: null,
    waiting: [],
    sync_timeouts: {},

    _ready: function() {
        return (this.prefs && this.custom_emotes);
    },

    _run_callbacks: function() {
        for(var i = 0; i < this.waiting.length; i++) {
            this.waiting[i](this);
        }
    },

    /*
     * Runs the given callback when preferences are available, possibly
     * immediately.
     */
    when_available: function(callback) {
        if(this._ready()) {
            callback(this);
        } else {
            this.waiting.push(callback);
        }
    },

    /*
     * Called from browser code when preferences have been received.
     */
    got_prefs: function(prefs) {
        this.prefs = prefs;
        this._make_sr_array();
        this.de_map = this._make_emote_map(prefs.disabledEmotes);
        this.we_map = this._make_emote_map(prefs.whitelistedEmotes);

        if(this._ready()) {
            this._run_callbacks();
        }
    },

    /*
     * Called from browser code when the custom CSS emote list has been
     * received.
     */
    got_custom_emotes: function(emotes) {
        this.custom_emotes = emotes;

        if(this._ready()) {
            this._run_callbacks();
        }
    },

    _make_sr_array: function() {
        this.sr_array = [];
        for(var id in sr_id2name) {
            this.sr_array[id] = this.prefs.enabledSubreddits2[sr_id2name[id]];
        }
        if(this.sr_array.indexOf(undefined) > -1) {
            // Holes in the array mean holes in sr_id2name, which can't possibly
            // happen. If it does, though, any associated emotes will be hidden.
            //
            // Also bad would be items in prefs not in sr_id2name, but that's
            // more or less impossible to handle.
            bpm_log("BPM: ERROR: sr_array has holes; installation or prefs are broken!");
        }
    },

    _make_emote_map: function(list) {
        var map = {};
        for(var i = 0; i < list.length; i++) {
            map[list[i]] = 1;
        }
        return map;
    },

    /*
     * Sync the given preference key. This may be called rapidly, as it will
     * enforce a small delay between the last sync_key() invocation and any
     * actual browser call is made.
     */
    sync_key: function(key) {
        // Schedule pref write for one second in the future, clearing out any
        // previous timeout. Prevents excessive backend calls, which can generate
        // some lag (on Firefox, at least).
        if(this.sync_timeouts[key] !== undefined) {
            clearTimeout(this.sync_timeouts[key]);
        }

        this.sync_timeouts[key] = setTimeout(bpm_utils.catch_errors(function() {
            bpm_browser.set_pref(key, this.prefs[key]);
            delete this.sync_timeouts[key];
        }.bind(this)), 1000);
    }
};

/*
 * Core Reddit emote converter code.
 */
var bpm_converter = {
    /*
     * Process the given list of elements (assumed to be <a> tags), converting
     * any that are emotes.
     */
    process: function(prefs, elements) {
        next_emote:
        for(var i = 0; i < elements.length; i++) {
            var element = elements[i];
            if(element.classList.contains("bpm-emote") || element.classList.contains("bpm-unknown")) {
                continue;
            }

            // There is an important distinction between element.href and
            // element.getAttribute("href")- the former is mangled by the
            // browser to be a complete URL, which we don't want.
            var href = element.getAttribute("href");
            if(href && href[0] === "/") {
                // Don't normalize case for emote lookup
                var parts = href.split("-");
                var emote_name = parts[0];
                var emote_info = bpm_data.lookup_emote(emote_name, prefs.custom_emotes);

                if(emote_info) {
                    var sr_enabled = (emote_info.source_id ? prefs.sr_array[emote_info.source_id] : true);
                    var emote_size = emote_info.max_size || 0;

                    // Click blocker CSS/JS
                    element.classList.add("bpm-emote");
                    // Used in alt-text. (Note: dashes are invalid here)
                    element.dataset.bpm_state = "e";
                    element.dataset.bpm_emotename = emote_name;
                    element.dataset.bpm_srname = emote_info.source_name;

                    if(!prefs.we_map[emote_name]) {
                        var nsfw_class = prefs.prefs.hideDisabledEmotes ? "bpm-hidden" : "bpm-nsfw";
                        var disabled_class = prefs.prefs.hideDisabledEmotes ? "bpm-hidden" : "bpm-disabled";
                        // Ordering matters a bit here- placeholders for NSFW emotes
                        // come before disabled emotes.
                        if(emote_info.is_nsfw) {
                            element.dataset.bpm_state += "n";
                            if(!prefs.prefs.enableNSFW) {
                                element.classList.add(nsfw_class);
                                element.dataset.bpm_state += "d";
                                if(!element.textContent) {
                                    // Any existing text (there really shouldn't be any)
                                    // will look funny with our custom CSS, but there's
                                    // not much we can do.
                                    element.textContent = emote_name;
                                }
                                continue;
                            }
                        }

                        if(!sr_enabled || prefs.de_map[emote_name]) {
                            element.classList.add(disabled_class);
                            element.dataset.bpm_state += "d";
                            if(!element.textContent) {
                                element.textContent = emote_name;
                            }
                            continue;
                        }

                        if(prefs.prefs.maxEmoteSize && emote_size > prefs.prefs.maxEmoteSize) {
                            element.classList(disabled_class);
                            element.dataset.bpm_state += "d";
                            if(!element.textContent) {
                                element.textContent = emote_name;
                            }
                            continue;
                        }
                    }

                    element.classList.add(emote_info.css_class);

                    // Apply flags in turn. We pick on the naming a bit to prevent
                    // spaces and such from slipping in.
                    for(var p = 1; p < parts.length; p++) {
                        // Normalize case
                        var flag = parts[p].toLowerCase();
                        if(/^[\w:!#\/]+$/.test(flag)) {
                            element.classList.add("bpflag-" + bpm_utils.sanitize(flag));
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
                    if(element.textContent || !(/^\/[\w\-:!]+$/).test(emote_name) || element.clientWidth) {
                        continue;
                    }

                    var pseudos = [null, ":after", ":before"];
                    for(var pi = 0; pi < pseudos.length; pi++) {
                        var bg_image = window.getComputedStyle(element, pseudos[pi]).backgroundImage;
                        // "" in Opera, "none" in Firefox/Chrome.
                        if(bg_image && bg_image !== "none") {
                            continue next_emote;
                        }
                    }

                    // Unknown emote? Good enough
                    element.dataset.bpm_state = "u";
                    element.dataset.bpm_emotename = emote_name;
                    element.classList.add("bpm-unknown");
                    if(!element.textContent) {
                        element.textContent = emote_name;
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

    /*
     * Converts alt-text on a list of <a> elements as appropriate.
     */
    // NOTE/FIXME: Alt-text isn't really related to emote conversion as-is, but
    // since it runs on a per-emote basis, it kinda goes here anyway.
    display_alt_text: function(elements) {
        for(var i = 0; i < elements.length; i++) {
            var element = elements[i];
            var state;
            try {
                state = element.dataset.bpm_state || "";
            } catch(e) {
                // .dataset reads fail on Firefox if the attribute doesn't exist
                state = "";
            }

            // Already processed- ignore, so we don't do annoying things like
            // expanding the emote sourceinfo.
            if(state.indexOf("a") > -1) {
                continue;
            }

            // Can't rely on .bpm-emote and data-emote to exist for spoiler
            // links, as many of them aren't known.
            var href = element.getAttribute("href");
            if(href && this.spoiler_links.indexOf(href.split("-")[0]) > -1) {
                continue;
            }

            var processed = false;
            var type_inline = false;
            if(state.indexOf("d") > -1) {
                type_inline = true;
            }

            if(element.title) {
                processed = true;

                // Work around due to RES putting tag links in the middle of
                // posts. (Fucking brilliant!)
                if(element.classList.contains("userTagLink") ||
                   element.classList.contains("voteWeight")) {
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
                if(element.classList.contains("bpflag-in") || element.classList.contains("bpflag-inp")) {
                    type_inline = true;
                }

                if(type_inline) {
                    at_element = document.createElement("span");
                } else {
                    at_element = document.createElement("div");
                }

                at_element.classList.add("bpm-alttext");
                at_element.textContent = element.title;

                // Try to move to the other side of RES's image expand buttons,
                // because otherwise they end awfully
                var before = element.nextSibling;
                while((before && before.className !== undefined) &&
                      before.classList.contains("expando-button")) {
                    before = before.nextSibling;
                }

                if(before && before.classList && before.classList.contains("bpm-alttext")) {
                    // Already processed (before node is our previous alt text)
                    continue;
                }
                element.parentNode.insertBefore(at_element, before);
            }

            // If it's an emote, replace the actual alt-text with source info
            var emote_name, title;
            if(state.indexOf("e") > -1) {
                processed = true;
                emote_name = element.dataset.bpm_emotename;
                var sr_name = element.dataset.bpm_srname;
                title = "";
                if(state.indexOf("d") > -1) {
                    title = "Disabled ";
                    if(state.indexOf("n") > -1) {
                        title += "NSFW ";
                    }
                    title += "emote ";
                }
                title += emote_name + " from " + sr_name;
                element.title = title;
            } else if(state.indexOf("u") > -1) {
                processed = true;
                emote_name = element.dataset.bpm_emotename;
                title = "Unknown emote " + emote_name;
                element.title = title;
            }

            if(processed) {
                // Mark as such.
                element.dataset.bpm_state = state + "a";
            }
        }
    },

    /*
     * Processes emotes and alt-text on a list of .md elements.
     */
    process_posts: function(prefs, posts) {
        for(var i = 0; i < posts.length; i++) {
            this.process_rooted_post(prefs, posts[i], posts[i]);
        }
    },

    /*
     * Processes emotes and alt-text under an element, given the containing .md.
     */
    process_rooted_post: function(prefs, post, md) {
        var links = post.getElementsByTagName("a");
        // NOTE: must run alt-text AFTER emote code, always. See note in
        // display_alt_text
        var out_of_sub = this.process(prefs, links);
        if(prefs.prefs.showAltText) {
            this.display_alt_text(links);
        }
    },

    hook_usertext_edit: function(prefs, usertext_edits) {
        if(!prefs.prefs.warnCourtesy) {
            return;
        }

        for(var i = 0; i < usertext_edits.length; i++) {
            var edit = usertext_edits[i];
            var textarea = edit.getElementsByTagName("textarea")[0];
            var bottom_area = edit.getElementsByClassName("bottom-area")[0];

            this._attach_to_usertext(prefs, textarea, bottom_area);
        }
    },

    _attach_to_usertext: function(prefs, textarea, bottom_area) {
        var timeout = null;
        function warn_now() {
            bpm_redditutil.enable_warning(bottom_area, "OUTOFSUB",
                "remember not everyone can see your emotes! please be considerate");
        }
        var ok = true;
        textarea.addEventListener("input", bpm_utils.catch_errors(function(event) {
            var text = textarea.value;
            text = text.replace(/ *>.*?\n/, ""); // Strip quotes
            //         [text]    (  /<emotename>         "<alt-text>")
            var re = /\[.*?\]\s*\((\/[\w:!#\/\-]+)\s*(?:["']([^"]*)["'])?\s*\)/g;
            var match;
            ok = true; // innocent until proven guilty
            var has_extern = false;
            var has_local = false;
            while(match = re.exec(text)) {
                var emote_name = match[1].split("-")[0];
                var emote_info = bpm_data.lookup_emote(emote_name, prefs.custom_emotes);
                // Nothing we recognize.
                if(emote_info === null) {
                    continue;
                }

                var from_here = false;
                for(var si = 0; si < emote_info.sources.length; si++) {
                    from_here = sr_id2name[emote_info.sources[si]] === "r/" + bpm_utils.current_subreddit;
                    if(from_here) {
                        break; // It's from at *least* this subreddit
                    }
                }
                if(from_here) {
                    has_local = true;
                } else {
                    has_extern = true;
                    if(match[2]) {
                        ok = false;
                    }
                }
            }

            if(!text.replace(re, "").trim()) {
                // Emote-only post. Only complain if there's actually something
                // here.
                if(has_extern && !has_local) {
                    ok = false;
                }
            }

            if(timeout !== null) {
                clearTimeout(timeout);
            }

            if(!ok) {
                // Set notification to go off in two seconds.
                timeout = setTimeout(bpm_utils.catch_errors(function() {
                    timeout = null;
                    warn_now();
                }.bind(this)), 2000);
            } else {
                bpm_redditutil.disable_warning(bottom_area, "OUTOFSUB");
            }
        }.bind(this)), false);

        textarea.addEventListener("blur", bpm_utils.catch_errors(function(event) {
            // If the editor loses focus, notify immediately. This is sort of
            // mean to catch people who are quickly tabbing to the save button,
            // but if they hit it fast enough our warning will be hidden anyway.
            if(!ok) {
                if(timeout !== null) {
                    clearTimeout(timeout);
                }
                warn_now();
            }
        }.bind(this)), false);
    }
};

/*
 * Emote search, the search box, and all support code.
 */
var bpm_search = {
    // Search box elements
    container: null,
    dragbox: null,
    search: null,
    count: null,
    close: null,
    results: null,
    resize: null,
    global_icon: null, // Global << thing
    firstrun: false, // Whether or not we've made any search at all yet

    /*
     * Sets up the search box for use on a page, either Reddit or the top-level
     * frame, globally.
     */
    init: function(prefs) {
        this.inject_html();
        this.init_search_box(prefs);
    },

    /*
     * Sets up search for use in a frame. No search box is generated, but it
     * listens for postMessage() calls from the parent frame.
     */
    init_frame: function(prefs) {
        window.addEventListener("message", bpm_utils.catch_errors(function(event) {
            // Not worried about event source (it might be null in Firefox, as
            // a note). Both of these methods are quite harmless, so it's
            // probably ok to let them be publically abusable.
            //
            // I'm not sure how else we can do it, anyway- possibly by going
            // through the backend, but not in userscripts. (Maybe we can abuse
            // GM_setValue().)
            var message = event.data;
            switch(message.__betterponymotes_method) {
                case "__bpm_inject_emote":
                    // Call toString() just in case
                    this.insert_emote(message.__betterponymotes_emote.toString());
                    break;

                case "__bpm_track_form":
                    this.grab_target_form();
                    break;

                // If it's not our message, it'll be undefined. (We don't care.)
            }
        }.bind(this)), false);
    },

    /*
     * Builds and injects the search box HTML.
     */
    inject_html: function() {
        // Placeholder div to create HTML in
        var div = document.createElement("div");
        // I'd sort of prefer display:none, but then I'd have to override it
        div.style.visibility = "hidden";
        div.id = "bpm-stuff"; // Just so it's easier to find in an elements list

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
            '        <p>Searching for <code>"+tag"</code> will show you emotes with the given tag. <code>"-tag"</code> shows emotes without it.',
            '        <p>Some emotes are hidden by default. Use <code>"+nonpony"</code> to see them.',
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

    /*
     * Sets up the emote search box.
     */
    init_search_box: function(prefs) {
        /*
         * Intercept mouseover for the entire search widget, so we can remember
         * which form was being used before.
         */
        this.container.addEventListener("mouseover", bpm_utils.catch_errors(function(event) {
            this.grab_target_form();
        }.bind(this)), false);

        // Close it on demand
        this.close.addEventListener("click", bpm_utils.catch_errors(function(event) {
            this.hide();
        }.bind(this)), false);

        // Another way to close it
        this.container.addEventListener("keyup", bpm_utils.catch_errors(function(event) {
            if(event.keyCode === 27) { // Escape key
                this.hide();
            }
        }.bind(this)), false);

        // Listen for keypresses and adjust search results. Delay 500ms after
        // end of typing to make it more responsive.
        var timeout = null;
        this.search.addEventListener("input", bpm_utils.catch_errors(function(event) {
            if(timeout !== null) {
                clearTimeout(timeout);
            }
            timeout = setTimeout(bpm_utils.catch_errors(function() {
                // Re-enable searching as early as we can, just in case
                timeout = null;
                this.update_search(prefs);
            }.bind(this)), 500);
        }.bind(this)), false);

        // Listen for clicks
        this.results.addEventListener("click", bpm_utils.catch_errors(function(event) {
            if(event.target.classList.contains("bpm-result")) {
                // .dataset would probably be nicer, but just in case...
                var emote_name = event.target.getAttribute("data-emote");
                this.insert_emote(emote_name);
            }
        }.bind(this)), false);

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
    },

    /*
     * Displays the search box.
     */
    show: function(prefs) {
        this.container.style.visibility = "visible";
        this.search.focus();

        // If we haven't run before, go search for things
        if(!this.firstrun) {
            this.firstrun = true;
            this.search.value = prefs.prefs.lastSearchQuery;
            this.update_search(prefs);
        }
    },

    hide: function() {
        this.container.style.visibility = "hidden";
        // TODO: possibly clear out the search results, since it's a large pile
        // of HTML.
    },

    /*
     * Previously focused elements. Only one of these can be non-null.
     */
    target_form: null,
    target_frame: null,

    /*
     * Caches the currently focused element, if it's something we can inject
     * emotes into.
     */
    grab_target_form: function() {
        var active = document.activeElement;

        while(active.tagName === "IFRAME") {
            // Focus is within the frame. Find the real element (recursing just
            // in case).
            if(active.contentWindow === null || active.contentWindow === undefined) {
                // Chrome is broken and does not permit us to access these
                // from content scripts.
                this.target_form = null;
                this.target_frame = active;

                bpm_utils.message_iframe(active, {
                    "__betterponymotes_method": "__bpm_track_form"
                });
                return;
            }

            try {
                active = active.contentDocument.activeElement;
            } catch(e) {
                // Addon SDK is broken
                bpm_utils.message_iframe(active, {
                    "__betterponymotes_method": "__bpm_track_form"
                });

                this.target_form = null;
                this.target_frame = active;
                return;
            }
        }

        // Ignore our own stuff and things that are not text boxes
        if(!bpm_utils.id_above(active, "bpm-search-box") && active !== this.target_form &&
           active.selectionStart !== undefined && active.selectionEnd !== undefined) {
            this.target_form = active;
            this.target_frame = null;
        }
    },

    /*
     * Parses a search query. Returns an object that looks like this:
     *    .sr_terms: list of subreddit names to match.
     *    .tag_term_sets: list of [true or false, ...] tag sets to match.
     *    .name_terms: list of emote name terms to match.
     * or null, if there was no query.
     */
    parse_query: function(terms) {
        var query = {sr_terms: [], tag_term_sets: [], name_terms: []};

        function add_tag_term(positive, tags) {
            // Negate previous tags, searching from the right, back to the left.
            for(var i = query.tag_term_sets.length - 1; i >= 0; i--) {
                var set = query.tag_term_sets[i];
                if(set[0] !== positive) {
                    // Opposite kinds of tags. Counter them where we can.
                    for(var j = tags.length - 1; j >= 0; j--) {
                        var index = set.indexOf(tags[j]);
                        if(index > -1) {
                            // When a tag and an antitag collide...
                            set.splice(index, 1);
                            tags.splice(j, 1);
                            // It makes a great big mess of my search code is what
                        }
                    }
                    // Need to keep empty sets so our -nonpony hack works
                    //if(set.length <= 1) {
                    //    query.tag_term_sets.splice(i, 1);
                    //}
                }
            }
            if(tags.length) {
                tags.unshift(positive);
                query.tag_term_sets.push(tags);
            }
        }

        for(var t = 0; t < terms.length; t++) {
            var term = terms[t];

            if(term.slice(0, 3) === "sr:") {
                query.sr_terms.push(term.slice(3));
            } else if(term[0] === "+" || term[0] === "-") {
                var lone_tag = term.slice(1);
                var p_tag = "+" + lone_tag;
                var positive = (term[0] === "+" ? true : false);
                var id = tag_name2id[p_tag];
                if(id) {
                    // Exact match
                    add_tag_term(positive, [id]);
                } else {
                    var matches = [];
                    // Find any tag that looks right
                    for(var tag in tag_name2id) {
                        id = tag_name2id[tag];
                        // Cut off leading +
                        if(tag.slice(1).indexOf(lone_tag) > -1 &&
                           matches.indexOf(id) < 0) {
                            matches.push(id);
                        }
                    }
                    if(matches.length) {
                        add_tag_term(positive, matches);
                    }
                }
            } else {
                query.name_terms.push(term);
            }
        }

        if(query.sr_terms.length || query.tag_term_sets.length || query.name_terms.length) {
            return query;
        } else {
            return null;
        }
    },

    /*
     * Updates the search results window according to the current query.
     */
    update_search: function(prefs) {
        // Split search query on spaces, remove empty strings, and lowercase terms
        var terms = this.search.value.split(" ").map(function(v) { return v.toLowerCase(); });
        terms = terms.filter(function(v) { return v; });
        prefs.prefs.lastSearchQuery = terms.join(" ");
        bpm_prefs.sync_key("lastSearchQuery");

        // Check this before we append the default search terms.
        if(!terms.length) {
            this.results.innerHTML = "";
            this.count.textContent = "";
            return;
        }

        // This doesn't work quite perfectly- searching for "+hidden" should
        // theoretically just show all hidden emotes, but it just ends up
        // cancelling into "-nonpony", searching for everything.
        terms.unshift("-hidden", "-nonpony");
        var query = this.parse_query(terms);
        // Still nothing to do
        if(query === null) {
            this.results.innerHTML = "";
            this.count.textContent = "";
            return;
        }

        var results = [];
        var hidden = 0; // Defined up here for our -nonpony hack
        no_match:
        for(var emote_name in emote_map) {
            var emote_info = bpm_data.lookup_core_emote(emote_name);
            var lc_emote_name = emote_name.toLowerCase();

            // Match if ALL search terms match
            for(var nt_i = 0; nt_i < query.name_terms.length; nt_i++) {
                if(lc_emote_name.indexOf(query.name_terms[nt_i]) < 0) {
                    continue no_match; // outer loop, not inner
                }
            }

            // Match if AT LEAST ONE subreddit terms match
            if(query.sr_terms.length) {
                // Generally this name is already lowercase, though not for bpmextras
                var source_sr_name = emote_info.source_name.toLowerCase();
                var is_match = false;
                for(var sr_i = 0; sr_i < query.sr_terms.length; sr_i++) {
                    if(source_sr_name.indexOf(query.sr_terms[sr_i]) > -1) {
                        is_match = true;
                        break;
                    }
                }
                if(!is_match) {
                    continue no_match;
                }
            }

            // Match if ALL tag sets match
            for(var tt_i = query.tag_term_sets.length - 1; tt_i >= 0; tt_i--) {
                // Match if AT LEAST ONE of these match
                var tag_set = query.tag_term_sets[tt_i];
                // Hack because we leave empty sets in
                if(tag_set.length <= 1) {
                    continue;
                }

                var any = false;
                for(var ts_i = 1; ts_i < tag_set.length; ts_i++) {
                    if(emote_info.tags.indexOf(tag_set[ts_i]) > -1) {
                        any = true;
                        break;
                    }
                }
                // We either didn't match, and wanted to, or matched and didn't
                // want to.
                if(any !== tag_set[0]) {
                    // HACK: This is the index of -nonpony. Any matches on this
                    // one means we blocked something by default, so make a note
                    // of it so the user knows.
                    if(tt_i === 1) {
                        hidden++;
                    }
                    continue no_match;
                }
            }

            // At this point we have a match, so follow back to its base
            if(emote_name !== emote_info.base) {
                // Hunt down the non-variant version
                emote_info = bpm_data.lookup_core_emote(emote_info.base);
                if(emote_info.name !== emote_info.base) {
                    bpm_log("ERROR: Followed +v from " + emote_name + " to " + emote_info.name + "; no root emote found");
                }
                emote_name = emote_info.name;
            }

            results.push(emote_info);
        }

        results.sort(function(a, b) {
            if(a.name < b.name) {
                return -1;
            } else if(a.name > b.name) {
                return 1;
            } else {
                return 0;
            }
        });

        // We go through all of the results regardless of search limit (as that
        // doesn't take very long), but stop building HTML when we reach enough
        // shown emotes.
        //
        // As a result, NSFW/disabled emotes don't count toward the result.
        var html = "";
        var shown = 0;
        var prev = null;
        var actual_results = results.length;
        for(var i = 0; i < results.length; i++) {
            var result = results[i];
            if(prev === result.name) {
                actual_results--;
                continue; // Duplicates can appear when following +v emotes
            }
            prev = result.name;

            // if((blacklisted) && !whitelisted)
            if((!prefs.sr_array[result.source_id] || (result.is_nsfw && !prefs.prefs.enableNSFW) ||
                prefs.de_map[result.name] ||
                (prefs.prefs.maxEmoteSize &&  result.max_size > prefs.prefs.maxEmoteSize)) &&
               !prefs.we_map[result.name]) {
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

            // Use <span> so there's no chance of emote parse code finding
            // this.
            html += "<span data-emote=\"" + result.name + "\" class=\"bpm-result " +
                    result.css_class + "\" title=\"" + result.name + " from " + result.source_name + "\"></span>";
        }

        this.results.innerHTML = html;

        var hit_limit = shown + hidden < actual_results;
        // Format text: "X results (out of N, Y hidden)"
        var text = shown + " results";
        if(hit_limit || hidden) { text += " ("; }
        if(hit_limit)           { text += "out of " + actual_results; }
        if(hit_limit && hidden) { text += ", "; }
        if(hidden)              { text += hidden + " hidden"; }
        if(hit_limit || hidden) { text += ")"; }
        this.count.textContent = text;
    },

    /*
     * Injects an emote into the (previously) focused element.
     */
    insert_emote: function(emote_name) {
        if(this.target_frame !== null) {
            bpm_utils.message_iframe(this.target_frame, {
                "__betterponymotes_method": "__bpm_inject_emote",
                "__betterponymotes_emote": emote_name
            });

            return;
        } else if(this.target_form === null) {
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

    /*
     * Injects the "emotes" button onto Reddit.
     */
    inject_search_button: function(prefs, usertext_edits) {
        for(var i = 0; i < usertext_edits.length; i++) {
            var existing = usertext_edits[i].getElementsByClassName("bpm-search-toggle");
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
                button.classList.add("bpm-search-toggle");
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
                var help_toggle = usertext_edits[i].getElementsByClassName("help-toggle");
                help_toggle[0].appendChild(button);
            }
        }
    },

    /*
     * Sets up one particular "emotes" button.
     */
    wire_emotes_button: function(prefs, button) {
        button.addEventListener("mouseover", bpm_utils.catch_errors(function(event) {
            this.grab_target_form();
        }.bind(this)), false);

        button.addEventListener("click", bpm_utils.catch_errors(function(event) {
            var sb_element = document.getElementById("bpm-search-box");
            if(sb_element.style.visibility !== "visible") {
                this.show(prefs);
            } else {
                this.hide();
            }
        }.bind(this)), false);
    },

    /*
     * Sets up the global ">>" emotes icon.
     */
    setup_global_icon: function(prefs) {
        this.global_icon.addEventListener("mouseover", bpm_utils.catch_errors(function(event) {
            this.grab_target_form();
        }.bind(this)), false);

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

        this.global_icon.style.visibility = "visible";

        this.global_icon.addEventListener("click", bpm_utils.catch_errors(function(event) {
            // Don't open at the end of a drag (only works if you release the
            // mouse button before the ctrl/meta key though...)
            if(!event.ctrlKey && !event.metaKey) {
                this.show(prefs);
            }
        }.bind(this)), false);
    }
};

/*
 * Global emote conversion.
 */
var bpm_global = {
    // As a note, this regexp is a little forgiving in some respects and strict in
    // others. It will not permit text in the [] portion, but alt-text quotes don't
    // have to match each other.
    //
    //                   <   emote      >   <    alt-text     >
    emote_regexp: /\[\]\((\/[\w:!#\/\-]+)\s*(?:["']([^"]*)["'])?\)/g,

    /*
     * Searches elements recursively for [](/emotes), and converts them.
     */
    process: function(prefs, root) {
        // List of nodes to delete. Would probably not work well to remove nodes
        // while walking the DOM
        var deletion_list = [];

        // this!==window on Opera, and doesn't have this object for some reason
        bpm_utils.walk_dom(root, _bpm_global("Node").TEXT_NODE, function(node) {
            var parent = node.parentNode;
            // <span> elements to apply alt-text to
            var emote_elements = [];
            this.emote_regexp.lastIndex = 0;

            var new_elements = [];
            var end_of_prev = 0; // End index of previous emote match
            var match;

            while(match = this.emote_regexp.exec(node.data)) {
                // Don't normalize case for emote lookup
                var parts = match[1].split("-");
                var emote_name = parts[0];
                var emote_info = bpm_data.lookup_emote(emote_name, prefs.custom_emotes);

                if(emote_info === null) {
                    continue;
                }
                var sr_enabled = (emote_info.source_id !== null ? prefs.sr_array[emote_info.source_id] : true);
                var emote_size = emote_info.max_size || 0;

                // Check that it hasn't been disabled somehow
                if(!prefs.we_map[emote_name] &&
                    (!sr_enabled || prefs.de_map[emote_name] ||
                     (emote_info.is_nsfw && !prefs.prefs.enableNSFW) ||
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
                element.classList.add("bpflag-in");
                element.classList.add("bpm-emote");
                element.classList.add(emote_info.css_class);
                // Some things for alt-text. The .href is a bit of a lie,
                // but necessary to keep spoiler emotes reasonably sane.
                element.setAttribute("href", emote_name);
                element.dataset.bpm_state = "e";
                element.dataset.bpm_emotename = emote_name;
                element.dataset.bpm_srname = emote_info.source_name;
                new_elements.push(element);
                emote_elements.push(element);

                // Don't need to do validation on flags, since our matching
                // regexp is strict enough to begin with (although it will
                // match ":", something we don't permit elsewhere).
                for(var p = 1; p < parts.length; p++) {
                    var flag = parts[p].toLowerCase();
                    element.classList.add("bpflag-" + bpm_utils.sanitize(flag));
                }

                if(match[2]) {
                    // Alt-text. (Quotes aren't captured by the regexp)
                    element.title = match[2];
                }

                // Next text element will start after this emote
                end_of_prev = match.index + match[0].length;
            }

            // If length == 0, then there were no emote matches to begin with,
            // and we should just leave it alone
            if(new_elements.length) {
                // Keep track of how the size of the container changes. Also,
                // don't even dream of doing this for every node.
                var scroll_parent = bpm_utils.locate_matching_ancestor(parent, function(element) {
                    var style = window.getComputedStyle(element);
                    if(style && (style.overflowY === "auto" || style.overflowY === "scroll")) {
                        return true;
                    } else {
                        return false;
                    }
                });

                var scroll_top, scroll_height, at_bottom;
                if(scroll_parent) {
                    scroll_top = scroll_parent.scrollTop;
                    scroll_height = scroll_parent.scrollHeight;
                    // visible height + amount hidden > total height
                    // + 1 just for a bit of safety
                    at_bottom = (scroll_parent.clientHeight + scroll_top + 1 >= scroll_height);
                }

                // There were emotes, so grab the last bit of text at the end
                var end_text = node.data.slice(end_of_prev);
                if(end_text) {
                    new_elements.push(document.createTextNode(end_text));
                }

                // Insert all our new nodes
                for(var i = 0; i < new_elements.length; i++) {
                    parent.insertBefore(new_elements[i], node);
                }

                // Remove original text node
                deletion_list.push(node);

                // Convert alt text and such. We want to do this after we insert
                // our new nodes (so that the alt-text element goes to the right
                // place) but before we rescroll.
                if(prefs.prefs.showAltText) {
                    bpm_converter.display_alt_text(emote_elements);
                }

                // If the parent element has gotten higher due to our emotes,
                // and it was at the bottom before, scroll it down by the delta.
                if(scroll_parent && at_bottom && scroll_top && scroll_parent.scrollHeight > scroll_height) {
                    var delta = scroll_parent.scrollHeight - scroll_height;
                    scroll_parent.scrollTop = scroll_parent.scrollTop + delta;
                }
            }
        }.bind(this));

        for(var i = 0; i < deletion_list.length; i++) {
            var node = deletion_list[i];
            node.parentNode.removeChild(node);
        }
    },

    /*
     * Main function when running globally.
     */
    run: function(prefs) {
        if(!prefs.prefs.enableGlobalEmotes) {
            return;
        }

        // We run this here, instead of down in the main bit, to avoid applying large
        // chunks of CSS when this script is disabled.
        bpm_core.init_css();

        if(prefs.prefs.enableGlobalSearch) {
            // Never inject the search box into frames. Too many sites fuck up
            // entirely if we do. Instead, we do some cross-frame communication.
            if(bpm_utils.is_frame) {
                bpm_search.init_frame(prefs);
            } else {
                bpm_search.init(prefs);
                bpm_search.setup_global_icon(prefs);
            }
        }

        this.process(prefs, document.body);

        bpm_utils.observe_document(function(nodes) {
            for(var i = 0; i < nodes.length; i++) {
                if(nodes[i].nodeType !== _bpm_global("Node").ELEMENT_NODE) {
                    // Not really interested in other kinds.
                    continue;
                }
                this.process(prefs, nodes[i]);
            }
        }.bind(this));
    }
};

/*
 * main() and such.
 */
var bpm_core = {
    /*
     * Attaches all of our CSS.
     */
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

    /*
     * Main function when running on Reddit.
     */
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
        if(bpm_utils.platform === "firefox-ext") { // TODO: detect userscript on Firefox
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

        bpm_search.init(prefs);
        var usertext_edits = document.getElementsByClassName("usertext-edit");
        bpm_search.inject_search_button(prefs, usertext_edits);
        bpm_converter.hook_usertext_edit(prefs, usertext_edits);

        // Initial pass- show all emotes currently on the page.
        var posts = document.getElementsByClassName("md");
        bpm_converter.process_posts(prefs, posts);

        // Add emote click blocker
        document.body.addEventListener("click", bpm_utils.catch_errors(function(event) {
            if(event.target.classList.contains("bpm-emote")) {
                event.preventDefault();
            }
        }.bind(this)), false);

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
        bpm_utils.observe_document(function(nodes) {
            for(var i = 0; i < nodes.length; i++) {
                var root = nodes[i];
                if(root.nodeType !== _bpm_global("Node").ELEMENT_NODE) {
                    // Not really interested in other kinds.
                    continue;
                }

                var md;
                if(md = bpm_utils.class_above(root, "md")) {
                    // Inside of a formatted text block, take all the
                    // links we can find
                    bpm_converter.process_rooted_post(prefs, root, md);
                } else {
                    // Outside of formatted text, try to find some
                    // underneath us
                    var posts = root.getElementsByClassName("md");
                    bpm_converter.process_posts(prefs, posts);
                }

                // TODO: move up in case we're inside it?
                var usertext_edits = root.getElementsByClassName("usertext-edit");
                bpm_search.inject_search_button(prefs, usertext_edits);
                bpm_converter.hook_usertext_edit(prefs, usertext_edits);
            }
        }.bind(this));
    },

    /*
     * Manages communication with our options page on platforms that work this
     * way (userscripts).
     */
    setup_options_link: function() {
        function _check(prefs) {
            var tag = document.getElementById("ready");
            var ready = tag.textContent.trim();

            if(ready === "true") {
                window.postMessage({
                    "__betterponymotes_target": "__bpm_options_page",
                    "__betterponymotes_method": "__bpm_prefs",
                    "__betterponymotes_prefs": bpm_prefs.prefs
                }, BPM_RESOURCE_PREFIX);
                return true;
            } else {
                return false;
            }
        }

        // Impose a limit, in case something is broken.
        var checks = 0;
        function recheck(prefs) {
            if(checks < 10) {
                checks++;
                if(!_check(prefs)) {
                    window.setTimeout(bpm_utils.catch_errors(function() {
                        recheck();
                    }), 200);
                }
            } else {
                bpm_log("BPM: ERROR: options page is unavailable after 2 seconds. Assuming broken.");
                // TODO: put some kind of obvious error <div> on the page or
                // something
            }
        }

        // Listen for messages that interest us
        window.addEventListener("message", bpm_utils.catch_errors(function(event) {
            var message = event.data;
            // Verify source and intended target (we receive our own messages,
            // and don't want to get anything from rogue frames).
            if(event.origin !== BPM_RESOURCE_PREFIX || event.source !== window ||
               message.__betterponymotes_target !== "__bpm_extension") {
                return;
            }

            switch(message.__betterponymotes_method) {
                case "__bpm_set_pref":
                    var key = message.__betterponymotes_pref;
                    var value = message.__betterponymotes_value;

                    if(bpm_prefs.prefs[key]) {
                        bpm_prefs.prefs[key] = value;
                        bpm_prefs.sync_key(key);
                    } else {
                        bpm_log("BPM: ERROR: Invalid pref write from options page: '" + key + "'");
                    }
                    break;

                default:
                    bpm_log("BPM: ERROR: Unknown request from options page: '" + message.__betterponymotes_method + "'");
                    break;
            }
        }.bind(this)), false);

        bpm_utils.with_dom(function() {
            bpm_prefs.when_available(function(prefs) {
                // Wait for options.js to be ready (checking every 200ms), then
                // send it down.
                recheck();
            });
        });
    },

    /*
     * main()
     */
    main: function() {
        bpm_browser.request_prefs();
        bpm_browser.request_custom_css();

        if(document.location.href === BPM_OPTIONS_PAGE) {
            this.setup_options_link();
        }

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
