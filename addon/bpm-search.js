/*
 * Emote search stuff not directly tied to the search box.
 */
var bpm_search = bpm_exports.search = {
    /*
     * Parses a search query. Returns an object that looks like this:
     *    .sr_term_sets: list of [true/false, term] subreddit names to match.
     *    .tag_term_sets: list of [true/false, tags ...] tag sets to match.
     *    .name_terms: list of emote name terms to match.
     * or null, if there was no query.
     */
    parse_query: function(terms) {
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
    },

    /*
     * Executes a search query. Returns an object with two properties:
     *    .results: a sorted list of emotes
     */
    search: function(query) {
        var results = [];
        no_match:
        for(var emote_name in emote_map) {
            var emote_info = bpm_data.lookup_core_emote(emote_name);
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
                emote_info = bpm_data.lookup_core_emote(emote_info.base);
                if(emote_info.name !== emote_info.base) {
                    bpm_warning("Followed +v from " + emote_name + " to " + emote_info.name + "; no root emote found");
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
    },

    /*
     * Injects an emote into the given form.
     */
    inject_emote: function(target_form, emote_name) {
        bpm_debug("Injecting ", emote_name, "into", target_form);
        var emote_info = bpm_data.lookup_core_emote(emote_name);
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
};

/*
 * Search box.
 */
var bpm_searchbox = bpm_exports.searchbox = {
    // Search box elements
    sb_container: null,
    sb_dragbox: null,
    sb_input: null,
    sb_resultinfo: null,
    sb_close: null,
    sb_tabframe: null,
    sb_results: null,
    sb_helptab: null,
    sb_helplink: null,
    sb_optionslink: null,
    sb_resize: null,
    sb_global_icon: null, // Global << thing
    firstrun: false, // Whether or not we've made any search at all yet
    current_tab: null,

    /*
     * Sets up the search box for use on a page, either Reddit or the top-level
     * frame, globally.
     */
    init: function(prefs) {
        bpm_debug("Initializing search box");
        this.inject_html();
        this.init_search_box(prefs);
    },

    /*
     * Sets up search for use in a frame. No search box is generated, but it
     * listens for postMessage() calls from the parent frame.
     */
    init_frame: function(prefs) {
        bpm_debug("Setting frame message hook");
        window.addEventListener("message", bpm_utils.catch_errors(function(event) {
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
                    this.inject_emote(message.__betterponymotes_emote.toString());
                    break;

                case "__bpm_track_form":
                    this.grab_target_form();
                    break;

                // If it's not our message, it'll be undefined. (We don't care.)
            }
        }.bind(this)), false);
    },

    /*
     * Builds and injects the search box HTML.
     */
    inject_html: function() {
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
        this.sb_container = document.getElementById("bpm-sb-container");
        this.sb_dragbox = document.getElementById("bpm-sb-dragbox");
        this.sb_input = document.getElementById("bpm-sb-input");
        this.sb_resultinfo = document.getElementById("bpm-sb-resultinfo");
        this.sb_close = document.getElementById("bpm-sb-close");
        this.sb_tabframe = document.getElementById("bpm-sb-tabframe");
        this.sb_results = document.getElementById("bpm-sb-results");
        this.sb_helptab = document.getElementById("bpm-sb-helptab");
        this.sb_helplink = document.getElementById("bpm-sb-helplink");
        this.sb_optionslink = document.getElementById("bpm-sb-optionslink");
        this.sb_resize = document.getElementById("bpm-sb-resize");

        this.sb_global_icon = document.getElementById("bpm-global-icon");
    },

    /*
     * Sets up the emote search box.
     */
    init_search_box: function(prefs) {
        this.current_tab = this.sb_results;

        /*
         * Intercept mouseover for the entire search widget, so we can remember
         * which form was being used before.
         */
        this.sb_container.addEventListener("mouseover", bpm_utils.catch_errors(function(event) {
            this.grab_target_form();
        }.bind(this)), false);

        // Close it on demand
        this.sb_close.addEventListener("click", bpm_utils.catch_errors(function(event) {
            this.hide();
        }.bind(this)), false);

        // Another way to close it
        this.sb_container.addEventListener("keyup", bpm_utils.catch_errors(function(event) {
            if(event.keyCode === 27) { // Escape key
                this.hide();
            }
        }.bind(this)), false);

        // Default behavior of the escape key in the search input is to clear
        // it, which we don't want.
        this.sb_input.addEventListener("keydown", bpm_utils.catch_errors(function(event) {
            if(event.keyCode === 27) { // Escape key
                event.preventDefault();
            }
        }.bind(this)), false);

        // Listen for keypresses and adjust search results. Delay 500ms after
        // end of typing to make it more responsive.
        var timeout = null;
        this.sb_input.addEventListener("input", bpm_utils.catch_errors(function(event) {
            if(timeout !== null) {
                clearTimeout(timeout);
            }
            timeout = setTimeout(bpm_utils.catch_errors(function() {
                // Re-enable searching as early as we can, just in case
                timeout = null;
                this.update_search(prefs);
            }.bind(this)), 500);
        }.bind(this)), false);

        // Listen for clicks
        this.sb_results.addEventListener("click", bpm_utils.catch_errors(function(event) {
            if(event.target.classList.contains("bpm-search-result")) {
                // .dataset would probably be nicer, but just in case...
                var emote_name = event.target.getAttribute("data-emote");
                this.inject_emote(emote_name);
            }
        }.bind(this)), false);

        // Listen for the "help" tab link
        this.sb_helplink.addEventListener("click", bpm_utils.catch_errors(function(event) {
            if(this.current_tab !== this.sb_helptab) {
                this.switch_to_tab(this.sb_helptab);
            } else {
                this.switch_to_tab(this.sb_results);
            }
        }.bind(this)), false);

        // Set up the options page link
        bpm_browser.linkify_options(this.sb_optionslink);

        // Focusing input switches to results tab
        this.sb_input.addEventListener("focus", bpm_utils.catch_errors(function(event) {
            this.switch_to_tab(this.sb_results);
        }.bind(this)), false);

        // Set up default positions
        this.sb_container.style.left = prefs.prefs.searchBoxInfo[0] + "px";
        this.sb_container.style.top = prefs.prefs.searchBoxInfo[1] + "px";
        this.sb_container.style.width = prefs.prefs.searchBoxInfo[2] + "px";
        this.sb_container.style.height = prefs.prefs.searchBoxInfo[3] + "px";
        // 62 is a magic value from the CSS.
        this.sb_tabframe.style.height = (prefs.prefs.searchBoxInfo[3] - 62) + "px";
        this.sb_global_icon.style.left = prefs.prefs.globalIconPos[0] + "px";
        this.sb_global_icon.style.top = prefs.prefs.globalIconPos[1] + "px";

        // Enable dragging the window around
        bpm_dom.make_movable(this.sb_dragbox, this.sb_container, function(event, left, top, move) {
            move();
            prefs.prefs.searchBoxInfo[0] = left;
            prefs.prefs.searchBoxInfo[1] = top;
            bpm_prefs.sync_key("searchBoxInfo");
        });

        // Enable dragging the resize element around (i.e. resizing it)
        var search_box_width, search_box_height;
        bpm_dom.enable_drag(this.sb_resize, function(event) {
            search_box_width = parseInt(this.sb_container.style.width, 10);
            search_box_height = parseInt(this.sb_container.style.height, 10);
        }.bind(this), function(event, dx, dy) {
            // 420px wide prevents the search box from collapsing too much, and
            // the extra 5px is to prevent the results div from vanishing (which
            // sometimes kills Opera),
            var sb_width = Math.max(dx + search_box_width, 420);
            var sb_height = Math.max(dy + search_box_height, 62+5);

            this.sb_container.style.width = sb_width + "px";
            this.sb_container.style.height = sb_height + "px";
            this.sb_tabframe.style.height = (sb_height - 62) + "px";

            prefs.prefs.searchBoxInfo[2] = sb_width;
            prefs.prefs.searchBoxInfo[3] = sb_height;
            bpm_prefs.sync_key("searchBoxInfo");
        }.bind(this));
    },

    /*
     * Displays the search box.
     */
    show: function(prefs) {
        this.sb_container.style.visibility = "visible";
        this.sb_input.focus();
        this.switch_to_tab(this.sb_results);

        // If we haven't run before, go search for things
        if(!this.firstrun) {
            this.firstrun = true;
            this.sb_input.value = prefs.prefs.lastSearchQuery;
            this.update_search(prefs);
        }
    },

    hide: function() {
        this.sb_container.style.visibility = "hidden";
        // TODO: possibly clear out the search results, since it's a large pile
        // of HTML.
        if(this.target_form) {
            this.target_form.focus();
        }
    },

    switch_to_tab: function(tab) {
        var tabs = [this.sb_results, this.sb_helptab];
        for(var i = 0; i < tabs.length; i++) {
            tabs[i].style.display = "none";
        }
        tab.style.display = "block";
        this.current_tab = tab;
    },

    /*
     * Previously focused elements. Only one of these can be non-null.
     */
    target_form: null,
    target_frame: null,

    /*
     * Caches the currently focused element, if it's something we can inject
     * emotes into.
     */
    grab_target_form: function() {
        var active = document.activeElement;

        while(active.tagName === "IFRAME") {
            // Focus is within the frame. Find the real element (recursing just
            // in case).
            if(active.contentWindow === null || active.contentWindow === undefined) {
                // Chrome is broken and does not permit us to access these
                // from content scripts.
                this.target_form = null;
                this.target_frame = active;

                bpm_dom.message_iframe(active, {
                    "__betterponymotes_method": "__bpm_track_form"
                });
                return;
            }

            try {
                active = active.contentDocument.activeElement;
            } catch(e) {
                // Addon SDK is broken
                bpm_dom.message_iframe(active, {
                    "__betterponymotes_method": "__bpm_track_form"
                });

                this.target_form = null;
                this.target_frame = active;
                return;
            }
        }

        // Ignore our own stuff and things that are not text boxes
        if(!bpm_dom.id_above(active, "bpm-stuff") && active !== this.target_form &&
           active.selectionStart !== undefined && active.selectionEnd !== undefined) {
            this.target_form = active;
            this.target_frame = null;
        }
    },

    /*
     * Injects an emote into the currently focused element, taking frames into
     * account.
     */
    inject_emote: function(emote_name) {
        if(this.target_frame !== null) {
            bpm_dom.message_iframe(this.target_frame, {
                "__betterponymotes_method": "__bpm_inject_emote",
                "__betterponymotes_emote": emote_name
            });
        } else if(this.target_form !== null) {
            bpm_search.inject_emote(this.target_form, emote_name);
        }
    },

    /*
     * Updates the search results window according to the current query.
     */
    update_search: function(prefs) {
        // Split search query on spaces, remove empty strings, and lowercase terms
        var terms = this.sb_input.value.split(" ").map(function(v) { return v.toLowerCase(); });
        terms = terms.filter(function(v) { return v; });
        prefs.prefs.lastSearchQuery = terms.join(" ");
        bpm_prefs.sync_key("lastSearchQuery");

        // Check this before we append the default search terms.
        if(!terms.length) {
            this.sb_results.innerHTML = "";
            this.sb_resultinfo.textContent = "";
            return;
        }

        // This doesn't work quite perfectly- searching for "+hidden" should
        // theoretically just show all hidden emotes, but it just ends up
        // cancelling into "-nonpony", searching for everything.
        terms.unshift("-hidden", "-nonpony");
        var query = bpm_search.parse_query(terms);
        // Still nothing to do
        if(query === null) {
            this.sb_results.innerHTML = "";
            this.sb_resultinfo.textContent = "";
            return;
        }

        var results = bpm_search.search(query);
        bpm_debug("Search found", results.length, "results on query", query);
        this.display_results(prefs, results);
    },

    /*
     * Converts search results to HTML and displays them.
     */
    display_results: function(prefs, results) {
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

            if(bpm_data.is_disabled(prefs, result)) {
                // TODO: enable it anyway if a pref is set? Dunno exactly what
                // we'd do
                hidden += 1;
                continue;
            }

            if(shown >= prefs.prefs.searchLimit) {
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

        this.sb_results.innerHTML = html;

        var hit_limit = shown + hidden < actual_results;
        // Format text: "X results (out of N, Y hidden)"
        var text = shown + " results";
        if(hit_limit || hidden) { text += " ("; }
        if(hit_limit)           { text += "out of " + actual_results; }
        if(hit_limit && hidden) { text += ", "; }
        if(hidden)              { text += hidden + " hidden"; }
        if(hit_limit || hidden) { text += ")"; }
        this.sb_resultinfo.textContent = text;
    },

    /*
     * Injects the "emotes" button onto Reddit.
     */
    inject_search_button: function(prefs, usertext_edits) {
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
                this.wire_emotes_button(prefs, existing[0], textarea);
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
                this.wire_emotes_button(prefs, button, textarea);
                // Put it at the end- Reddit's JS uses get(0) when looking for
                // elements related to the "formatting help" linky, and we don't
                // want to get in the way of that.
                var help_toggle = usertext_edits[i].getElementsByClassName("help-toggle");
                help_toggle[0].appendChild(button);
            }
        }
    },

    /*
     * Sets up one particular "emotes" button.
     */
    wire_emotes_button: function(prefs, button, textarea) {
        button.addEventListener("mouseover", bpm_utils.catch_errors(function(event) {
            this.grab_target_form();
        }.bind(this)), false);

        button.addEventListener("click", bpm_utils.catch_errors(function(event) {
            var sb_element = document.getElementById("bpm-sb-container");
            if(sb_element.style.visibility !== "visible") {
                this.show(prefs);
                if(!this.target_form) {
                    this.target_form = textarea;
                }
            } else {
                this.hide();
            }
        }.bind(this)), false);
    },

    /*
     * Sets up the global ">>" emotes icon.
     */
    setup_global_icon: function(prefs) {
        bpm_debug("Injecting global search icon");
        this.sb_global_icon.addEventListener("mouseover", bpm_utils.catch_errors(function(event) {
            this.grab_target_form();
        }.bind(this)), false);

        // Enable dragging the global button around
        bpm_dom.make_movable(this.sb_global_icon, this.sb_global_icon, function(event, left, top, move) {
            if(!event.ctrlKey && !event.metaKey) {
                return;
            }
            move();
            prefs.prefs.globalIconPos[0] = left;
            prefs.prefs.globalIconPos[1] = top;
            bpm_prefs.sync_key("globalIconPos");
        });

        this.sb_global_icon.style.visibility = "visible";

        this.sb_global_icon.addEventListener("click", bpm_utils.catch_errors(function(event) {
            // Don't open at the end of a drag (only works if you release the
            // mouse button before the ctrl/meta key though...)
            if(!event.ctrlKey && !event.metaKey) {
                this.show(prefs);
            }
        }.bind(this)), false);
    }
};
