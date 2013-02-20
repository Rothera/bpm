/*
 * Parses a search query. Returns an object that looks like this:
 *    .sr_term_sets: list of [true/false, term] subreddit names to match.
 *    .tag_term_sets: list of [true/false, tags ...] tag sets to match.
 *    .name_terms: list of emote name terms to match.
 * or null, if there was no query.
 */
function parse_search_query(terms) {
    var query = {sr_term_sets: [], tag_term_sets: [], name_terms: []};

    /*
     * Adds a list of matching ids as one term. Cancels out earlier
     * opposites where appropriate.
     */
    function add_cancelable_id_list(sets, positive, ids) {
        // Search from right to left, looking for sets of an opposite type
        for(var set_i = sets.length - 1; set_i >= 0; set_i--) {
            var set = sets[set_i];
            if(set[0] !== positive) {
                // Look for matching ids, and remove them
                for(var id_i = ids.length - 1; id_i >= 0; id_i--) {
                    var index = set.indexOf(ids[id_i]);
                    if(index > -1) {
                        // When a tag and an antitag collide...
                        set.splice(index, 1);
                        ids.splice(id_i, 1);
                        // It makes a great big mess of my search code is what
                    }
                }
                // This set was cancelled out completely, so remove it
                if(set.length <= 1) {
                    sets.splice(set_i, 1);
                }
            }
        }
        // If there's still anything left, add this new set
        if(ids.length) {
            ids.unshift(positive);
            sets.push(ids);
        }
    }

    /*
     * Adds an id set term, by either adding it exactly or adding all
     * matching tags.
     */
    function add_id_set(sets, name2id, positive, exact, query) {
        var id = name2id[exact];
        if(id) {
            add_cancelable_id_list(sets, positive, [id]); // Exact name match
        } else {
            // Search through all tags for one that looks like the term.
            var matches = [];
            for(var name in name2id) {
                id = name2id[name];
                if(name.indexOf(query) > -1 && matches.indexOf(id) < 0) {
                    matches.push(id);
                }
            }
            // If we found anything at all, append it
            if(matches.length) {
                add_cancelable_id_list(sets, positive, matches);
            }
        }
    }

    // Parse query
    for(var t = 0; t < terms.length; t++) {
        var term = terms[t];
        var is_tag = false; // Whether it started with "+"/"-" (which could actually be a subreddit!!)
        var positive = true;
        if(term[0] === "+" || term[0] === "-") {
            // It's a thing that can be negated, which means either subreddit
            // or a tag.
            is_tag = true;
            positive = term[0] === "+";
            term = term.slice(1);
            if(!term) {
                continue;
            }
        }
        if(term.slice(0, 3) === "sr:") {
            if(term.length > 3) {
                // Chop off sr:
                add_id_set(query.sr_term_sets, sr_name2id, positive, term.slice(3), term.slice(3));
            }
        } else if(term.slice(0, 2) === "r/") {
            if(term.length > 2) {
                // Leave the r/ on
                add_id_set(query.sr_term_sets, sr_name2id, positive, term, term);
            }
        } else if(is_tag) {
            // A tag-like thing that isn't a subreddit = tag term
            add_id_set(query.tag_term_sets, tag_name2id, positive, "+" + term, term);
        } else {
            query.name_terms.push(term); // Anything else
        }
    }

    if(query.sr_term_sets.length || query.tag_term_sets.length || query.name_terms.length) {
        return query;
    } else {
        return null;
    }
}

/*
 * Executes a search query. Returns an object with two properties:
 *    .results: a sorted list of emotes
 */
