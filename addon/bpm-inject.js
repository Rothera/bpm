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
        // WebExt and Opera don't permit *any* access to these variables for
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
            // WebExt is broken and does not permit us to access these
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
    var emote_info = store.lookup_core_emote(emote_name, true);

    var start = target_form.selectionStart;
    var end = target_form.selectionEnd;
    if(start !== undefined && end !== undefined) {
        var emote_len;
        var before = target_form.value.slice(0, start);
        var inside = target_form.value.slice(start, end);
        var after = target_form.value.slice(end);
        if(inside) {
            var extra_len, emote;
            // Make selections into text/alt-text
            if(emote_info.tags.indexOf(store.formatting_tag_id) > -1) {
                extra_len = 4; // '[]('' and ')'
                emote = "[" + inside + "](" + emote_name + ")";
            } else {
                extra_len = 4; // '[](' and ' "' and '")'
                emote = "[](" + emote_name + " \"" + inside + "\")";
            }
            emote_len = extra_len + emote_name.length + (end - start);
            target_form.value = (before + emote + after);
        } else {
            // "[](" + ")"
            emote_len = 4 + emote_name.length;
            target_form.value = (
                before +
                "[](" + emote_name + ")" +
                after);
        }
        target_form.selectionStart = end + emote_len;
        target_form.selectionEnd = end + emote_len;
        target_form.focus();

        // Previous RES versions listen for keyup, but as of the time of
        // writing this, the development version listens for input. For now
        // we'll just send both, and remove the keyup one at a later date.
        var event = document.createEvent("Event");
        event.initEvent("keyup", true, true);
        target_form.dispatchEvent(event);
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
