/*
 * Misc. utility functions.
 */
var bpm_utils = bpm_exports.utils = {
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
     * Copies all properties on one object to another.
     */
    copy_properties: function(to, from) {
        for(var key in from) {
            to[key] = from[key];
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
                bpm_error("Exception on line " + e.lineNumber + ": ", e.name + ": " + e.message);
                throw e;
            }
        };
    },

    /*
     * Wrapper for a one-shot event with callback list and setup function.
     * Returns a "with_X"-like function that accepts callbacks. Example usage:
     *
     * var with_n = trigger(function(ready) {
     *     ready(256);
     * });
     * with_n(function(n) {
     *     bpm_log(n);
     * });
     */
    trigger: function(setup) {
        var callbacks = [];
        var result;
        var triggered = false;
        var init = false;

        return {
            listen: function(callback) {
                if(!init) {
                    setup(this.trigger);
                    init = true;
                }

                if(!triggered) {
                    callbacks.push(callback);
                } else {
                    callback(result);
                }
            },

            trigger: function(r) {
                result = r;
                for(var i = 0; i < callbacks.length; i++) {
                    callbacks[i](r);
                }
                callbacks = [];
                triggered = true;
            }
        };
    }
};

/*
 * Log functions. You should use these in preference to console.log(), which
 * isn't always available.
 */
var _bpm_log;
if(bpm_utils.platform === "userscript") {
    _bpm_log = function() {
        GM_log(Array.prototype.slice.call(arguments).join(" "));
    };
} else {
    // Chrome's log() function is picky about its this parameter
    _bpm_log = console.log.bind(console);
}

var _BPM_DEBUG = 0;
var _BPM_INFO = 1;
var _BPM_WARNING = 2;
var _BPM_ERROR = 3;
var _BPM_LOG_LEVEL = BPM_DEV_MODE ? _BPM_DEBUG : _BPM_WARNING;

var _bpm_log_buffer = [];
function _bpm_make_logger(msg_prefix, level) {
    return function() {
        var args = Array.prototype.slice.call(arguments);
        args.unshift(msg_prefix);
        if(window.name) {
            args.unshift("[" + window.name + "]:");
        }
        _bpm_log_buffer.push(args.join(" ")); // TODO: Length limit?
        if(_BPM_LOG_LEVEL > level) {
            return;
        }
        args.unshift("BPM:");
        _bpm_log.apply(null, args);
    };
}

var bpm_debug   = _bpm_make_logger("DEBUG:", _BPM_DEBUG);     // Coding is hard
var bpm_info    = _bpm_make_logger("INFO:", _BPM_INFO);       // Something "interesting" happened
var bpm_warning = _bpm_make_logger("WARNING:", _BPM_WARNING); // Probably broken but carrying on anyway
var bpm_error   = _bpm_make_logger("ERROR:", _BPM_ERROR);     // We're screwed

bpm_debug("Platform:", bpm_utils.platform);

var bpm_logutil = bpm_exports.logutil = {
    /*
     * Injects a sneaky little link at the bottom of each Reddit page that
     * displays the logs.
     */
    inject_log_dumper: function() {
        var reddit_footer = bpm_dom.find_class(document.body, "footer-parent");

        // <div><pre>...</pre> <a>[dump bpm logs]</a></div>
        var container = document.createElement("div");
        container.className = "bottommenu";
        var output = document.createElement("pre");
        output.style.display = "none";
        output.style.textAlign = "left";
        output.style.borderStyle = "solid";
        output.style.width = "50%";
        output.style.margin = "auto auto auto auto";
        var link = document.createElement("a");
        link.href = "javascript:void(0)";
        link.textContent = "[dump bpm logs]";
        container.appendChild(link);
        container.appendChild(output);

        link.addEventListener("click", bpm_utils.catch_errors(function(event) {
            output.style.display = "block";
            var logs = _bpm_log_buffer.join("\n");
            output.textContent = logs;
        }.bind(this)), false);

        reddit_footer.appendChild(container);
    }
};

/*
 * DOM utility functions.
 */