function execute_search(store, query) {
    var results = [];
    no_match:
    for(var emote_name in emote_map) {
        var emote_info = store.lookup_core_emote(emote_name);
        var lc_emote_name = emote_name.toLowerCase();

        // Match if ALL search terms match
        for(var nt_i = 0; nt_i < query.name_terms.length; nt_i++) {
            if(lc_emote_name.indexOf(query.name_terms[nt_i]) < 0) {
                continue no_match; // outer loop, not inner
            }
        }

        // Match if AT LEAST ONE positive subreddit term matches, and NONE
        // of the negative ones.
        if(query.sr_term_sets.length) {
            var is_match = true; // Match by default, unless there are positive terms
            for(var sr_set_i = 0; sr_set_i < query.sr_term_sets.length; sr_set_i++) {
                var sr_set = query.sr_term_sets[sr_set_i];
                if(sr_set[0]) {
                    // If there are any positive terms, then we're wrong
                    // by default. We have to match one of them (just not
                    // any of the negative ones either).
                    //
                    // However, if there are *only* negative terms, then we
                    // actually match by default.
                    is_match = false;
                }
                // sr_set[0] is true/false and so can't interfere
                if(sr_set.indexOf(emote_info.source_id) > -1) {
                    if(sr_set[0]) {
                        is_match = true; // Matched positive term
                        break;
                    } else {
                        continue no_match; // Matched negative term
                    }
                }
            }
            if(!is_match) {
                continue no_match;
            }
        }

        // Match if ALL tag sets match
        for(var tt_i = query.tag_term_sets.length - 1; tt_i >= 0; tt_i--) {
            // Match if AT LEAST ONE of these match
            var tag_set = query.tag_term_sets[tt_i];

            var any = false;
            for(var ts_i = 1; ts_i < tag_set.length; ts_i++) {
                if(emote_info.tags.indexOf(tag_set[ts_i]) > -1) {
                    any = true;
                    break;
                }
            }
            // We either didn't match, and wanted to, or matched and didn't
            // want to.
            if(any !== tag_set[0]) {
                continue no_match;
            }
        }

        // At this point we have a match, so follow back to its base
        if(emote_name !== emote_info.base) {
            // Hunt down the non-variant version
            emote_info = store.lookup_core_emote(emote_info.base);
            if(emote_info.name !== emote_info.base) {
                log_warning("Followed +v from " + emote_name + " to " + emote_info.name + "; no root emote found");
            }
            emote_name = emote_info.name;
        }

        results.push(emote_info);
    }

    results.sort(function(a, b) {
        if(a.name < b.name) {
            return -1;
        } else if(a.name > b.name) {
            return 1;
        } else {
            return 0;
        }
    });

    return results;
}

/*
 * Injects an emote into the given form.
 */
