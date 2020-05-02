var current_subreddit = (function() {
    // FIXME: what other characters are valid?
    var match = document.location.href.match(/reddit\.com\/(r\/[\w]+)/);
    if(match) {
        return match[1].toLowerCase();
    } else {
        return null;
    }
})();

function is_blacklisted(store) {
    return !!store.prefs.blacklistedSubreddits[current_subreddit];
}

/*
 * Injects a sneaky little link at the bottom of each Reddit page that
 * displays the logs.
 */
function inject_buttons(store) {
    function add_link(container, text, callback) {
        var link = document.createElement("a");
        link.href = "javascript:void(0)";
        link.textContent = text;
        container.appendChild(link);
        link.addEventListener("click", catch_errors(callback), false);
        return link;
    }

    var reddit_footer = find_class(document.body, "footer-parent");
    if(!reddit_footer) {
        return;
    }

    // <div><pre>...</pre> <a>[dump bpm logs]</a></div>
    var container = document.createElement("div");
    container.className = "bottommenu";
    reddit_footer.appendChild(container);

    var output = document.createElement("pre");
    output.style.display = "none";
    output.style.textAlign = "left";
    output.style.borderStyle = "solid";
    output.style.width = "50%";
    output.style.margin = "auto auto auto auto";

    // Log link
    add_link(container, "[dump bpm logs] ", function(event) {
        output.style.display = "block";
        var logs = _log_buffer.join("\n");
        output.textContent = logs;
    });
    container.appendChild(output);

    // Subreddit blacklist control. This isn't available from the prefs page
    function bl_text() {
        return "[" + (is_blacklisted(store) ? "whitelist" : "blacklist") + " subreddit]";
    }

    var bl_link = add_link(container, bl_text(), function(event) {
        if(is_blacklisted(store)) {
            delete store.prefs.blacklistedSubreddits[current_subreddit];
        } else {
            store.prefs.blacklistedSubreddits[current_subreddit] = true;
        }
        store.sync_key("blacklistedSubreddits")
        bl_link.textContent = bl_text();
    });
}

function toggle_emote(store, element) {
    // Click toggle
    var state = element.getAttribute("data-bpm_state") || "";
    var is_nsfw_disabled = state.indexOf("1") > -1; // NSFW
    if(store.prefs.clickToggleSFW && is_nsfw_disabled) {
        return;
    }
    //If this attribute is set, then the emote has a fallback.
    if(element.hasAttribute("data-bpm_tstate")) {
        var parts = element.getAttribute("data-bpm_fulltext").split("-");
	switch(element.getAttribute("data-bpm_tstate")) {
	    case "0": //The emote is normal and should be changed to the fallback emote.
	        var info = store.lookup_emote(parts[1], false);
		log_debug(element.classList.contains("bpflag-in"));
		var flag_in = element.classList.contains("bpflag-in");
		element.classList.remove(info.css_class);
		//Remove the BPM emote from parts for strip_flags()
		parts.splice(1, 1);
		strip_flags(element, parts);
		if(flag_in) {
		    element.classList.add("bpflag-in");
		}
		element.setAttribute("href", parts[0]);
		element.setAttribute("data-bpm_tstate", "1");
		break;
	    case "1": //The emote is set to the fallback and should be minified.
		element.classList.add("bpm-minified");
		if(is_nsfw_disabled) {
		    element.classList.add("bpm-nsfw");
		}
		if(state.indexOf("T") > -1) {
		    element.textContent = element.getAttribute("data-bpm_fulltext");
		}
		parts.splice(0, 1);
		element.setAttribute("href", parts.join("-"));
		element.setAttribute("data-bpm_tstate", "2");
		break;
	    case "2": //The emote is minified and should be changed to its default BPM emote.
		parts.splice(0, 1);
		var info = store.lookup_emote(parts[0], false);
		element.classList.remove("bpm-minified");
		element.classList.remove("bpm-nsfw");
		element.classList.add(info.css_class);
		if(state.indexOf("T") > -1) {
		    element.textContent = "";
		}
		element.setAttribute("href", parts.join("-"));
		add_flags(element, parts);
		element.setAttribute("data-bpm_tstate", "0");
		break;
	    }
	} else {
	//If the emote has no fallback, just use the regular logic for toggling emotes.
	var info = store.lookup_emote(element.getAttribute("data-bpm_emotename"), false);
	if(element.classList.contains("bpm-minified")) {
	    // Show: unminify, enable, give it its CSS, remove the bit of text we
	    // added, enable flags.
	    element.classList.remove("bpm-minified");
	    element.classList.remove("bpm-nsfw");
	    element.classList.add(info.css_class);
	    if(state.indexOf("T") > -1) {
		element.textContent = "";
	    }
	    var parts = element.getAttribute("href").split("-");
	    add_flags(element, parts);
	} else {
	    // Hide: remove its CSS, minify, optionally disable, put our bit of
	    // text back, and kill flags.
	    element.classList.remove(info.css_class);
	    element.classList.add("bpm-minified");
	    if(is_nsfw_disabled) {
		element.classList.add("bpm-nsfw");
	    }
	    if(state.indexOf("T") > -1) {
	        element.textContent = element.getAttribute("href");
	    }
	    strip_flags(element);
	}
    }
}

