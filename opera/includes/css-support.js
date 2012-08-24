// ==UserScript==
// @include http://*.reddit.com/*
// @include https://*.reddit.com/*
// ==/UserScript==

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
    var is_opera_next = false;
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

function apply_css(filename) {
    get_file(filename, function(data) {
        var tag = document.createElement("style");
        tag.setAttribute("type", "text/css");
        tag.appendChild(document.createTextNode(data));
        document.head.insertBefore(tag, document.head.firstChild);
    });
}

window.addEventListener("DOMContentLoaded", function() {
    apply_css("/emote-classes.css");
    apply_css("/combiners.css");
    apply_css("/misc.css");

    if(widget.preferences.enableNSFW == "true") {
        apply_css("/nsfw-emote-classes.css");
    }
    if(widget.preferences.enableExtraCSS == "true") {
        // FIXME: Is there a way we can just directly detect support for
        // prefixed vs. non-prefixed CSS properties?
        if(is_opera_next) {
            apply_css("/extracss-opera-next.css");
        } else {
            apply_css("/extracss-opera.css");
        }
    }
}, false);
