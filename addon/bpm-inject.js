/*
 * Generates a long random string.
 */
function random_id(length) {
    var id = "";
    for(var i = 0; i < 24; i++) {
        var index = Math.floor(Math.random() * 25);
        id += "abcdefghijklmnopqrstuvwxyz"[index];
    }
    return id;
}

/*
 * Injected code.
 */
function _msg_delegate_hack(id, message) {
    /* BPM hack to enable cross-origin frame communication in broken browsers.
       If you can see this, something broke. */
    /* Locate iframe, send message, remove class. */
    var iframe = document.getElementsByClassName(id)[0];
    if(iframe) {
        iframe.contentWindow.postMessage(message, "*");
        iframe.classList.remove(id);
        /* Locate our script tag and remove it. */
        var script = document.getElementById(id);
        script.parentNode.removeChild(script);
    }
}

/*
 * Send a message to an iframe via postMessage(), working around any browser
 * shortcomings to do so.
 *
 * "message" must be JSON-compatible.
 *
 * Note that the targetOrigin of the postMessage() call is "*", no matter
 * what. Don't send anything even slightly interesting.
 */
function message_iframe(frame, message) {
    log_debug("Sending", message, "to", frame);
    if(frame.contentWindow) {
        // Right now, only Firefox and Opera let us access this API.
        frame.contentWindow.postMessage(message, "*");
    } else {
        // Chrome and Opera don't permit *any* access to these variables for
        // some stupid reason, despite them being available on the page.
        // Inject a <script> tag that does the dirty work for us.
        var id = "__betterponymotes_esh_" + random_id();
        frame.classList.add(id);

        // AMO.
        var a = "foo", b = "scr";
        var c = "bar", d = "ipt";
        var e = "Element";
        var tag = (a + c).replace(a, b).replace(c, d);
        var f = ("create" + c).replace(c, e);
        var e = document[f]("" + tag);

        e.type = "text/javascript";
        e.id = id;
        document.head.appendChild(e);
        e.textContent = "(" + _msg_delegate_hack.toString() + ")('" + id + "', " + JSON.stringify(message) + ");";
    }
}

// Previously focused elements. Only one of these can be non-null.
var target_form = null;
var target_frame = null;

/*
 * Caches the currently focused element, if it's something we can inject
 * emotes into.
 */
function track_focus() {
    var active = document.activeElement;

    while(active.tagName === "IFRAME") {
        // Focus is within the frame. Find the real element (recursing just
        // in case).
        if(active.contentWindow === null || active.contentWindow === undefined) {
            // Chrome is broken and does not permit us to access these
            // from content scripts.
            message_iframe(active, {
                "__betterponymotes_method": "__bpm_track_focus"
            });

            target_form = null;
            target_frame = active;
            return;
        }

        try {
            active = active.contentDocument.activeElement;
        } catch(e) {
            // Addon SDK is broken
            message_iframe(active, {
                "__betterponymotes_method": "__bpm_track_focus"
            });

            target_form = null;
            target_frame = active;
            return;
        }
    }

    // Ignore our own stuff and things that are not text boxes
    if(!id_above(active, "bpm-stuff") && active !== target_form &&
       active.selectionStart !== undefined && active.selectionEnd !== undefined) {
        target_form = active;
        target_frame = null;
    }
}

/*
 * Injects an emote into the given form.
 */
function inject_emote_into_form(store, target_form, emote_name) {
    log_debug("Injecting ", emote_name, "into", target_form);

    var move_cursor = function(position) {
        target_form.selectionStart = position;
        target_form.selectionEnd = position;
    };

    if(target_form.selectionStart !== undefined && target_form.selectionEnd !== undefined) {
        var emote_info = store.lookup_core_emote(emote_name, true);

        var before_text = target_form.value.slice(0, target_form.selectionStart);
        var text = target_form.value.slice(target_form.selectionStart, target_form.selectionEnd);
        var after_text = target_form.value.slice(target_form.selectionEnd);

        if(text) {
            // Make selections into text/alt-text
            if(emote_info.tags.indexOf(store.formatting_tag_id) > -1) {
                var emote = "[" + text + "](" + emote_name + ")";
                target_form.value = (before_text + emote + after_text);
                move_cursor(before_text.length + 1 + text.length + 2 + emote_name.length + 1);
            } else {
                var emote = "[](" + emote_name + " \"" + text + "\")";
                target_form.value = (before_text + emote + after_text);
                move_cursor(before_text.length + 3 + emote_name.length + 2 + text.length + 2);
            }
        } else {
            target_form.value = (before_text + "[](" + emote_name + ")" + after_text);
            move_cursor(before_text.length + 3 + emote_name.length + 1);
        }

        target_form.focus();

        // RES listens for the "input" event. Trigger it so it rerenders.
        event = document.createEvent("HTMLEvents");
        event.initEvent("input", true, true);
        target_form.dispatchEvent(event);
    }
}

/*
 * Injects an emote into the currently focused element, which might involve
 * dispatching into an iframe.
 */
function inject_emote(store, emote_name) {
    if(target_frame !== null) {
        message_iframe(target_frame, {
            "__betterponymotes_method": "__bpm_inject_emote",
            "__betterponymotes_emote": emote_name
        });
    } else if(target_form !== null) {
        inject_emote_into_form(store, target_form, emote_name);
    }
}
