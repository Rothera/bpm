/*
 * Inspects the environment for global variables.
 *
 * On some platforms- particularly some userscript engines- the global this
 * object !== window, and the two may have significantly different properties.
 */
function find_global(name) {
    return _global_this[name] || window[name] || undefined;
}

// Try to fool AMO.
var ST = setTimeout;
var IHTML = "innerHTML";

/*
 * Log functions. You should use these in preference to console.log(), which
 * isn't always available.
 */
var _log_buffer = [];
_global_this.bpm_logs = _log_buffer; // For console access

var _LOG_DEBUG = 0;
var _LOG_INFO = 1;
var _LOG_WARNING = 2;
var _LOG_ERROR = 3;
var _LOG_LEVEL = DEV_MODE ? _LOG_DEBUG : _LOG_WARNING;

var _console = find_global("console");
var _gm_log = find_global("GM_log");
var _raw_log;

var CONTAINER_PADDING = 10;

if(_console && _console.log) {
    _raw_log = _console.log.bind(_console);
} else if(_gm_log) {
    _raw_log = function() {
        var args = Array.prototype.slice.call(arguments);
        var msg = args.join(" ");
        _gm_log(msg);
    };
} else {
    // ?!?
    _raw_log = function() {};
}

function _wrap_logger(cname, prefix, level) {
    var cfunc;
    if(_console && _console[cname]) {
        cfunc = _console[cname].bind(_console);
    } else {
        cfunc = _raw_log;
    }
    return function() {
        var args = Array.prototype.slice.call(arguments);
        args.unshift(prefix);
        if(window.name) {
            args.unshift("[" + window.name + "]:");
        }
        _log_buffer.push(args.join(" "));
        args.unshift("BPM:");
        if(_LOG_LEVEL <= level) {
            cfunc.apply(null, args);
        }
    };
}

var log_debug = _wrap_logger("log", "DEBUG:", _LOG_DEBUG);
var log_info = _wrap_logger("log", "INFO:", _LOG_INFO);
var log_warning = _wrap_logger("warn", "WARNING:", _LOG_WARNING);
var log_error = _wrap_logger("error", "ERROR:", _LOG_ERROR);
var log_trace = function() {};
if(_console && _console.trace) {
    log_trace = _console.trace.bind(_console);
}

/*
 * A string referring to the current platform BPM is running on. This is a
 * best guess, made by inspecting global variables, and needed because this
 * script runs unmodified on all supported platforms.
 */
var platform;
// FIXME: "self" is a standard object, though self.on is specific to
// Firefox content scripts. I'd prefer something a little more clearly
// affiliated, though.
if(self.on) {
    platform = "firefox-ext";
} else if(find_global("chrome") && chrome.extension) {
    platform = "chrome-ext";
} else if(find_global("safari") && window.name === "") {
    platform = "safari-ext";
} else {
    log_error("Unknown platform! Your installation is badly broken.");
    platform = "unknown";
    // may as well just die at this point; nothing will actually work
    // For some reason Safari doesn't behave properly when frames get involved.
    // I'll continue to investigate, but for now it will just have to keep
    // spitting out errors for each frame in the document.
}

log_debug("Platform:", platform);

/*
 * Wraps a function with an error-detecting variant. Useful for callbacks
 * and the like, since some browsers (Firefox...) have a way of swallowing
 * exceptions.
 */
function catch_errors(f) {
    return function() {
        try {
            return f.apply(this, arguments);
        } catch(e) {
            log_error("Exception on line " + e.lineNumber + ": ", e.name + ": " + e.message);
            if(e.trace) {
                log_error("Stack trace:");
                log_error(e.trace);
            } else {
                log_error("Current stack:");
                // This probably isn't very useful...
                log_trace();
            }
            throw e;
        }
    };
}

/*
 * Usage: with_dom(function() { ... code ... });
 */
var with_dom = (function() {
    var callbacks = [];
    var listening = false;
    var is_ready = function() {
        return (document.readyState === "interactive" || document.readyState === "complete");
    };
    var ready = is_ready();

    if(ready) {
        log_debug("Document loaded on startup");
    }

    var loaded = function(event) {
        log_debug("Document loaded");
        _checkpoint("dom");
        ready = true;

        for(var i = 0; i < callbacks.length; i++) {
            callbacks[i]();
        }

        callbacks = null; // unreference, just in case
    };

    var add = function(callback) {
        if(ready || is_ready()) {
            callback();
        } else {
            callbacks.push(callback);
            if(!listening) {
                listening = true;
                document.addEventListener("DOMContentLoaded", catch_errors(loaded), false);
            }
        }
    };

    return add;
})();

/*
 * A reference to the MutationObserver object. It's unprefixed on Firefox,
 * but not on Chrome. Safari presumably has this as well. Defined to be
 * null on platforms that don't support it.
 */
var MutationObserver = (find_global("MutationObserver") || find_global("WebKitMutationObserver") || find_global("MozMutationObserver") || null);

/*
 * MutationObserver wrapper.
 */
