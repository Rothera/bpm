/*******************************************************************************
**
** This file is part of BetterPonymotes.
** Copyright (c) 2012-2015 Typhos.
** Copyright (c) 2015 TwilightShadow1.
**
** This program is free software: you can redistribute it and/or modify it
** under the terms of the GNU Affero General Public License as published by
** the Free Software Foundation, either version 3 of the License, or (at your
** option) any later version.
**
** This program is distributed in the hope that it will be useful, but WITHOUT
** ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
** FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public License
** for more details.
**
** You should have received a copy of the GNU Affero General Public License
** along with this program.  If not, see <http://www.gnu.org/licenses/>.
**
*******************************************************************************/

"use strict";

var DEFAULT_PREFERENCES = {
    enable_nsfw: false,
    enable_extracss: true,
    show_unknown_emotes: true,
    hide_disabled_emotes: false,
    stealth_mode: false,
    show_alt_text: true,
    enable_global_emotes: false,
    enable_global_search: false,
    click_toggle_sfw: true,
    search_limit: 200,
    max_emote_size: 0,
    enabled_subreddits: {}, // subreddit name -> 0/1 enabled
    disabled_emotes: [],
    whitelisted_emotes: [],
    custom_css_subreddits: {}, // subreddit name -> timestamp
    blacklisted_subreddits: {}, // subreddit name -> true
    search_box_positioning: [600, 25, 620, 450],
    last_search_query: "sr:mylittlepony",
    global_icon_position: [16, 16]
};

/*
 * Converts preferences from camelCase names to under_score ones.
 */
function migrate_preferences(old) {
    return {
        enable_nsfw: old.enableNSFW,
        enable_extracss: old.enableExtraCSS,
        show_unknown_emotes: old.showUnknownEmotes,
        hide_disabled_emotes: old.hideDisabledEmotes,
        stealth_mode: old.stealthMode,
        show_alt_text: old.showAltText,
        enable_global_emotes: old.enableGlobalEmotes,
        enable_global_search:  old.enableGlobalSearch,
        click_toggle_sfw: old.clickToggleSFW,
        search_limit: old.searchLimit,
        max_emote_size: old.maxEmoteSize,
        enabled_subreddits: old.enabledSubreddits2,
        disabled_emotes: old.disabledEmotes,
        whitelisted_emotes: old.whitelistedEmotes,
        custom_css_subreddits: old.customCSSSubreddits,
        blacklisted_subreddits: old.blacklistedSubreddits,
        search_box_positioning: old.searchBoxInfo,
        last_search_query: old.lastSearchQuery,
        global_icon_position: old.globalIconPos
    };
}

/*
 * Rolling preferences update.
 */
function setup_preferences(prefs) {
    var changed = false;

    for(var k in DEFAULT_PREFERENCES) {
        if(prefs[k] === undefined) {
            console.log("Setting", k, "to", DEFAULT_PREFERENCES[k]);
            prefs[k] = DEFAULT_PREFERENCES[k];
            changed = true;
        }
    }

    // Enable new subreddits by default
    for(var sr in bpm_data.sr_name2id) {
        if(prefs.enabled_subreddits[sr] === undefined) {
            console.log("Enabling new subreddit", sr);
            prefs.enabled_subreddits[sr] = 1;
            changed = true;
        }
    }

    // Eliminate removed subreddits
    for(var sr in prefs.enabled_subreddits) {
        if(bpm_data.sr_name2id[sr] === undefined) {
            console.log("Deleting subreddit from preferences:", sr);
            delete prefs.enabled_subreddits[sr];
            changed = true;
        }
    }

    return changed;
}
