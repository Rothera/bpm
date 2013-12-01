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
            } else {
                // Else, try adding the original query. It'll probably fail to
                // match anything at all (killing the results is acceptable for
                // typos), or possibly work on custom subreddits.
                add_cancelable_id_list(sets, positive, [exact]);
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
            if(term.length > 1) {
                // A tag-like thing that isn't a subreddit = tag term
                add_id_set(query.tag_term_sets, tag_name2id, positive, "+" + term, term);
            }
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
 * Checks whether a single emote matches against a search query.
 */
function emote_matches_query(query, emote_info, lc_emote_name) {
    // Match if ALL search terms match
    for(var nt_i = 0; nt_i < query.name_terms.length; nt_i++) {
        if(lc_emote_name.indexOf(query.name_terms[nt_i]) < 0) {
            return false; // outer loop, not inner
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
            if(sr_set.indexOf(emote_info.source_id) > -1 || sr_set.indexOf(emote_info.source_name) > -1) {
                if(sr_set[0]) {
                    is_match = true; // Matched positive term
                    return true;
                } else {
                    return false; // Matched negative term
                }
            }
        }
        if(!is_match) {
            return false;
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
                return true;
            }
        }
        // We either didn't match, and wanted to, or matched and didn't
        // want to.
        if(any !== tag_set[0]) {
            return false;
        }
    }

    return true;
}

/*
 * Executes a search query. Returns an object with two properties:
 *    .results: a sorted list of emotes
 */
function execute_search(store, query) {
    var results = [];

    for(var emote_name in emote_map) {
        var emote_info = store.lookup_core_emote(emote_name, true);
        var lc_emote_name = emote_name.toLowerCase();

        if(!emote_matches_query(query, emote_info, lc_emote_name)) {
            continue;
        }

        // At this point we have a match, so follow back to its base
        if(emote_name !== emote_info.base) {
            // Hunt down the non-variant version
            emote_info = store.lookup_core_emote(emote_info.base, true);
            if(emote_info.name !== emote_info.base) {
                log_warning("Followed +v from " + emote_name + " to " + emote_info.name + "; no root emote found");
            }
            emote_name = emote_info.name;
        }

        results.push(emote_info);
    }

    for(var emote_name in store.custom_emotes()) {
        if(emote_map[emote_name] !== undefined) {
            // Quick hack: force custom emotes to lose precedence vs. core ones.
            // This is partially for consistency (this happens when converting
            // as well and would be confusing), but also to conveniently drop
            // duplicates, e.g. r/mlp copies.
            continue;
        }

        var emote_info = store.lookup_custom_emote(emote_name);
        var lc_emote_name = emote_name.toLowerCase();

        if(!emote_matches_query(query, emote_info, lc_emote_name)) {
            continue;
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
