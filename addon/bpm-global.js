/*
 * A fairly reliable indicator as to whether or not BPM is currently
 * running in a frame.
 */
// Firefox is funny about window/.self/.parent/.top, such that comparing
// references is unreliable. frameElement is the only test I've found so
// far that works consistently.
var running_in_frame = (window !== window.top || window.frameElement);

// As a note, this regexp is a little forgiving in some respects and strict in
// others. It will not permit text in the [] portion, but alt-text quotes don't
// have to match each other.
//
//                        <   emote      >   <    alt-text     >
var emote_regexp = /\[\]\((\/[\w:!#\/\-]+)\s*(?:["']([^"]*)["'])?\)/g;

// this!==window on Opera, and doesn't have this object for some reason
var Node = find_global("Node");

function preserve_scroll(node, callback) {
    // Move up through the DOM and see if there's a container element that
    // scrolls, so we can keep track of how the size of its contents change.
    // Also, this is really expensive.
    var container = locate_matching_ancestor(node, function(element) {
        var style = window.getComputedStyle(element);
        if(style && (style.overflowY === "auto" || style.overflowY === "scroll")) {
            return true;
        } else {
            return false;
        }
    });

    if(container) {
        var top = container.scrollTop;
        var height = container.scrollHeight;
        // visible height + amount hidden > total height
        // + 1 just for a bit of safety
        var at_bottom = (container.clientHeight + top + 1 >= height);
    }

    callback();

    // If the parent element has gotten higher due to our emotes, and it was at
    // the bottom before, scroll it down by the delta.
    if(container && at_bottom && top && container.scrollHeight > height) {
        var delta = container.scrollHeight - height;
        container.scrollTop = container.scrollTop + delta;
    }
}

/*
 * Searches elements recursively for [](/emotes), and converts them.
 */
function process_text(store, root) {
    // List of nodes to delete. Would probably not work well to remove nodes
    // while walking the DOM
    var deletion_list = [];

    var nodes_processed = 0;
    var emotes_matched = 0;

    walk_dom(root, Node.TEXT_NODE, function(node) {
        nodes_processed++;

        var parent = node.parentNode;
        // <span> elements to apply alt-text to
        var emote_elements = [];
        emote_regexp.lastIndex = 0;

        var new_elements = [];
        var end_of_prev = 0; // End index of previous emote match
        var match;

        // Locate every emote we can in this text node. Each time through,
        // append the text before it and our new emote node to new_elements.
        while(match = emote_regexp.exec(node.data)) {
            emotes_matched++;

            // Don't normalize case for emote lookup
            var parts = match[1].split("-");
            var emote_name = parts[0];
            var emote_info = store.lookup_emote(emote_name, false);

            if(emote_info === null) {
                continue;
            }

            if(store.is_disabled(emote_info)) {
                continue;
            }

            // Keep text between the last emote and this one (or the start
            // of the text element)
            var before_text = node.data.slice(end_of_prev, match.index);
            if(before_text) {
                new_elements.push(document.createTextNode(before_text));
            }

            // Build emote. (Global emotes are always -in)
            var element = document.createElement("span");
            element.classList.add("bpflag-in");
            element.classList.add("bpm-emote");
            element.classList.add(emote_info.css_class);
            // Some things for alt-text. The .href is a bit of a lie,
            // but necessary to keep spoiler emotes reasonably sane.
            element.setAttribute("href", match[1]);
            element.setAttribute("data-bpm_state", "e");
            element.setAttribute("data-bpm_emotename", emote_name);
            element.setAttribute("data-bpm_srname", emote_info.source_name);
            new_elements.push(element);
            emote_elements.push(element);

            add_flags(element, parts);

            if(match[2]) {
                // Alt-text. (Quotes aren't captured by the regexp)
                element.title = match[2];
            }

            // Next text element will start after this emote
            end_of_prev = match.index + match[0].length;
        }

        // If length == 0, then there were no emote matches to begin with,
        // and we should just leave it alone
        if(new_elements.length) {
            // There were emotes, so grab the last bit of text at the end too
            var end_text = node.data.slice(end_of_prev);
            if(end_text) {
                new_elements.push(document.createTextNode(end_text));
            }

            preserve_scroll(parent, function() {
                // Insert all our new nodes
                for(var i = 0; i < new_elements.length; i++) {
                    parent.insertBefore(new_elements[i], node);
                }

                // Remove original text node. FIXME: since we delay this, are we
                // affecting the scroll-fixing code by resizing stuff later?
                deletion_list.push(node);

                // Convert alt text and such. We want to do this after we insert
                // our new nodes (so that the alt-text element goes to the right
                // place) but before we rescroll.
                if(store.prefs.showAltText) {
                    for(var i = 0; i < emote_elements.length; i++) {
                        process_alt_text(emote_elements[i]);
                    }
                }
            });
        }
    }, function() {
        // Code run after the entire tree has been walked- delete the text
        // nodes that we deferred
        if(nodes_processed) {
            log_debug("Processed", nodes_processed, "node(s) and matched", emotes_matched, "emote(s)");
        }
        for(var i = 0; i < deletion_list.length; i++) {
            var node = deletion_list[i];
            node.parentNode.removeChild(node);
        }
    });
}

/*
 * Main function when running globally.
 */
function run_global(store) {
    if(store.prefs.enableGlobalSearch) {
        // Never inject the search box into frames. Too many sites fuck up
        // entirely if we do. Instead, we do some cross-frame communication.
        if(running_in_frame) {
            init_frame_search(store);
        } else {
            init_search_box(store);
            setup_global_icon(store);
        }
    }

    process_text(store, document.body);

    observe_document(function(nodes) {
        for(var i = 0; i < nodes.length; i++) {
            if(nodes[i].nodeType !== Node.ELEMENT_NODE) {
                // Not interested in other kinds of nodes.
                // FIXME: this makes no sense
                continue;
            }
            process_text(store, nodes[i]);
        }
    });
}

function global_main(store) {
    if(!store.prefs.enableGlobalEmotes) {
        return;
    }

    // Check against domain blacklist
    for(var i = 0; i < DOMAIN_BLACKLIST.length; i++) {
        if(DOMAIN_BLACKLIST[i] === document.location.host) {
            log_warning("Refusing to run on '" + document.location.host + "': domain is blacklisted (probably broken)");
            return;
        }
    }

    log_info("Running globally");

    init_css(store);

    with_dom(function() {
        run_global(store);
    });
}