function inject_emote_into_form(store, target_form, emote_name) {
    log_debug("Injecting ", emote_name, "into", target_form);
    var emote_info = store.lookup_core_emote(emote_name);
    var formatting_id = tag_name2id["+formatting"];

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
            if(emote_info.tags.indexOf(formatting_id) > -1) {
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

// Search box elements
var sb_container = null;
var sb_dragbox = null;
var sb_input = null;
var sb_resultinfo = null;
var sb_close = null;
var sb_tabframe = null;
var sb_results = null;
var sb_helptab = null;
var sb_helplink = null;
var sb_optionslink = null;
var sb_resize = null;
var sb_global_icon = null; // Global << thing

var sb_firstrun = false; // Whether or not we've made any search at all yet
var current_sb_tab = null;

/*
 * Sets up the search box for use on a page, either Reddit or the top-level
 * frame, globally.
 */
function init_search_box(store) {
    log_debug("Initializing search box");
    inject_search_box();
    init_search_ui(store);
}

/*
 * Sets up search for use in a frame. No search box is generated, but it
 * listens for postMessage() calls from the parent frame.
 */
function init_frame_search(store) {
    log_debug("Setting frame message hook");
    window.addEventListener("message", catch_errors(function(event) {
        // Not worried about event source (it might be null in Firefox, as
        // a note). Both of these methods are quite harmless, so it's
        // probably ok to let them be publically abusable.
        //
        // I'm not sure how else we can do it, anyway- possibly by going
        // through the backend, but not in userscripts. (Maybe we can abuse
        // GM_setValue().)
        var message = event.data;
        switch(message.__betterponymotes_method) {
            case "__bpm_inject_emote":
                // Call toString() just in case
                inject_emote(store, message.__betterponymotes_emote.toString());
                break;

            case "__bpm_track_form":
                grab_target_form();
                break;

            // If it's not our message, it'll be undefined. (We don't care.)
        }
    }), false);
}

/*
 * Builds and injects the search box HTML.
 */
function inject_search_box() {
    // Placeholder div to create HTML in
    var div = document.createElement("div");
    // I'd sort of prefer display:none, but then I'd have to override it
    div.style.visibility = "hidden";
    div.id = "bpm-stuff"; // Just so it's easier to find in an elements list

    var html = [
        // tabindex is hack to make Esc work. Reddit uses this index in a couple
        // of places, so probably safe.
        '<div id="bpm-sb-container" tabindex="100">',
          '<div id="bpm-sb-toprow">',
            '<span id="bpm-sb-dragbox"></span>',
            '<input id="bpm-sb-input" type="search" placeholder="Search"/>',
            '<span id="bpm-sb-resultinfo"></span>',
            '<span id="bpm-sb-close"></span>',
          '</div>',
          '<div id="bpm-sb-tabframe">',
            '<div id="bpm-sb-results"></div>',
            '<div id="bpm-sb-helptab">',
              '<p class="bpm-sb-help">Simple search terms will show you ',
                'emotes with names that match: for instance, <code>"aj"',
                '</code> will find all emotes with <code>"aj"</code> in ',
                'their names. If you use more than one term, all of them ',
                'must match to return an emote.</p>',
              '<p class="bpm-sb-help">You can filter by subreddit with the ',
                'special syntaxes <code>"r/subreddit"</code> and <code>"sr:',
                'subreddit"</code>. Using more than one such filter returns ',
                'results from each of them.</p>',
              '<p class="bpm-sb-help">All emotes are tagged according to ',
                'their contents, and these can be searched on like <code>',
                '"+twilightsparkle"</code>. Most show characters have their ',
                'own tags that can be easily guessed, and some classes of ',
                '"themed" emotes also have tags. You can also negate tags ',
                'with <code>"-fluttershy"</code> to remove emotes from the ',
                'results.</p>',
              '<p class="bpm-sb-help">Some emotes are hidden by default. ',
                'Use <code>"+nonpony"</code> to see them.</p>',
            '</div>',
          '</div>',
          '<div id="bpm-sb-bottomrow">',
            '<a id="bpm-sb-helplink" href="javascript:void(0)">help</a> | ',
            '<a id="bpm-sb-optionslink" href="javascript:void(0)">bpm options</a>',
            '<span id="bpm-sb-resize"></span>',
          '</div>',
        '</div>',
        '<div id="bpm-global-icon" title="Hold Ctrl (Command/Meta) to drag"></div>'
        ].join("");
    div.innerHTML = html;
    document.body.appendChild(div);

    // This seems to me a rather lousy way to build HTML, but oh well
    sb_container = document.getElementById("bpm-sb-container");
    sb_dragbox = document.getElementById("bpm-sb-dragbox");
    sb_input = document.getElementById("bpm-sb-input");
    sb_resultinfo = document.getElementById("bpm-sb-resultinfo");
    sb_close = document.getElementById("bpm-sb-close");
    sb_tabframe = document.getElementById("bpm-sb-tabframe");
    sb_results = document.getElementById("bpm-sb-results");
    sb_helptab = document.getElementById("bpm-sb-helptab");
    sb_helplink = document.getElementById("bpm-sb-helplink");
    sb_optionslink = document.getElementById("bpm-sb-optionslink");
    sb_resize = document.getElementById("bpm-sb-resize");

    sb_global_icon = document.getElementById("bpm-global-icon");
}

/*
 * Sets up the emote search box.
 */
function init_search_ui(store) {
    current_sb_tab = sb_results;

    /*
     * Intercept mouseover for the entire search widget, so we can remember
     * which form was being used before.
     */
    sb_container.addEventListener("mouseover", catch_errors(function(event) {
        grab_target_form();
    }), false);

    // Close it on demand
    sb_close.addEventListener("click", catch_errors(function(event) {
        hide_search_box();
    }), false);

    // Another way to close it
    sb_container.addEventListener("keyup", catch_errors(function(event) {
        if(event.keyCode === 27) { // Escape key
            hide_search_box();
        }
    }), false);

    // Default behavior of the escape key in the search input is to clear
    // it, which we don't want.
    sb_input.addEventListener("keydown", catch_errors(function(event) {
        if(event.keyCode === 27) { // Escape key
            event.preventDefault();
        }
    }), false);

    // Listen for keypresses and adjust search results. Delay 500ms after
    // end of typing to make it more responsive.
    var timeout = null;
    sb_input.addEventListener("input", catch_errors(function(event) {
        if(timeout !== null) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(catch_errors(function() {
            // Re-enable searching as early as we can, just in case
            timeout = null;
            update_search_results(store);
        }), 500);
    }), false);

    // Listen for clicks
    sb_results.addEventListener("click", catch_errors(function(event) {
        if(event.target.classList.contains("bpm-search-result")) {
            // .dataset would probably be nicer, but just in case...
            var emote_name = event.target.getAttribute("data-emote");
            inject_emote(store, emote_name);
        }
    }), false);

    // Listen for the "help" tab link
    sb_helplink.addEventListener("click", catch_errors(function(event) {
        if(current_sb_tab !== sb_helptab) {
            switch_to_sb_tab(sb_helptab);
        } else {
            switch_to_sb_tab(sb_results);
        }
    }), false);

    // Set up the options page link
    linkify_options(sb_optionslink);

    // Focusing input switches to results tab
    sb_input.addEventListener("focus", catch_errors(function(event) {
        switch_to_sb_tab(sb_results);
    }), false);

    // Set up default positions
    sb_container.style.left = store.prefs.searchBoxInfo[0] + "px";
    sb_container.style.top = store.prefs.searchBoxInfo[1] + "px";
    sb_container.style.width = store.prefs.searchBoxInfo[2] + "px";
    sb_container.style.height = store.prefs.searchBoxInfo[3] + "px";
    // 62 is a magic value from the CSS.
    sb_tabframe.style.height = (store.prefs.searchBoxInfo[3] - 62) + "px";
    sb_global_icon.style.left = store.prefs.globalIconPos[0] + "px";
    sb_global_icon.style.top = store.prefs.globalIconPos[1] + "px";

    // Enable dragging the window around
    make_movable(sb_dragbox, sb_container, function(event, left, top, move) {
        move();
        store.prefs.searchBoxInfo[0] = left;
        store.prefs.searchBoxInfo[1] = top;
        store.sync_key("searchBoxInfo");
    });

    // Enable dragging the resize element around (i.e. resizing it)
    var search_box_width, search_box_height;
    enable_drag(sb_resize, function(event) {
        search_box_width = parseInt(sb_container.style.width, 10);
        search_box_height = parseInt(sb_container.style.height, 10);
    }, function(event, dx, dy) {
        // 420px wide prevents the search box from collapsing too much, and
        // the extra 5px is to prevent the results div from vanishing (which
        // sometimes kills Opera),
        var sb_width = Math.max(dx + search_box_width, 420);
        var sb_height = Math.max(dy + search_box_height, 62+5);

        sb_container.style.width = sb_width + "px";
        sb_container.style.height = sb_height + "px";
        sb_tabframe.style.height = (sb_height - 62) + "px";

        store.prefs.searchBoxInfo[2] = sb_width;
        store.prefs.searchBoxInfo[3] = sb_height;
        store.sync_key("searchBoxInfo");
    });
}

/*
 * Displays the search box.
 */
function show_search_box(store) {
    sb_container.style.visibility = "visible";
    sb_input.focus();
    switch_to_sb_tab(sb_results);

    // If we haven't run before, go search for things
    if(!sb_firstrun) {
        sb_firstrun = true;
        sb_input.value = store.prefs.lastSearchQuery;
        update_search_results(store);
    }
}

function hide_search_box() {
    sb_container.style.visibility = "hidden";
    // TODO: possibly clear out the search results, since it's a large pile
    // of HTML.
    if(target_form) {
        target_form.focus();
    }
}

function switch_to_sb_tab(tab) {
    var tabs = [sb_results, sb_helptab];
    for(var i = 0; i < tabs.length; i++) {
        tabs[i].style.display = "none";
    }
    tab.style.display = "block";
    current_sb_tab = tab;
}

/*
 * Previously focused elements. Only one of these can be non-null.
 */
var target_form = null;
var target_frame = null;

/*
 * Caches the currently focused element, if it's something we can inject
 * emotes into.
 */
function grab_target_form() {
    var active = document.activeElement;

    while(active.tagName === "IFRAME") {
        // Focus is within the frame. Find the real element (recursing just
        // in case).
        if(active.contentWindow === null || active.contentWindow === undefined) {
            // Chrome is broken and does not permit us to access these
            // from content scripts.
            target_form = null;
            target_frame = active;

            message_iframe(active, {
                "__betterponymotes_method": "__bpm_track_form"
            });
            return;
        }

        try {
            active = active.contentDocument.activeElement;
        } catch(e) {
            // Addon SDK is broken
            message_iframe(active, {
                "__betterponymotes_method": "__bpm_track_form"
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
 * Injects an emote into the currently focused element, taking frames into
 * account.
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

/*
 * Updates the search results window according to the current query.
 */
function update_search_results(store) {
    // Split search query on spaces, remove empty strings, and lowercase terms
    var terms = sb_input.value.split(" ").map(function(v) { return v.toLowerCase(); });
    terms = terms.filter(function(v) { return v; });
    store.prefs.lastSearchQuery = terms.join(" ");
    store.sync_key("lastSearchQuery");

    // Check this before we append the default search terms.
    if(!terms.length) {
        sb_results.innerHTML = "";
        sb_resultinfo.textContent = "";
        return;
    }

    // This doesn't work quite perfectly- searching for "+hidden" should
    // theoretically just show all hidden emotes, but it just ends up
    // cancelling into "-nonpony", searching for everything.
    terms.unshift("-hidden", "-nonpony");
    var query = parse_search_query(terms);
    // Still nothing to do
    if(query === null) {
        sb_results.innerHTML = "";
        sb_resultinfo.textContent = "";
        return;
    }

    var results = execute_search(store, query);
    log_debug("Search found", results.length, "results on query", query);
    display_search_results(store, results);
}

/*
 * Converts search results to HTML and displays them.
 */
function display_search_results(store, results) {
    // We go through all of the results regardless of search limit (as that
    // doesn't take very long), but stop building HTML when we reach enough
    // shown emotes.
    //
    // As a result, NSFW/disabled emotes don't count toward the result.
    var html = "";
    var shown = 0;
    var hidden = 0;
    var prev = null;
    var actual_results = results.length;
    var formatting_id = tag_name2id["+formatting"];
    for(var i = 0; i < results.length; i++) {
        var result = results[i];
        if(prev === result.name) {
            actual_results--;
            continue; // Duplicates can appear when following +v emotes
        }
        prev = result.name;

        if(store.is_disabled(result)) {
            // TODO: enable it anyway if a pref is set? Dunno exactly what
            // we'd do
            hidden += 1;
            continue;
        }

        if(shown >= store.prefs.searchLimit) {
            continue;
        } else {
            shown += 1;
        }

        // Use <span> so there's no chance of emote parse code finding
        // this.
        html += "<span data-emote=\"" + result.name + "\" class=\"bpm-search-result " +
                result.css_class + "\" title=\"" + result.name + " from " + result.source_name + "\">";
        if(result.tags.indexOf(formatting_id) > -1) {
            html += "Example Text";
        }
        html += "</span>";
    }

    sb_results.innerHTML = html;

    var hit_limit = shown + hidden < actual_results;
    // Format text: "X results (out of N, Y hidden)"
    var text = shown + " results";
    if(hit_limit || hidden) { text += " ("; }
    if(hit_limit)           { text += "out of " + actual_results; }
    if(hit_limit && hidden) { text += ", "; }
    if(hidden)              { text += hidden + " hidden"; }
    if(hit_limit || hidden) { text += ")"; }
    sb_resultinfo.textContent = text;
}

/*
 * Injects the "emotes" button onto Reddit.
 */
function inject_emotes_button(store, usertext_edits) {
    for(var i = 0; i < usertext_edits.length; i++) {
        var existing = usertext_edits[i].getElementsByClassName("bpm-search-toggle");
        var textarea = usertext_edits[i].getElementsByTagName("textarea")[0];
        /*
         * Reddit's JS uses cloneNode() when making reply forms. As such,
         * we need to be able to handle two distinct cases- wiring up the
         * top-level reply box that's there from the start, and wiring up
         * clones of that form with our button already in it.
         */
        if(existing.length) {
            wire_emotes_button(store, existing[0], textarea);
        } else {
            var button = document.createElement("button");
            // Default is "submit", which is not good (saves the comment).
            // Safari has some extremely weird bug where button.type
            // seems to be readonly. Writes fail silently.
            button.setAttribute("type", "button");
            button.classList.add("bpm-search-toggle");
            button.textContent = "emotes";
            // Since we come before the save button in the DOM, we tab
            // first, but this is generally annoying. Correcting this
            // ideally would require either moving, or editing the save
            // button, which I'd rather not do.
            //
            // So instead it's just untabbable.
            button.tabIndex = 100;
            wire_emotes_button(store, button, textarea);
            // Put it at the end- Reddit's JS uses get(0) when looking for
            // elements related to the "formatting help" linky, and we don't
            // want to get in the way of that.
            var help_toggle = usertext_edits[i].getElementsByClassName("help-toggle");
            help_toggle[0].appendChild(button);
        }
    }
}

/*
 * Sets up one particular "emotes" button.
 */
function wire_emotes_button(store, button, textarea) {
    button.addEventListener("mouseover", catch_errors(function(event) {
        grab_target_form();
    }), false);

    button.addEventListener("click", catch_errors(function(event) {
        var sb_element = document.getElementById("bpm-sb-container");
        if(sb_element.style.visibility !== "visible") {
            show_search_box(store);
            if(!target_form) {
                target_form = textarea;
            }
        } else {
            hide_search_box();
        }
    }), false);
}

/*
 * Sets up the global ">>" emotes icon.
 */
function setup_global_icon(store) {
    log_debug("Injecting global search icon");
    sb_global_icon.addEventListener("mouseover", catch_errors(function(event) {
        grab_target_form();
    }), false);

    // Enable dragging the global button around
    make_movable(sb_global_icon, sb_global_icon, function(event, left, top, move) {
        if(!event.ctrlKey && !event.metaKey) {
            return;
        }
        move();
        store.prefs.globalIconPos[0] = left;
        store.prefs.globalIconPos[1] = top;
        store.sync_key("globalIconPos");
    });

    sb_global_icon.style.visibility = "visible";

    sb_global_icon.addEventListener("click", catch_errors(function(event) {
        // Don't open at the end of a drag (only works if you release the
        // mouse button before the ctrl/meta key though...)
        if(!event.ctrlKey && !event.metaKey) {
            show_search_box(store);
        }
    }), false);
}
