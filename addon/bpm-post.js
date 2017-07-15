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
    element.classList.add("bpm-minified");
    element.classList.add("bpm-unknown");

    var can_modify_text = !element.textContent;
    if(can_modify_text) {
        element.textContent = name;
    }
}

function find_second_emote(inArray) {
    var index = 0;
    var hrefArray = inArray.slice();
    while(index < hrefArray.length) {
        if(hrefArray[index].charAt(0) === '/' && index > 0 && hrefArray[index].charAt(1) !== null && hrefArray[index].length > 1 && hrefArray[index].charAt(1) !== " " && hrefArray[index] !=("/sp")) {
	    var spliced = hrefArray.splice(index, 1);
	    hrefArray.splice(1, 0, spliced[0]);
	    return hrefArray;
	}
	index++;
    }
    return null;
}

/*
 * Does any relevant processing on an <a> element, converting emotes where
 * possible.
 */
function process_element(store, element, convert_unknown) {
    // Already been handled for some reason?
    if(element.classList.contains("bpm-emote") ||
        element.classList.contains("bpm-unknown")) {
        return;
    }

    // There is an important distinction between element.href and the raw
    // attribute: the former is mangled by the browser, which we don't want.
    var href = element.getAttribute("href");

    if(href && href[0] === "/") {
        // Don't normalize case for emote lookup- they are case sensitive
	var parts = href.split("-");
	var name = null;
	// Adds functionality for alternate emotes.
	var full_emote = find_second_emote(parts);
	if(full_emote !== null) {
	    log_debug("Found alternate emote.");
	    name = full_emote[1];
	    element.setAttribute("data-bpm_fulltext", full_emote.join("-"));
	    element.setAttribute("href", full_emote.slice(1).join("-"));
	    element.setAttribute("data-bpm_tstate", 0);
	} else {
	    name = parts[0];
        }

        var info = store.lookup_emote(name, true);

        if(info) {
            // Found an emote
            convert_emote_element(store, element, parts, name, info);
        } else if(convert_unknown && store.prefs.showUnknownEmotes) {
            // Does it look like something meant to be an emote?
            if(is_broken_emote(element, name)) {
                convert_broken_emote(element, name);
            }
        }
    }
}

var _sidebar_cache = null;
function is_sidebar(md) {
    if(_sidebar_cache) {
        return _sidebar_cache === md;
    }
    var is = class_above(md, "titlebox");
    if(is) {
        _sidebar_cache = md;
    }
    return Boolean(is);
}

/*
 * Processes emotes and alt-text under an element, given the containing .md.
 */
function process_post(store, post, md, expand_emotes) {
    // Generally, the first post on the page will be the sidebar, so this
    // is an extremely fast test.
    var sidebar = is_sidebar(md);
    var links = slice(post.getElementsByTagName("a"));
    for(var i = 0; i < links.length; i++) {
        var element = links[i];
        if(expand_emotes) {
            process_element(store, element, !sidebar);
        }
        // NOTE: must run alt-text AFTER emote code, always. See note in
        // process_alt_text
        if(!sidebar && store.prefs.showAltText) {
            process_alt_text(element);
        }
    }
}
