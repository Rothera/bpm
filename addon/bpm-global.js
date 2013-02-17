// As a note, this regexp is a little forgiving in some respects and strict in
// others. It will not permit text in the [] portion, but alt-text quotes don't
// have to match each other.
//
//                        <   emote      >   <    alt-text     >
var emote_regexp = /\[\]\((\/[\w:!#\/\-]+)\s*(?:["']([^"]*)["'])?\)/g;

/*
 * Searches elements recursively for [](/emotes), and converts them.
 */
function process_global(prefs, root) {
    // List of nodes to delete. Would probably not work well to remove nodes
    // while walking the DOM
    var deletion_list = [];

    var nodes_processed = 0;
    var emotes_matched = 0;

    // this!==window on Opera, and doesn't have this object for some reason
    walk_dom(root, find_global("Node").TEXT_NODE, function(node) {
        nodes_processed++;

        var parent = node.parentNode;
        // <span> elements to apply alt-text to
        var emote_elements = [];
        emote_regexp.lastIndex = 0;

        var new_elements = [];
        var end_of_prev = 0; // End index of previous emote match
        var match;

        while(match = emote_regexp.exec(node.data)) {
            emotes_matched++;

            // Don't normalize case for emote lookup
            var parts = match[1].split("-");
            var emote_name = parts[0];
            var emote_info = lookup_emote(emote_name, prefs.custom_emotes);

            if(emote_info === null) {
                continue;
            }

            if(is_disabled(prefs, emote_info)) {
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
            element.setAttribute("href", emote_name);
            element.setAttribute("data-bpm_state", "e");
            element.setAttribute("data-bpm_emotename", emote_name);
            element.setAttribute("data-bpm_srname", emote_info.source_name);
            new_elements.push(element);
            emote_elements.push(element);

            // Don't need to do validation on flags, since our matching
            // regexp is strict enough to begin with (although it will
            // match ":", something we don't permit elsewhere).
            for(var p = 1; p < parts.length; p++) {
                var flag = parts[p].toLowerCase();
                element.classList.add("bpflag-" + sanitize_emote(flag));
            }

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
            // Keep track of how the size of the container changes. Also,
            // don't even dream of doing this for every node.
            var scroll_parent = locate_matching_ancestor(parent, function(element) {
                var style = window.getComputedStyle(element);
                if(style && (style.overflowY === "auto" || style.overflowY === "scroll")) {
                    return true;
                } else {
                    return false;
                }
            });

            var scroll_top, scroll_height, at_bottom;
            if(scroll_parent) {
                scroll_top = scroll_parent.scrollTop;
                scroll_height = scroll_parent.scrollHeight;
                // visible height + amount hidden > total height
                // + 1 just for a bit of safety
                at_bottom = (scroll_parent.clientHeight + scroll_top + 1 >= scroll_height);
            }

            // There were emotes, so grab the last bit of text at the end
            var end_text = node.data.slice(end_of_prev);
            if(end_text) {
                new_elements.push(document.createTextNode(end_text));
            }

            // Insert all our new nodes
            for(var i = 0; i < new_elements.length; i++) {
                parent.insertBefore(new_elements[i], node);
            }

            // Remove original text node
            deletion_list.push(node);

            // Convert alt text and such. We want to do this after we insert
            // our new nodes (so that the alt-text element goes to the right
            // place) but before we rescroll.
            if(prefs.prefs.showAltText) {
                display_alt_text(emote_elements);
            }

            // If the parent element has gotten higher due to our emotes,
            // and it was at the bottom before, scroll it down by the delta.
            if(scroll_parent && at_bottom && scroll_top && scroll_parent.scrollHeight > scroll_height) {
                var delta = scroll_parent.scrollHeight - scroll_height;
                scroll_parent.scrollTop = scroll_parent.scrollTop + delta;
            }
        }
    }, function() {
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
function run_global(prefs) {
    if(!prefs.prefs.enableGlobalEmotes) {
        return;
    }
    log_info("Running globally");

    // We run this here, instead of down in the main bit, to avoid applying large
    // chunks of CSS when this script is disabled.
    init_css();

    if(prefs.prefs.enableGlobalSearch) {
        // Never inject the search box into frames. Too many sites fuck up
        // entirely if we do. Instead, we do some cross-frame communication.
        if(running_in_frame) {
            init_frame(prefs);
        } else {
            init(prefs);
            setup_global_icon(prefs);
        }
    }

    process_global(prefs, document.body);

    observe_document(function(nodes) {
        for(var i = 0; i < nodes.length; i++) {
            if(nodes[i].nodeType !== find_global("Node").ELEMENT_NODE) {
                // Not really interested in other kinds.
                continue;
            }
            process_global(prefs, nodes[i]);
        }
    });
}
