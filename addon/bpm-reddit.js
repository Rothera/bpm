/*
 * Injects a sneaky little link at the bottom of each Reddit page that
 * displays the logs.
 */
function inject_reddit_log_button() {
    var reddit_footer = find_class(document.body, "footer-parent");
    if(!reddit_footer) {
        return;
    }

    // <div><pre>...</pre> <a>[dump bpm logs]</a></div>
    var container = document.createElement("div");
    container.className = "bottommenu";
    var output = document.createElement("pre");
    output.style.display = "none";
    output.style.textAlign = "left";
    output.style.borderStyle = "solid";
    output.style.width = "50%";
    output.style.margin = "auto auto auto auto";
    var link = document.createElement("a");
    link.href = "javascript:void(0)";
    link.textContent = "[dump bpm logs]";
    container.appendChild(link);
    container.appendChild(output);

    link.addEventListener("click", catch_errors(function(event) {
        output.style.display = "block";
        var logs = _log_buffer.join("\n");
        output.textContent = logs;
    }), false);

    reddit_footer.appendChild(container);
}

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
function process_links(store, elements, convert_unknown) {
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
            var emote_info = store.lookup_emote(emote_name, false);

            if(emote_info) {
                element.classList.add("bpm-emote");
                // Used in alt-text. (Note: dashes are invalid here)
                element.setAttribute("data-bpm_emotename", emote_name);
                element.setAttribute("data-bpm_srname", emote_info.source_name);

                var state = "e";
                if(emote_info.is_nsfw) {
                    state += "n";
                }

                var can_modify_text = !element.textContent;
                if(can_modify_text) {
                    state += "T";
                }

                var disabled = store.is_disabled(emote_info);
                if(disabled) {
                    state += "d" + disabled; // Tee hee
                    if(can_modify_text) {
                        // Any existing text (there really shouldn't be any)
                        // will look funny with our custom CSS, but there's
                        // not much we can do.
                        element.textContent = emote_name;
                    }
                    element.setAttribute("data-bpm_state", state);
                    if(store.prefs.hideDisabledEmotes) {
                        element.classList.add("bpm-hidden");
                    } else {
                        element.classList.add("bpm-minified");
                        if(disabled === 1) {
                            element.classList.add("bpm-nsfw");
                        }
                    }
                    continue;
                }
                element.setAttribute("data-bpm_state", state);
                if(store.prefs.stealthMode) {
                    element.classList.add("bpm-minified");
                    if(can_modify_text) {
                        element.textContent = emote_name;
                    }
                    continue;
                } else {
                    element.classList.add(emote_info.css_class);
                }

                // Apply flags in turn. We pick on the naming a bit to prevent
                // spaces and such from slipping in.
                for(var p = 1; p < parts.length; p++) {
                    // Normalize case
                    var flag = parts[p].toLowerCase();
                    if(/^[\w:!#\/]+$/.test(flag)) {
                        element.classList.add("bpflag-" + sanitize_emote(flag));
                    }
                }
            } else if(convert_unknown && store.prefs.showUnknownEmotes) {
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
                element.classList.add("bpm-minified");
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
function process_alt_text(elements) {
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
            if(element.classList.contains("bpflag-in") || element.classList.contains("bpflag-inp")) {
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
function process_posts(store, posts) {
    if(posts.length) {
        log_debug("Processing", posts.length, "posts");
    }
    for(var i = 0; i < posts.length; i++) {
        process_rooted_post(store, posts[i], posts[i]);
    }
}

/*
 * Processes emotes and alt-text under an element, given the containing .md.
 */
function process_rooted_post(store, post, md) {
    // Generally, the first post on the page will be the sidebar, so this
    // is an extremely fast test.
    var sidebar = is_sidebar(md);
    var links = slice(post.getElementsByTagName("a"));
    // NOTE: must run alt-text AFTER emote code, always. See note in
    // process_alt_text
    var out_of_sub = process_links(store, links, !sidebar);
    if(!sidebar && store.prefs.showAltText) {
        process_alt_text(links);
    }
}

/*
 * Main function when running on Reddit.
 */
function run_reddit(store) {
    log_info("Running on Reddit");

    init_search_box(store);
    var usertext_edits = slice(document.getElementsByClassName("usertext-edit"));
    inject_emotes_button(store, usertext_edits);

    // Initial pass- show all emotes currently on the page.
    var posts = slice(document.getElementsByClassName("md"));
    process_posts(store, posts);

    // Add emote click blocker
    document.body.addEventListener("click", catch_errors(function(event) {
        var element = event.target;
        if(element.classList.contains("bpm-emote") || element.classList.contains("bpm-unknown")) {
            event.preventDefault();
        }

        if(element.classList.contains("bpm-emote")) {
            // Click toggle
            var state = element.getAttribute("data-bpm_state") || "";
            var is_nsfw_disabled = state.indexOf("1") > -1; // NSFW
            if(store.prefs.clickToggleSFW && is_nsfw_disabled) {
                return;
            }
            var info = store.lookup_emote(element.getAttribute("data-bpm_emotename"), false);
            if(element.classList.contains("bpm-minified")) {
                // Show: unminify, enable, give it its CSS, and remove the bit
                // of text we added
                element.classList.remove("bpm-minified");
                element.classList.remove("bpm-nsfw");
                element.classList.add(info.css_class);
                if(state.indexOf("T") > -1) {
                    element.textContent = "";
                }
            } else {
                // Hide: remove its CSS, minify, optionally disable, and put
                // our bit of text back
                element.classList.remove(info.css_class);
                element.classList.add("bpm-minified");
                if(is_nsfw_disabled) {
                    element.classList.add("bpm-nsfw");
                }
                if(state.indexOf("T") > -1) {
                    element.textContent = info.name;
                }
            }
        }
    }), false);

    // As a relevant note, it's a terrible idea to set this up before
    // the DOM is built, because monitoring it for changes seems to slow
    // the process down horribly.

    // What we do here: for each mutation, inspect every .md we can
    // find- whether the node in question is deep within one, or contains
    // some.
    observe_document(function(nodes) {
        for(var i = 0; i < nodes.length; i++) {
            var root = nodes[i];
            if(root.nodeType !== find_global("Node").ELEMENT_NODE) {
                // Not really interested in other kinds.
                continue;
            }

            var md;
            if(md = class_above(root, "md")) {
                // Inside of a formatted text block, take all the
                // links we can find
                process_rooted_post(store, root, md);
            } else {
                // Outside of formatted text, try to find some
                // underneath us
                var posts = slice(root.getElementsByClassName("md"));
                process_posts(store, posts);
            }

            // TODO: move up in case we're inside it?
            var usertext_edits = slice(root.getElementsByClassName("usertext-edit"));
            inject_emotes_button(store, usertext_edits);
        }
    });
}

function reddit_main(store) {
    init_css(store);

    // This script is generally run before the DOM is built. Opera may break
    // that rule, but I don't know how and there's nothing we can do anyway.
    //
    // Need DOM (to operate on), prefs and customcss (to work with).
    with_dom(function() {
        inject_reddit_log_button(); // Do this early
        run_reddit(store);
    });
}