var bpm_dom = bpm_exports.dom = {
    /*
     * A reference to the MutationObserver object. It's unprefixed on Firefox,
     * but not on Chrome. Safari presumably has this as well. Defined to be
     * null on platforms that don't support it.
     */
    // NOTE: As of right now, MutationObserver is badly broken on Chrome.
    // https://code.google.com/p/chromium/issues/detail?id=160985
    // Disabling it until they release a fix.
    MutationObserver: (_bpm_global("MutationObserver") || /*_bpm_global("WebKitMutationObserver") ||*/ _bpm_global("MozMutationObserver") || null),

    /*
     * Wrapper to monitor the DOM for inserted nodes, using either
     * MutationObserver or DOMNodeInserted, falling back for a broken MO object.
     */
    observe_document: function(callback) {
        if(bpm_dom.MutationObserver) {
            bpm_debug("Monitoring document with MutationObserver");
            var observer = new bpm_dom.MutationObserver(bpm_utils.catch_errors(function(mutations, observer) {
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
                bpm_warning("Can't use MutationObserver: L" + e.lineNumber + ": ", e.name + ": " + e.message + ")");
            }
        }

        bpm_debug("Monitoring document with DOMNodeInserted");
        document.body.addEventListener("DOMNodeInserted", bpm_utils.catch_errors(function(event) {
            callback([event.target]);
        }));
    },

    /*
     * Makes a nice <style> element out of the given CSS.
     */
    style_tag: function(css) {
        bpm_debug("Building <style> tag");
        var tag = document.createElement("style");
        tag.type = "text/css";
        tag.textContent = css;
        return tag;
    },

    /*
     * Makes a nice <link> element to the given URL (for CSS).
     */
    stylesheet_link: function(url) {
        bpm_debug("Building <link> tag to", url);
        var tag = document.createElement("link");
        tag.href = url;
        tag.rel = "stylesheet";
        tag.type = "text/css";
        return tag;
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
     * Helper function to make elements "draggable", i.e. clicking and dragging
     * them will move them around.
     */
    enable_drag: function(element, start_callback, callback) {
        var start_x, start_y;

        var on_mousemove = bpm_utils.catch_errors(function(event) {
            var dx = event.clientX - start_x;
            var dy = event.clientY - start_y;
            callback(event, dx, dy);
        });

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
     * Wrapper around enable_drag for the common case of moving elements.
     */
    make_movable: function(element, container, callback) {
        var start_x, start_y;

        bpm_dom.enable_drag(element, function(event) {
            start_x = parseInt(container.style.left, 10);
            start_y = parseInt(container.style.top, 10);
        }, function(event, dx, dy) {
            var left = Math.max(start_x + dx, 0);
            var top = Math.max(start_y + dy, 0);

            function move() {
                container.style.left = left + "px";
                container.style.top = top + "px";
            }

            if(callback) {
                callback(event, left, top, move);
            } else {
                move();
            }
        });
    },

    /*
     * Runs the given callback when the DOM is ready, i.e. when DOMContentLoaded
     * fires.
     */
    dom_ready: bpm_utils.trigger(function(ready) {
        if(document.readyState === "interactive" || document.readyState === "complete") {
            bpm_debug("Document already loaded");
            ready();
        } else {
            document.addEventListener("DOMContentLoaded", bpm_utils.catch_errors(function(event) {
                bpm_debug("Document loaded");
                ready();
            }), false);
        }
    }),

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
        bpm_debug("Sending", message, "to", frame);
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
            script.textContent = "(" + bpm_dom._msg_script.toString() + ")('" + id + "', " + JSON.stringify(message) + ");";
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
    walk_dom: function(root, node_filter, process, end, node, depth) {
        if(!node) {
            if(bpm_dom._tag_blacklist[root.tagName]) {
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
            if(!bpm_dom._tag_blacklist[node.tagName]) {
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
                    end();
                    return; // Done!
                }
            }
            node = node.nextSibling;
        }
        if(num) {
            // Ran out of nodes, or hit null somehow. I'm not sure how either
            // of these can happen, but oh well.
            end();
        } else {
            setTimeout(function() {
                bpm_dom.walk_dom(root, node_filter, process, end, node, depth);
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
            bpm_warning("Multiple elements under", root, "with class '" + class_name + "'");
            return elements[0];
        }
    }
};

/*
 * Misc utility functions to help make your way around Reddit's HTML.
 */
var bpm_redditutil = bpm_exports.redditutil = {
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
     * Shows an "error" message under an edit form, in the standard style.
     * Comparable to the "we need something here" message when you try to post
     * an empty comment.
     */
    enable_warning: function(bottom_area, class_name, message) {
        var element = bpm_dom.find_class(bottom_area, class_name);
        if(!element) {
            element = document.createElement("span");
            element.classList.add("error");
            element.classList.add(class_name);
            // Insert before the .usertext-buttons div
            var before = bpm_dom.find_class(bottom_area, "usertext-buttons");
            bottom_area.insertBefore(element, before);
        }
        element.style.display = "";
        element.textContent = message;
    },

    /*
     * Disables a previously-generated error message, if it exists.
     */
    disable_warning: function(bottom_area, class_name) {
        var element = bpm_dom.find_class(bottom_area, class_name);
        if(element) {
            element.parentNode.removeChild(element);
        }
    },

    _sidebar_cache: null,
    is_sidebar: function(md) {
        if(this._sidebar_cache) {
            return this._sidebar_cache === md;
        }
        var is = bpm_dom.class_above(md, "titlebox");
        if(is) {
            this._sidebar_cache = md;
        }
        return Boolean(is);
    }
};
