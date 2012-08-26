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

/*
 * CSS Support
 *
 * Firefox: All of this is handled in main.js.
 * Chrome: enable_css() creates links directly to the embedded stylesheet files.
 * Opera: On Opera Next, the stylesheet files are read directly and applied as
 *     <style> tags. Otherwise, a request is send to background.js for the
 *     contents of the files.
 */

if(chrome) {
    enable_css = function(filename) {
        var tag = document.createElement("link");
        tag.href =  chrome.extension.getURL(filename);
        tag.rel = "stylesheet";
        document.documentElement.insertBefore(tag);
    }
} else if(opera) {
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
                opera.postError("ERROR: getFile() failed on " + filename);
            }
        }
    } else {
        var file_callbacks = {};

        function on_message(event) {
            var message = event.data;
            switch(message.request) {
                case "fileLoaded":
                    file_callbacks[message.filename](message.data);
                    delete file_callbacks[message.filename];
                    break;

                default:
                    opera.postError("ERROR: Unknown request from background script: " + message.request);
                    break;
            }
        }
        opera.extension.addEventListener("message", on_message, false);

        var get_file = function(filename, callback) {
            file_callbacks[filename] = callback;
            opera.extension.postMessage({
                "request": "getFile",
                "filename": filename
            });
        }
    }

    enable_css = function(filename) {
        get_file(filename, function(data) {
            var tag = document.createElement("style");
            tag.setAttribute("type", "text/css");
            tag.appendChild(document.createTextNode(data));
            document.head.insertBefore(tag, document.head.firstChild);
        });
    }
}

/*
 * Preferences
 *
 * Firefox: As yet, never handled here. (Otherwise, strongly typed key/value.)
 * Chrome: Strongly typed JSON data.
 * Opera: Key/value string storage.
 */

if(chrome) {
    pref_boolean = function(prefs, name) {
        return prefs[name];
    }
} else if(opera) {
    pref_boolean = function(prefs, name) {
        return prefs[name] == "true";
    }
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
        if(is_opera_next) {
            // Requires unprefixed CSS; both are bundled
            enable_css("/extracss-next.css");
        } else {
            enable_css("/extracss.css");
        }
    }
}

/*
 * CSS Application
 *
 * Firefox: Not done here.
 * Chrome: Basic CSS is applied before the DOM is constructed; the rest, when
 *     the preferences are available.
 * Opera: All CSS is applied when the DOM is constructed.
 *     (Before would be preferable, but I couldn't find a way to make the approach
 *     work for some reason.)
 */

if(chrome) {
    apply_basic_css();
    chrome.extension.sendMessage({method: "getPrefs"}, apply_other_css);
} else if(opera) {
    window.addEventListener("DOMContentLoaded", function() {
        apply_basic_css();
        apply_other_css(widget.preferences);
    }, false);
}
