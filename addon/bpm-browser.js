/*
 * Browser compatibility.
 */

/*
 * Returns an object that CSS-related tags can be attached to before the DOM
 * is built. May be undefined or null if there is no such object.
 */
function css_parent() {
    return document.head || document.documentElement || null;
}

/*
 * Trigger called when css_parent() is available. May defer until with_dom().
 */
function with_css_parent(callback) {
    if(css_parent()) {
        callback(css_parent());
    } else {
        with_dom(function() {
            callback(css_parent());
        });
    }
}

/*
 * Appends a <style> tag for the given CSS.
 */
function add_css(css) {
    if(css) {
        var tag = style_tag(css);
        css_parent().insertBefore(tag, css_parent().firstChild);
    }
}

/*
 * Adds a CSS resource to the page.
 */
function link_css(filename) {
    make_css_link(filename, function(tag) {
        var parent = css_parent();
        parent.insertBefore(tag, parent.firstChild);
    });
}

/*
 * Sends a set_pref message to the backend. Don't do this too often, as
 * some browsers incur a significant overhead for each call.
 */
var set_pref = function(key, value) {
    log_debug("Writing preference:", key, "=", value);
    _send_message("set_pref", {"pref": key, "value": value});
};

var request_initdata = function(want) {
    _send_message("get_initdata", {"want": want});
};

var _initdata_want = null;
var _initdata_hook = null;
var setup_browser = function(want, callback) {
    _initdata_want = want;
    _initdata_hook = callback;
    request_initdata(want);
};

function _complete_setup(initdata) {
    var store = new Store();

    if(_initdata_want.prefs) {
        if(initdata.prefs !== undefined) {
            store.setup_prefs(initdata.prefs);
        } else {
            log_error("Backend sent wrong initdata: no prefs");
            return;
        }
    }
    if(_initdata_want.customcss) {
        if(initdata.emotes !== undefined && initdata.css !== undefined) {
            store.setup_customcss(initdata.emotes, initdata.css);
        } else {
            log_error("Backend sent wrong initdata: no custom css");
            return;
        }
    }

    _initdata_hook(store);
    _initdata_want = null;
    _initdata_hook = null;
}

// Missing attributes/methods:
var _send_message = null;
var make_css_link = null;
var linkify_options = null;

switch(platform) {
case "firefox-ext":
    _send_message = function(method, data) {
        if(data === undefined) {
            data = {};
        }
        data.method = method;
        log_debug("_send_message:", data);
        self.postMessage(data);
    };

    var _data_url = function(filename) {
        // FIXME: Hardcoding this sucks. It's likely to continue working for
        // a good long while, but we should prefer make a request to the
        // backend for the prefix (not wanting to do that is the reason for
        // hardcoding it). Ideally self.data.url() would be accessible to
        // content scripts, but it's not...
        return "resource://jid1-thrhdjxskvsicw-at-jetpack/betterponymotes/data" + filename;
    };

    make_css_link = function(filename, callback) {
        var tag = stylesheet_link(_data_url(filename));
        callback(tag);
    };

    linkify_options = function(element) {
        // Firefox doesn't permit linking to resource:// links or something
        // equivalent.
        element.addEventListener("click", catch_errors(function(event) {
            _send_message("open_options");
        }), false);
    };

    self.on("message", catch_errors(function(message) {
        switch(message.method) {
        case "initdata":
            _complete_setup(message);
            break;

        default:
            log_error("Unknown request from Firefox background script: '" + message.method + "'");
            break;
        }
    }));
    break;

case "chrome-ext":
    _send_message = function(method, data) {
        if(data === undefined) {
            data = {};
        }
        data.method = method;
        log_debug("_send_message:", data);
        chrome.extension.sendMessage(data, _message_handler);
    };

    var _message_handler = catch_errors(function(message) {
        switch(message.method) {
        case "initdata":
            _complete_setup(message);
            break;

        default:
            log_error("Unknown request from Chrome background script: '" + message.method + "'");
            break;
        }
    });

    make_css_link = function(filename, callback) {
        var tag = stylesheet_link(chrome.extension.getURL(filename));
        callback(tag);
    };

    linkify_options = function(element) {
        element.href = chrome.extension.getURL("/options.html");
    };
    break;

case "opera-ext":
    _send_message = function(method, data) {
        if(data === undefined) {
            data = {};
        }
        data.method = method;
        opera.extension.postMessage(data);
    };

    make_css_link = function(filename, callback) {
        _get_file(filename, function(data) {
            var tag = style_tag(data);
            callback(tag);
        });
    };

    linkify_options = function(element) {
        // It's impossible to know the address of the options page without
        // going through the backend, and Opera doesn't permit opening
        // widget:// links directly anyway.
        element.addEventListener("click", catch_errors(function(event) {
            _send_message("open_options");
        }), false);
    };

    // Opera Next (12.50) has a better API to load the contents of an
    // embedded file than making a request to the backend process. Use
    // that if available.
    var _get_file = null;
    if(opera.extension.getFile) {
        log_debug("Using getFile data API");
        _get_file = function(filename, callback) {
            var file = opera.extension.getFile(filename);
            if(file) {
                var reader = new FileReader();
                reader.onload = catch_errors(function() {
                    callback(reader.result);
                });
                reader.readAsText(file);
            } else {
                log_error("Opera getFile() failed on '" + filename + "'");
            }
        };
    } else {
        log_debug("Using backend XMLHttpRequest data API");
        var _file_callbacks = {};

        _get_file = function(filename, callback) {
            _file_callbacks[filename] = callback;
            _send_message("get_file", {"filename": filename});
        };
    }

    opera.extension.addEventListener("message", catch_errors(function(event) {
        var message = event.data;
        switch(message.method) {
        case "initdata":
            _complete_setup(message);
            break;

        case "file_loaded":
            _file_callbacks[message.filename](message.data);
            delete _file_callbacks[message.filename];
            break;

        default:
            log_error("Unknown request from Opera background script: '" + message.method + "'");
            break;
        }
    }), false);
    break;

case "userscript":
    var _pref_cache = null;

    set_pref = function(key, value) {
        log_debug("Writing preference:", key, "=", value);
        _pref_cache[key] = value;
        _sync_prefs();
    };

    var _sync_prefs = function() {
        GM_setValue("prefs", JSON.stringify(_pref_cache));
    };

    request_initdata = function(want) {
        var tmp = GM_getValue("prefs");
        if(!tmp) {
            tmp = "{}";
        }

        _pref_cache = JSON.parse(tmp);
        bpm_backendsupport.setup_prefs(_pref_cache, sr_name2id);
        _sync_prefs();

        // No support for custom CSS
        _complete_setup({"prefs": _pref_cache, "emotes": {}, "css": ""});
    };

    make_css_link = function(filename, callback) {
        var url = EXT_RESOURCE_PREFIX + filename + "?p=2&dver=/*{{data_version}}*/";
        var tag = stylesheet_link(url);
        callback(tag);
    };

    linkify_options = function(element) {
        element.href = EXT_OPTIONS_PAGE;
    };
    break;
}
