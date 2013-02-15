/*
 * Browser compatibility object. (Mostly implemented per-browser.)
 */
var bpm_browser = bpm_exports.browser = {
    /*
     * Returns an object that CSS-related tags can be attached to before the DOM
     * is built. May be undefined or null if there is no such object.
     */
    css_parent: function() {
        return document.head;
    },

    /*
     * Trigger called when css_parent() is available. May defer until dom_ready().
     */
    with_css_parent: function(callback) {
        if(bpm_browser.css_parent()) {
            callback(bpm_browser.css_parent());
        } else {
            bpm_dom.dom_ready.listen(function() {
                callback(bpm_browser.css_parent());
            });
        }
    },

    /*
     * Appends a <style> tag for the given CSS.
     */
    add_css: function(css) {
        if(css) {
            var tag = bpm_dom.style_tag(css);
            this.css_parent().insertBefore(tag, this.css_parent().firstChild);
        }
    },

    /*
     * Adds a CSS resource to the page.
     */
    link_css: function(filename) {
        this.make_css_link(filename, function(tag) {
            var parent = this.css_parent();
            parent.insertBefore(tag, parent.firstChild);
        }.bind(this));
    },

    /*
     * Sends a set_pref message to the backend. Don't do this too often, as
     * some browsers incur a significant overhead for each call.
     */
    set_pref: function(key, value) {
        bpm_debug("Writing preference:", key, "=", value);
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
    },

    // Missing attributes/methods:
    // - function _send_message(method, data)
    // - function make_css_link(filename)
    // - function linkify_options(element)
};

switch(bpm_utils.platform) {
case "firefox-ext":
    bpm_utils.copy_properties(bpm_browser, {
        _send_message: function(method, data) {
            if(data === undefined) {
                data = {};
            }
            data.method = method;
            bpm_debug("_send_message:", data);
            self.postMessage(data);
        },

        _data_url: function(filename) {
            // FIXME: Hardcoding this sucks. It's likely to continue working for
            // a good long while, but we should prefer make a request to the
            // backend for the prefix (not wanting to do that is the reason for
            // hardcoding it). Ideally self.data.url() would be accessible to
            // content scripts, but it's not...
            return "resource://jid1-thrhdjxskvsicw-at-jetpack/betterponymotes/data" + filename;
        },

        make_css_link: function(filename, callback) {
            var tag = bpm_dom.stylesheet_link(this._data_url(filename));
            callback(tag);
        },

        linkify_options: function(element) {
            // Firefox doesn't permit linking to resource:// links or something
            // equivalent.
            element.addEventListener("click", bpm_utils.catch_errors(function(event) {
                this._send_message("open_options");
            }.bind(this)), false);
        }
    });

    self.on("message", bpm_utils.catch_errors(function(message) {
        switch(message.method) {
        case "prefs":
            bpm_prefs.got_prefs(message.prefs);
            break;

        case "custom_css":
            bpm_prefs.got_custom_emotes(message.emotes, message.css);
            break;

        default:
            bpm_error("Unknown request from Firefox background script: '" + message.method + "'");
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
            bpm_debug("_send_message:", data);
            chrome.extension.sendMessage(data, this._message_handler.bind(this));
        },

        _message_handler: function(message) {
            switch(message.method) {
            case "prefs":
                bpm_prefs.got_prefs(message.prefs);
                break;

            case "custom_css":
                bpm_prefs.got_custom_emotes(message.emotes, message.css);
                break;

            default:
                bpm_error("Unknown request from Chrome background script: '" + message.method + "'");
                break;
            }
        },

        make_css_link: function(filename, callback) {
            var tag = bpm_dom.stylesheet_link(chrome.extension.getURL(filename));
            callback(tag);
        },

        linkify_options: function(element) {
            element.href = chrome.extension.getURL("/options.html");
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

        make_css_link: function(filename, callback) {
            this._get_file(filename, function(data) {
                var tag = bpm_dom.style_tag(data);
                callback(tag);
            }.bind(this));
        },

        linkify_options: function(element) {
            // It's impossible to know the address of the options page without
            // going through the backend, and Opera doesn't permit opening
            // widget:// links directly anyway.
            element.addEventListener("click", bpm_utils.catch_errors(function(event) {
                this._send_message("open_options");
            }.bind(this)), false);
        }
    });

    // Opera Next (12.50) has a better API to load the contents of an
    // embedded file than making a request to the backend process. Use
    // that if available.
    if(opera.extension.getFile) {
        bpm_debug("Using getFile data API");
        bpm_utils.copy_properties(bpm_browser, {
            _get_file: function(filename, callback) {
                var file = opera.extension.getFile(filename);
                if(file) {
                    var reader = new FileReader();
                    reader.onload = bpm_utils.catch_errors(function() {
                        callback(reader.result);
                    });
                    reader.readAsText(file);
                } else {
                    bpm_error("Opera getFile() failed on '" + filename + "'");
                }
            }
        });
    } else {
        bpm_debug("Using backend XMLHttpRequest data API");
        bpm_utils.copy_properties(bpm_browser, {
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
            bpm_prefs.got_custom_emotes(message.emotes, message.css);
            break;

        default:
            bpm_error("Unknown request from Opera background script: '" + message.method + "'");
            break;
        }
    }), false);
    break;

case "userscript":
    bpm_utils.copy_properties(bpm_browser, {
        prefs: null,

        set_pref: function(key, value) {
            bpm_debug("Writing preference:", key, "=", value);
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
            bpm_prefs.got_custom_emotes({}, ""); // No support
        },

        request_custom_css: function() {
        },

        make_css_link: function(filename, callback) {
            var url = BPM_RESOURCE_PREFIX + filename + "?p=2&dver=" + BPM_DATA_VERSION;
            var tag = bpm_dom.stylesheet_link(url);
            callback(tag);
        },

        linkify_options: function(element) {
            element.href = BPM_OPTIONS_PAGE;
        }
    });
    break;
}