function observe_document(callback) {
    if(!MutationObserver) {
        // Crash and burn. No fallbacks due to not wanting to deal with AMO
        // right now.
        log_error("MutationObserver not found!");
        return;
    }

    var observer = new MutationObserver(catch_errors(function(mutations, observer) {
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
        log_warning("Can't use MutationObserver: L" + e.lineNumber + ": ", e.name + ": " + e.message + ")");
    }
}

var _tag_blacklist = {
    // Meta tags we should never touch
    "HEAD": 1, "TITLE": 1, "BASE": 1, "LINK": 1, "META": 1, "STYLE": 1, "SCRIPT": 1,
    // Things I'm worried about
    "IFRAME": 1, "OBJECT": 1, "CANVAS": 1, "SVG": 1, "MATH": 1, "TEXTAREA": 1
};

/*
 * Walks the DOM tree from the given root, running a callback on each node
 * where its nodeType === node_filter. Pass only three arguments.
 *
 * This is supposed to be much faster than TreeWalker, and also chunks its
 * work into batches of 1000, waiting 50ms in between in order to ensure
 * browser responsiveness no matter the size of the tree.
 */
function walk_dom(root, node_filter, process, end, node, depth) {
    if(!node) {
        if(_tag_blacklist[root.tagName]) {
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
        if(!_tag_blacklist[node.tagName]) {
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
        ST(catch_errors(function() {
            walk_dom(root, node_filter, process, end, node, depth);
        }), 50);
    }
}

/*
 * Helper function to make elements "draggable", i.e. clicking and dragging
 * them will move them around.
 *
 * N.b. have to do stupid things with event names due to AMO.
 */
function enable_drag(element, start_callback, callback) {
    var start_x, start_y;

    var on_mouse_move = catch_errors(function(event) {
        var dx = event.clientX - start_x;
        var dy = event.clientY - start_y;
        callback(event, dx, dy);
    });

    element.addEventListener("mousedown", catch_errors(function(event) {
        start_x = event.clientX;
        start_y = event.clientY;
        window.addEventListener("mouse" + "move", on_mouse_move, false);
        document.body.classList.add("bpm-noselect");
        start_callback(event);
    }), false);

    window.addEventListener("mouseup", catch_errors(function(event) {
        window.removeEventListener("mouse" + "move", on_mouse_move, false);
        document.body.classList.remove("bpm-noselect");
    }), false);
}

/*
 * Wrapper around enable_drag for the common case of moving elements.
 */
function make_movable(element, container, callback) {
    var start_x, start_y;

    enable_drag(element, function(event) {
        start_x = parseInt(container.style.left, 10);
        start_y = parseInt(container.style.top, 10);
    }, function(event, dx, dy) {
        var container_width = parseInt(container.style.width, 10) || 0;
        var container_height = parseInt(container.style.height, 10) || 0;

        var minX = CONTAINER_PADDING;
        var minY = CONTAINER_PADDING;

        var maxX = window.innerWidth - container_width - CONTAINER_PADDING;
        var maxY = window.innerHeight - container_height - CONTAINER_PADDING;

        var left = Math.max(Math.min(start_x + dx, maxX), minX);
        var top = Math.max(Math.min(start_y + dy, maxY), minY);

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
}

function keep_on_window(container) {
    var start_x = parseInt(container.style.left, 10);
    var start_y = parseInt(container.style.top, 10);

    var container_width = parseInt(container.style.width, 10);
    var container_height = parseInt(container.style.height, 10);

    var minX = CONTAINER_PADDING;
    var minY = CONTAINER_PADDING;

    var maxX = window.innerWidth - container_width - CONTAINER_PADDING;
    var maxY = window.innerHeight - container_height - CONTAINER_PADDING;

    var left = Math.max(Math.min(start_x, maxX), minX);
    var top = Math.max(Math.min(start_y, maxY), minY);

    container.style.left = left + "px";
    container.style.top = top + "px";
}

/*
 * Makes a nice <style> element out of the given CSS.
 */
function style_tag(css) {
    log_debug("Building <style> tag");
    var tag = document.createElement("style");
    tag.type = "text/css";
    tag.textContent = css;
    return tag;
}

/*
 * Makes a nice <link> element to the given URL (for CSS).
 */
function stylesheet_link(url) {
    log_debug("Building <link> tag to", url);
    var tag = document.createElement("link");
    tag.href = url;
    tag.rel = "stylesheet";
    tag.type = "text/css";
    return tag;
}

/*
 * Determines whether this element, or any ancestor, have the given id.
 */
function id_above(element, id) {
    while(true) {
        if(element.id === id) {
            return true;
        } else if(element.parentElement) {
            element = element.parentElement;
        } else {
            return false;
        }
    }
}

/*
 * Determines whether this element, or any ancestor, have the given class.
 */
function class_above(element, class_name) {
    while(true) {
        if(element.classList.contains(class_name)) {
            return element;
        } else if(element.parentElement) {
            element = element.parentElement;
        } else {
            return null;
        }
    }
}

/*
 * Locates an element at or above the given one matching a particular test.
 */
function locate_matching_ancestor(element, predicate, none) {
    while(true) {
        if(predicate(element)) {
            return element;
        } else if(element.parentElement) {
            element = element.parentElement;
        } else {
            return none;
        }
    }
}

/*
 * Locates an element with the given class name. Logs a warning message if
 * more than one element matches. Returns null if there wasn't one.
 */
function find_class(root, class_name) {
    var elements = root.getElementsByClassName(class_name);
    if(!elements.length) {
        return null;
    } else if(elements.length === 1) {
        return elements[0];
    } else {
        log_warning("Multiple elements under", root, "with class '" + class_name + "'");
        return elements[0];
    }
}

/* str.startswith() and str.endswith() */
function starts_with(text, s) {
    return text.slice(0, s.length) === s;
}

function ends_with(text, s) {
    return text.slice(-s.length) === s;
}

/*
 * Lazy way to get to A.slice() on any list-like. Useful for getElements()
 * calls, since the returned objects are slow to access.
 */
var slice = Array.prototype.slice.call.bind(Array.prototype.slice);
