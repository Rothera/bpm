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

// Same content script is used for reddit and Voat, so figure out where we are.
var is_reddit = document.location.hostname.endsWith("reddit.com");
var is_voat = document.location.hostname.endsWith("voat.co");

var current_subreddit = (function() {
    // FIXME: what other characters are valid?
    var match = document.location.href.match(/reddit\.com\/(r\/[\w]+)/);
    return match ? match[1].toLowerCase() : null;
})();

var sidebar = null; // Cached, see below

/*
 * Early reddit setup. Runs before DOM is ready.
 */
function reddit_preload() {
    console.log(lp, "[CSS]", "Running on reddit (preload)");

    // Basic required stylesheets. Webkit based browsers require an additional
    // stylesheet (gif-animotes.css).
    var core_stylesheets = ["bpmotes.css", "emote-classes.css"].concat(browser.core_stylesheets || []);

    // Fetch all of these files
    var core = Promise.all(core_stylesheets.map(function(name) {
        return browser.fetch_stylesheet(name);
    }));

    core.then(function() {
        console.log(lp, "[CSS]", "Finished loading all core stylesheets");
    });

    // Load preferences, load extracss if needed
    var extra = browser.prefs().then(function(prefs) {
        console.log(lp, "[CSS]", "Got preferences");
        var tmp = [];
        if(prefs.enable_extracss) {
            tmp.push(browser.fetch_stylesheet("extracss.css"));
            if(prefs.enable_nsfw) {
                tmp.push(browser.fetch_stylesheet("combiners-nsfw.css"));
            }
        }
        return Promise.all(tmp);
    });

    extra.then(function() {
        console.log(lp, "[CSS]", "Finished loading all extra stylesheets");
    });

    // Load custom subreddit CSS
    var custom = browser.fetch_custom_css();

    custom.then(function() {
        console.log(lp, "[CSS]", "Finished loading custom subreddit CSS");
    });

    // Batch all DOM changes. Note that this can (and probably will) run after
    // reddit_main().
    Promise.all([core, extra, custom]).then(function(tmp) {
        var stylesheets = tmp[0].concat(tmp[1]).concat([tmp[2]]);
        var css = stylesheets.join("\n");

        console.log(lp, "[CSS]", "Finished loading", stylesheets.length, "stylesheets (" + css.length + " bytes)");

        var tag = document.createElement("style");
        tag.id = "bpm-styles";
        tag.textContent = css;

        // Note: We want to append CSS to the end of <head> in order to take
        // precedence over local subreddit stylesheets.
        dom.then(function() {
            console.log(lp, "[CSS]", "Attaching stylesheets");
            document.head.appendChild(tag);
        });
    });
}

/*
 * Main reddit code. Runs after DOM is ready, but possibly before CSS.
 */
function reddit_main() {
    console.log(lp, "[STARTUP]", "Running on reddit");

    find_sidebar();

    browser.prefs().then(function(prefs) {
        console.log(lp, "[STARTUP]", "Got preferences");

        // Initial conversion pass: convert all emotes currently on the page
        var posts = slice(document.getElementsByClassName("md"));
        console.log(lp, "[REDDIT]", "Processing", posts.length, "initial posts");

        var blacklisted = !!prefs.blacklisted_subreddits[current_subreddit];

        if(blacklisted) {
            console.log(lp, "[STARTUP]", "Blacklisted subreddit. Disabling emote expansion");
            for(var i = 0; i < posts.length; i++) {
                process_post(prefs, posts[i], false, null);
            }
        } else {
            // Find all interesting-looking links
            var required_emotes = {}; // {"/emotename" -> 1, ...}
            for(var i = 0; i < posts.length; i++) {
                analyze_post(posts[i], required_emotes);
            }

            console.log(lp, "[REDDIT]", "Found", count, "links");

            browser.fetch_emotes(required_emotes).then(function(emotes) {
                // emotes: {"/emotename" -> data}
                console.log(lp, "[REDDIT]", "Received emote data");

                for(var i = 0; i < posts.length; i++) {
                    process_post(prefs, posts[i], true, emotes);
                }
            });
        }

        // TODO: DOM observation. Note race condition

        // TODO: Setup click blocker
        // TODO: Inject search box
        // TODO: Inject "emotes" buttons
    });
}

function find_sidebar() {
    // Should only be one of these elements
    var titlebox = document.getElementsByClassName("titlebox")[0];

    // Should only be one of these, too
    var md = titlebox.getElementsByClassName("md")[0];

    sidebar = md; // Global
}

function is_sidebar(md) {
    return md === sidebar;
}

function extract_emote_name(a) {
    // Not the same as a.href, which has been mangled
    var href = a.getAttribute("href");

    // See if this looks like an emote, and filter out some common false
    // positives
    if(href && href[0] === "/" && !href.startsWith("/r/") && !href.startsWith("/u/")) {
        var parts = href.split("-");
        return parts;
    } else {
        return null;
    }
}

function analyze_post(md, required_emotes) {
    var links = slice(md.getElementsByTagName("a"));

    for(var i = 0; i < links.length; i++) {
        var a = links[i];
        var parts = extract_emote_name(a);
        if(parts) {
            var name = parts[0];
            required_emotes[name] = 1;
        }
    }
}

function process_post(prefs, md, expand_emotes, emotes) {
    var expand_alt_text = !is_sidebar(md) && prefs.show_alt_text;
    var expand_unknown = !is_sidebar(md) && prefs.show_unknown_emotes;

    var links = slice(md.getElementsByTagName("a"));

    for(var i = 0; i < links.length; i++) {
        var a = links[i];

        if(expand_emotes) {
            var parts = extract_emote_name(a);
            if(parts) {
                var name = parts[0];
                var info = emotes[name];
                if(info) {
                    process_emote(prefs, a, parts, info);
                } else if(show_unknown_emotes && is_broken_emote(a, name)) {
                    process_broken_emote(prefs, a, name);
                }
            }
        }

        if(expand_alt_text) {
            // TODO
        }
    }
}

function process_emote(prefs, a, parts, info) {
    // ...
}
