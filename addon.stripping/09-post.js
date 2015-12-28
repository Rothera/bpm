/*
 * Adds emote flags to an element.
 */
function add_flags(element, parts) {
    for(var p = 1; p < parts.length; p++) {
        // Normalize case, and forbid things that don't look exactly as we expect
        var flag = parts[p].toLowerCase();
        if(/^[\w:!#\/]+$/.test(flag)) {
            element.classList.add("bpflag-" + sanitize_emote(flag));
        }
    }
}

/*
 * Removes all flags from an emote.
 */
function strip_flags(element) {
    for(var i = 0; i < element.classList.length; i++) {
        var name = element.classList[i];
        if(starts_with(name, "bpflag-")) {
            element.classList.remove(name);
            i--; // Sure hope this works
        }
    }
}

/*
 * Mangle a recognized <a> element to be an emote. Applies all CSS, state, and
 * flags. Handles disabled emotes.
 */
function convert_emote_element(store, element, parts, name, info) {
    // Applied to all emote elements, no matter what
    element.classList.add("bpm-emote");

    // Attributes used in alt-text, to avoid extra lookups.
    element.setAttribute("data-bpm_emotename", name);
    element.setAttribute("data-bpm_srname", info.source_name);
    element.setAttribute("data-bpm_class", info.css_class)

    // Leave existing text alone. This is also relevant to the click toggle
    // and the alt-text converter, so record this fact for later use
    var can_modify_text = !element.textContent;
    var disabled = store.is_disabled(info);

    // Work out state variable. "e" is always present
    var state = "e";
    if(info.is_nsfw) {
        state += "n";
    }
    if(can_modify_text) {
        state += "T";
    }
    if(disabled) {
        state += "d" + disabled; // Add numerical code (only 1=NSFW is used)
    }
    element.setAttribute("data-bpm_state", state);

    if(disabled || (store.prefs.stealthMode && info.tags.indexOf(store.formatting_tag_id) < 0)) {
        if(can_modify_text) {
            // Any existing text (generally, there shouldn't be any) will look
            // a little funny with our custom CSS, but there's not much we can
            // do about that.
            element.textContent = name;
        }

        // Combining these two prefs makes absolutely no sense, but try to do
        // something sane anyway
        if(store.prefs.hideDisabledEmotes && !store.prefs.stealthMode) {
            // "Ignore" mode- don't minify it, just hide it completely
            element.classList.add("bpm-hidden");
        } else {
            element.classList.add("bpm-minified"); // Minify emote
            if(disabled === 1) {
                // NSFW emotes have a special look to them
                element.classList.add("bpm-nsfw");
            }
        }

        return;
    }

    // Apply the actual emote CSS
    element.classList.add(info.css_class);

    // Apply flags
    add_flags(element, parts);
}

/*
 * Inspects an element to decide whether or not it appears to be a broken emote.
 */
function is_broken_emote(element, name) {
    /*
     * If there's:
     *    1) No text
     *    2) href matches regexp (no slashes, mainly)
     *    3) No size (missing bg image means it won't display)
     *    4) No :after or :before tricks to display the image (some subreddits
     *       do emotes with those selectors)
     * Then it's probably an emote, but we don't know what it is. Thanks to
     * nallar for his advice/code here.
     */
    // Cheap tests first
    if(element.textContent || !(/^\/[\w\-:!]+$/).test(name) || element.clientWidth) {
        return false;
    }

    // Check for presence of background-image, also on :after and :before
    var pseudos = [null, ":after", ":before"];
    for(var pi = 0; pi < pseudos.length; pi++) {
        var bg_image = window.getComputedStyle(element, pseudos[pi]).backgroundImage;
        // This value is "" in Opera, but "none" in Firefox and Chrome.
        if(bg_image && bg_image !== "none") {
            return false;
        }
    }

    return true; // Good enough
}

/*
 * Mangles an element that appears to be an unknown emote.
 */
function convert_broken_emote(element, name) {
    // Unknown emote? Good enough
    element.setAttribute("data-bpm_state", "u");
    element.setAttribute("data-bpm_emotename", name);
    element.setAttribute("data-bpm_class", "");
    element.classList.add("bpm-minified");
    element.classList.add("bpm-unknown");

    var can_modify_text = !element.textContent;
    if(can_modify_text) {
        element.textContent = name;
    }
}
