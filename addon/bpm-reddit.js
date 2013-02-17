/*
 * Current subreddit being displayed, or null if there doesn't seem to be one.
 */
var current_subreddit = (function() {
    // FIXME: what other characters are valid?
    var match = document.location.href.match(/reddit\.com\/r\/([\w]+)/);
    if(match) {
        return match[1].toLowerCase();
    } else {
        return null;
    }
})();

/*
 * Shows an "error" message under an edit form, in the standard style.
 * Comparable to the "we need something here" message when you try to post
 * an empty comment.
 */
function enable_warning(bottom_area, class_name, message) {
    var element = find_class(bottom_area, class_name);
    if(!element) {
        element = document.createElement("span");
        element.classList.add("error");
        element.classList.add(class_name);
        // Insert before the .usertext-buttons div
        var before = find_class(bottom_area, "usertext-buttons");
        bottom_area.insertBefore(element, before);
    }
    element.style.display = "";
    element.textContent = message;
}

/*
 * Disables a previously-generated error message, if it exists.
 */
function disable_warning(bottom_area, class_name) {
    var element = find_class(bottom_area, class_name);
    if(element) {
        element.parentNode.removeChild(element);
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
 * Process the given list of elements (assumed to be <a> tags), converting
 * any that are emotes.
 */
function process(prefs, elements, convert_unknown) {
    next_emote:
    for(var i = 0; i < elements.length; i++) {
        var element = elements[i];
        if(element.classList.contains("bpm-emote") || element.classList.contains("bpm-unknown")) {
            continue;
        }

        // There is an important distinction between element.href and
        // element.getAttribute("href")- the former is mangled by the
        // browser to be a complete URL, which we don't want.
        var href = element.getAttribute("href");
        if(href && href[0] === "/") {
            // Don't normalize case for emote lookup
            var parts = href.split("-");
            var emote_name = parts[0];
            var emote_info = lookup_emote(emote_name, prefs.custom_emotes);

            if(emote_info) {
                // Click blocker CSS/JS
                element.classList.add("bpm-emote");
                // Used in alt-text. (Note: dashes are invalid here)
                var state = "e";
                element.setAttribute("data-bpm_emotename", emote_name);
                element.setAttribute("data-bpm_srname", emote_info.source_name);
                if(emote_info.is_nsfw) {
                    state += "n";
                }

                var nsfw_class = prefs.prefs.hideDisabledEmotes ? "bpm-hidden" : "bpm-nsfw";
                var disabled_class = prefs.prefs.hideDisabledEmotes ? "bpm-hidden" : "bpm-disabled";
                var disabled = is_disabled(prefs, emote_info);
                if(disabled) {
                    state += "d" + disabled; // Tee hee
                    if(!element.textContent) {
                        // Any existing text (there really shouldn't be any)
                        // will look funny with our custom CSS, but there's
                        // not much we can do.
                        state += "T";
                        element.textContent = emote_name;
                    }
                    element.setAttribute("data-bpm_state", state);
                    switch(disabled) {
                    case 1: // NSFW
                        element.classList.add(nsfw_class);
                        break;
                    case 2: // subreddit
                    case 3: // size
                    case 4: // blacklisted
                        element.classList.add(disabled_class);
                        break;
                    }
                    continue;
                }
                element.setAttribute("data-bpm_state", state);
                element.classList.add(emote_info.css_class);

                // Apply flags in turn. We pick on the naming a bit to prevent
                // spaces and such from slipping in.
                for(var p = 1; p < parts.length; p++) {
                    // Normalize case
                    var flag = parts[p].toLowerCase();
                    if(/^[\w:!#\/]+$/.test(flag)) {
                        element.classList.add("bpflag-" + sanitize_emote(flag));
                    }
                }
            } else if(convert_unknown && prefs.prefs.showUnknownEmotes) {
                /*
                 * If there's:
                 *    1) No text
                 *    2) href matches regexp (no slashes, mainly)
                 *    3) No size (missing bg image means it won't display)
                 *    4) No :after or :before tricks to display the image
                 *       (some subreddits do emotes with those selectors)
                 * Then it's probably an emote, but we don't know what it is.
                 * Thanks to nallar for his advice/code here.
                 */
                if(element.textContent || !(/^\/[\w\-:!]+$/).test(emote_name) || element.clientWidth) {
                    continue;
                }

                var pseudos = [null, ":after", ":before"];
                for(var pi = 0; pi < pseudos.length; pi++) {
                    var bg_image = window.getComputedStyle(element, pseudos[pi]).backgroundImage;
                    // "" in Opera, "none" in Firefox/Chrome.
                    if(bg_image && bg_image !== "none") {
                        continue next_emote;
                    }
                }

                // Unknown emote? Good enough
                element.setAttribute("data-bpm_state", "u");
                element.setAttribute("data-bpm_emotename", emote_name);
                element.classList.add("bpm-unknown");
                if(!element.textContent) {
                    element.textContent = emote_name;
                }
            }
        }
    }
}

// Known spoiler "emotes". Not all of these are known to BPM, and it's not
// really worth moving this to a data file somewhere.
// - /spoiler is from r/mylittlepony (and copied around like mad)
// - /s is from r/falloutequestria (and r/mylittleanime has a variant)
// - #s is from r/doctorwho
// - /b and /g are from r/dresdenfiles
var spoiler_links = ["/spoiler", "/s", "#s", "/b", "/g"];

/*
 * Converts alt-text on a list of <a> elements as appropriate.
 */
// NOTE/FIXME: Alt-text isn't really related to emote conversion as-is, but
// since it runs on a per-emote basis, it kinda goes here anyway.
function display_alt_text(elements) {
    for(var i = 0; i < elements.length; i++) {
        var element = elements[i];
        var state = element.getAttribute("data-bpm_state") || "";

        // Already processed- ignore, so we don't do annoying things like
        // expanding the emote sourceinfo.
        if(state.indexOf("a") > -1) {
            continue;
        }

        // Can't rely on .bpm-emote and data-emote to exist for spoiler
        // links, as many of them aren't known.
        var href = element.getAttribute("href");
        if(href && spoiler_links.indexOf(href.split("-")[0]) > -1) {
            continue;
        }

        var processed = false;

        if(element.title) {
            processed = true;

            // Work around due to RES putting tag links in the middle of
            // posts. (Fucking brilliant!)
            if(element.classList.contains("userTagLink") ||
               element.classList.contains("voteWeight")) {
                continue;
            }

            // Try to move to the other side of RES's image expand buttons,
            // because otherwise they end awfully
            var before = element.nextSibling;
            while((before && before.className !== undefined) &&
                  before.classList.contains("expando-button")) {
                before = before.nextSibling;
            }

            // As a note: alt-text kinda has to be a block-level element. If
            // you make it inline, it has the nice property of putting it where
            // the emote was in the middle of a paragraph, but since the emote
            // itself goes to the left, it just gets split up. This also makes
            // long chains of emotes with alt-text indecipherable.
            //
            // Inline *is*, however, rather important sometimes- particularly
            // -inp emotes. As a bit of a hack, we assume the emote code has
            // already run, and check for bpflag-in/bpflag-inp.
            var element_type = "div";
            if(state.indexOf("d") > -1 || element.classList.contains("bpflag-in") ||
                element.classList.contains("bpflag-inp")) {
                element_type = "span";
            }

            //                                  http://    < domain name >    /url?params#stuff
            // \b doesn't seem to be working when I put it at the end, here??
            // Also, note that we do grab the space at the end for formatting
            var parts = element.title.split(/\b(https?:\/\/[a-zA-Z0-9\-.]+(?:\/[a-zA-Z0-9\-_.~'();:+\/?%#]*)?(?:\s|$))/);

            var at_element = document.createElement(element_type); // Container
            at_element.classList.add("bpm-alttext");
            for(var j = 0; j < Math.floor(parts.length / 2); j += 2) {
                if(parts[j]) {
                    at_element.appendChild(document.createTextNode(parts[j]));
                }
                var link_element = document.createElement("a");
                link_element.textContent = parts[j + 1];
                link_element.href = parts[j + 1];
                at_element.appendChild(link_element);
            }
            if(parts[parts.length - 1]) {
                at_element.appendChild(document.createTextNode(parts[parts.length - 1]));
            }

            element.parentNode.insertBefore(at_element, before);
        }

        // If it's an emote, replace the actual alt-text with source info
        var emote_name, title;
        if(state.indexOf("e") > -1) {
            processed = true;
            emote_name = element.getAttribute("data-bpm_emotename");
            var sr_name = element.getAttribute("data-bpm_srname");
            title = "";
            if(state.indexOf("d") > -1) {
                title = "Disabled ";
                if(state.indexOf("n") > -1) {
                    title += "NSFW ";
                }
                title += "emote ";
            }
            title += emote_name + " from " + sr_name;
            element.title = title;
        } else if(state.indexOf("u") > -1) {
            processed = true;
            emote_name = element.getAttribute("data-bpm_emotename");
            title = "Unknown emote " + emote_name;
            element.title = title;
        }

        if(processed) {
            // Mark as such.
            element.setAttribute("data-bpm_state", state + "a");
        }
    }
}

/*
 * Processes emotes and alt-text on a list of .md elements.
 */
function process_posts(prefs, posts) {
    if(posts.length) {
        log_debug("Processing", posts.length, "posts");
    }
    for(var i = 0; i < posts.length; i++) {
        process_rooted_post(prefs, posts[i], posts[i]);
    }
}

/*
 * Processes emotes and alt-text under an element, given the containing .md.
 */
function process_rooted_post(prefs, post, md) {
    // Generally, the first post on the page will be the sidebar, so this
    // is an extremely fast test.
    var sidebar = is_sidebar(md);
    var links = post.getElementsByTagName("a");
    // NOTE: must run alt-text AFTER emote code, always. See note in
    // display_alt_text
    var out_of_sub = process(prefs, links, !sidebar);
    if(!sidebar && prefs.prefs.showAltText) {
        display_alt_text(links);
    }
}

/*
 * Attaches to a .usertext-edit element, setting hooks to monitor the input
 * and display courtesy notifications appropriately.
 */
function hook_usertext_edit(prefs, usertext_edits) {
    if(!prefs.prefs.warnCourtesy) {
        return;
    }

    if(usertext_edits.length) {
        log_debug("Monitoring", usertext_edits.length, ".usertext-edit elements");
    }
    for(var i = 0; i < usertext_edits.length; i++) {
        var edit = usertext_edits[i];
        var textarea = edit.getElementsByTagName("textarea")[0];
        var bottom_area = edit.getElementsByClassName("bottom-area")[0];

        _attach_to_usertext(prefs, textarea, bottom_area);
    }
}

function _attach_to_usertext(prefs, textarea, bottom_area) {
    var timeout = null;
    function warn_now() {
        enable_warning(bottom_area, "OUTOFSUB",
            "remember not everyone can see your emotes! please be considerate");
    }
    var ok = true;
    textarea.addEventListener("input", catch_errors(function(event) {
        var text = textarea.value;
        text = text.replace(/ *>.*?\n/, ""); // Strip quotes
        //         [text]    (  /<emotename>         "<alt-text>")
        var re = /\[.*?\]\s*\((\/[\w:!#\/\-]+)\s*(?:["']([^"]*)["'])?\s*\)/g;
        var match;
        ok = true; // innocent until proven guilty
        var has_extern = false;
        var has_local = false;
        while(match = re.exec(text)) {
            var emote_name = match[1].split("-")[0];
            var emote_info = lookup_emote(emote_name, prefs.custom_emotes);
            // Nothing we recognize.
            if(emote_info === null) {
                continue;
            }

            var from_here = false;
            for(var si = 0; si < emote_info.sources.length; si++) {
                from_here = sr_id2name[emote_info.sources[si]] === "r/" + current_subreddit;
                if(from_here) {
                    break; // It's from at *least* this subreddit
                }
            }
            if(from_here) {
                has_local = true;
            } else {
                has_extern = true;
                if(match[2]) {
                    ok = false;
                }
            }
        }

        if(!text.replace(re, "").trim()) {
            // Emote-only post. Only complain if there's actually something
            // here.
            if(has_extern && !has_local) {
                ok = false;
            }
        }

        if(timeout !== null) {
            clearTimeout(timeout);
        }

        if(!ok) {
            // Set notification to go off in two seconds.
            timeout = setTimeout(catch_errors(function() {
                timeout = null;
                warn_now();
            }), 2000);
        } else {
            disable_warning(bottom_area, "OUTOFSUB");
        }
    }), false);

    textarea.addEventListener("blur", catch_errors(function(event) {
        // If the editor loses focus, notify immediately. This is sort of
        // mean to catch people who are quickly tabbing to the save button,
        // but if they hit it fast enough our warning will be hidden anyway.
        if(!ok) {
            if(timeout !== null) {
                clearTimeout(timeout);
            }
            warn_now();
        }
    }), false);
}