function block_click(store, event) {
    var element = event.target;

    // Go up a level or two to see if one of the parent nodes is an emote. This
    // improves behavior on the "text" emotes e.g. e.g. [*Free hugs*](/lpsign).
    //
    // We somewhat arbitrarily only go up one element here. That should be
    // enough for our purposes, and keeps this particular check short and fast.
    for(var tries = 0; element && tries < 2; tries++) {
        if(element.classList.contains("bpm-emote")) {
            event.preventDefault();
            toggle_emote(store, element);
            break;
        } else if(element.classList.contains("bpm-unknown")) {
            event.preventDefault();
            break;
        }

        element = element.parentElement;
    }
}

/*
 * Main function when running on Reddit or Voat.
 */
function run_reddit(store, expand_emotes) {
    init_search_box(store);
    if (is_reddit) {
        var usertext_edits = slice(document.getElementsByClassName("usertext-edit"));
    } else if (is_modreddit) {
        if (ends_with(document.location.pathname, "create")) {
            var usertext_edits = slice(document.getElementsByClassName("NewThread__form"));
        } else {
            var usertext_edits = slice(document.getElementsByClassName("ThreadViewer__replyContainer"));
        }
    } else if (is_voat) {
        var usertext_edits = slice(document.getElementsByClassName("markdownEditor"));
    }
    inject_emotes_button(store, usertext_edits);

    // Initial pass- show all emotes currently on the page.
    var posts = slice(document.querySelectorAll(".md, .Post, .Comment"));
    log_debug("Processing", posts.length, "initial posts");
    for(var i = 0; i < posts.length; i++) {
        process_post(store, posts[i], posts[i], expand_emotes);
    }

    // Add emote click blocker
    document.body.addEventListener("click", catch_errors(function(event) {
        block_click(store, event);
    }), false);

    // As a relevant note, it's a terrible idea to set this up before
    // the DOM is built, because monitoring it for changes seems to slow
    // the process down horribly.

    // What we do here: for each mutation, inspect every .md we can
    // find- whether the node in question is deep within one, or contains
    // some.
    observe_document(function(nodes) {
        for(var n = 0; n < nodes.length; n++) {
            var root = nodes[n];
            if(root.nodeType !== find_global("Node").ELEMENT_NODE) {
                // Not interested in other kinds of nodes.
                continue;
            }

            var md;
            if(md = class_above(root, "md")) {
                // We're inside of a post- so only handle links underneath here
                process_post(store, root, md, expand_emotes);
            } else {
                // Are there any posts below us?
                var posts = slice(root.querySelectorAll(".md, .Post, .Comment"));
                if(posts.length) {
                    log_debug("Processing", posts.length, "new posts");
                    for(var p = 0; p < posts.length; p++) {
                        process_post(store, posts[p], posts[p], expand_emotes);
                    }
                }
            }

            // TODO: move up in case we're inside it?
            if (is_reddit) {
                var usertext_edits = slice(root.getElementsByClassName("usertext-edit"));
            } else if (is_modreddit) {
                if (ends_with(document.location.pathname, "create")) {
                    var usertext_edits = slice(root.getElementsByClassName("NewThread__form"));
                } else {
                    var usertext_edits = slice(root.getElementsByClassName("ThreadViewer__replyContainer"));
                }
            } else if (is_voat) {
                var usertext_edits = slice(root.getElementsByClassName("markdownEditor"));
            }
            inject_emotes_button(store, usertext_edits);
        }
    });
}

function reddit_main(store) {
    log_info("Running on Reddit");

    init_css(store);
    _checkpoint("css");

    with_dom(function() {
        inject_buttons(store); // Try to do this early
        var expand_emotes = !is_blacklisted(store);
        if(!expand_emotes) {
            log_info("Disabling emote expansion on blacklisted subreddit /r/" + current_subreddit)
        }
        run_reddit(store, expand_emotes);
        _checkpoint("done");
    });
}
