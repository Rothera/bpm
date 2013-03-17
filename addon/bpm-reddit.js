/*
 * Injects a sneaky little link at the bottom of each Reddit page that
 * displays the logs.
 */
function inject_log_button() {
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

function toggle_emote(store, element) {
    // Click toggle
    var state = element.getAttribute("data-bpm_state") || "";
    var is_nsfw_disabled = state.indexOf("1") > -1; // NSFW
    if(store.prefs.clickToggleSFW && is_nsfw_disabled) {
        return;
    }
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
            element.textContent = info.name;
        }
        strip_flags(element);
    }
}

function block_click(store, event) {
    var element = event.target;
    if(element.classList.contains("bpm-emote") || element.classList.contains("bpm-unknown")) {
        event.preventDefault();
    }

    if(element.classList.contains("bpm-emote")) {
        toggle_emote(store, element);
    }
}

/*
 * Main function when running on Reddit.
 */
function run_reddit(store) {
    init_search_box(store);
    var usertext_edits = slice(document.getElementsByClassName("usertext-edit"));
    inject_emotes_button(store, usertext_edits);

    // Initial pass- show all emotes currently on the page.
    var posts = slice(document.getElementsByClassName("md"));
    log_debug("Processing", posts.length, "initial posts");
    for(var i = 0; i < posts.length; i++) {
        process_post(store, posts[i], posts[i]);
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
        for(var i = 0; i < nodes.length; i++) {
            var root = nodes[i];
            if(root.nodeType !== find_global("Node").ELEMENT_NODE) {
                // Not interested in other kinds of nodes.
                continue;
            }

            var md;
            if(md = class_above(root, "md")) {
                // We're inside of a post- so only handle links underneath here
                process_post(store, root, md);
            } else {
                // Are there any posts below us?
                var posts = slice(root.getElementsByClassName("md"));
                if(posts.length) {
                    log_debug("Processing", posts.length, "new posts");
                    for(var i = 0; i < posts.length; i++) {
                        process_post(store, posts[i], posts[i]);
                    }
                }
            }

            // TODO: move up in case we're inside it?
            var usertext_edits = slice(root.getElementsByClassName("usertext-edit"));
            inject_emotes_button(store, usertext_edits);
        }
    });
}

function reddit_main(store) {
    log_info("Running on Reddit");

    init_css(store);

    with_dom(function() {
        inject_log_button(); // Try to do this early
        run_reddit(store);
    });
}
