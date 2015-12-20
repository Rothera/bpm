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

var is_reddit = document.location.hostname.endsWith("reddit.com");
var is_voat = document.location.hostname.endsWith("voat.co");

// Whether or not we're running on Reddit's .compact display, i.e. their mobile
// version. We modify the search box UI a fair bit to compensate in this case.
//
// i.reddit.com is another way to get the compact UI. Occasionally it'll
// redirect users to .compact links, but in the meantime we need to work
// correctly there as well.
var is_compact = document.location.pathname.endsWith(".compact") ||
                 document.location.hostname.split(".").indexOf("i") > -1;

function _is_broken_emote(element, name) {
    /*
     * If there's:
     *    1) No text
     *    2) href matches regexp (no slashes, mainly)
     *    3) No size (missing bg image means it won't display)
     *    4) No :after or :before tricks to display the image (some subreddits
     *       do emotes with those selectors)
     * Then it's probably an emote, but we don't know what it is. Thanks to
     * nallar for his advice/code here.
     */

    // Cheap tests first
    if(element.textContent || !(/^\/[\w\-:!]+$/).test(name) || element.clientWidth) {
        return false;
    }

    // Check for presence of background-image, also on :after and :before
    var pseudos = [null, ":after", ":before"];
    for(var pi = 0; pi < pseudos.length; pi++) {
        var bg_image = window.getComputedStyle(element, pseudos[pi]).backgroundImage;
        // This value is "" in Opera, but "none" in Firefox and Chrome.
        if(bg_image && bg_image !== "none") {
            return false;
        }
    }

    return true; // Good enough
}

function _RedditWorkContext() {
    // Find sidebar
    this.sidebar = document.querySelector(".titlebox .md");

    // <a> elements to convert later
    this.pending_elements = [];

    // Emote names to lookup
    this.pending_emote_names = {};
}

_RedditWorkContext.prototype = {
    add_post: function(el) {
        var links = slice(el.getElementsByTagName("a"));
        links.forEach(function(a) {
            // Already been processed
            if(a.classList.contains("bpm-emote") || a.classList.contains("bpm-unknown")) {
                return;
            }

            var href = a.getAttribute("href"); // Not the same as a.href
            if(href && href[0] == "/") {
                var emote_name = href.split("-")[0];
                this.pending_elements.push(a);
                this.pending_emote_names[emote_name] = 1;
            }
        }.bind(this));
    },

    process: function() {
        browser.emote_info_batch(this.pending_emote_names).then(function(emotes) {
            this.pending_elements.forEach(function(a) {
                // Assume the href hasn't changed
                var href = a.getAttribute("href");
                var emote_name = href.split("-")[0];
                var emote_info = emotes[emote_name];

                if(emote_info) {
                    this.convert_emote(a, emote_info);
                } else {
                    if(_is_broken_emote(a, emote_name)) {
                        this.convert_broken_emote(a);
                    }
                }
            }.bind(this));
        }.bind(this));
    },

    convert_emote: function(el, info) {
        // Applied to all emote elements, no matter what
        element.classList.add("bpm-emote");

        // Attributes used in alt-text, to avoid extra lookups.
        element.setAttribute("data-bpm-emotename", name);
        element.setAttribute("data-bpm-srname", info.subreddit);
        element.setAttribute("data-bpm-class", info.css_class)

        // Leave existing text alone. This is also relevant to the click toggle
        // and the alt-text converter, so record this fact for later use
        var can_modify_text = !element.textContent;
        var disabled = store.is_disabled(info);

        // Work out state variable. "e" is always present
        var state = "e";
        if(info.is_nsfw) {
            state += "n";
        }
        if(can_modify_text) {
            state += "T";
        }
        if(disabled) {
            state += "d" + disabled; // Add numerical code (only 1=NSFW is used)
        }
        element.setAttribute("data-bpm-state", state);

        if(disabled || (store.prefs.stealthMode && info.tags.indexOf(store.formatting_tag_id) < 0)) {
            if(can_modify_text) {
                // Any existing text (generally, there shouldn't be any) will look
                // a little funny with our custom CSS, but there's not much we can
                // do about that.
                element.textContent = name;
            }

            // Combining these two prefs makes absolutely no sense, but try to do
            // something sane anyway
            if(store.prefs.hideDisabledEmotes && !store.prefs.stealthMode) {
                // "Ignore" mode- don't minify it, just hide it completely
                element.classList.add("bpm-hidden");
            } else {
                element.classList.add("bpm-minified"); // Minify emote
                if(disabled === 1) {
                    // NSFW emotes have a special look to them
                    element.classList.add("bpm-nsfw");
                }
            }

            return;
        }

        // Apply the actual emote CSS
        element.classList.add(info.css_class);

        // Apply flags
        add_flags(element, parts);
    },

    convert_broken_emote: function(el) {
        console.log("STUB: convert_broken_emote");
    }
};

function reddit_preload() {
    console.log("Preloading CSS");

    // Preload required CSS
    var core = ["bpmotes.css", "emote-classes.css"].concat(browser.core_stylesheets || []);
    core = core.map(function(name) {
        return browser.fetch_resource(name);
    });

    Promise.all(core).then(function() {
        console.log("Preloader: Finished loading core stylesheets");
    });

    // Load preferences, load extracss if needed
    var extra = browser.prefs().then(function(prefs) {
        console.log("Preloader: Got preferences");

        var tmp = [];

        if(prefs.enable_extracss) {
            tmp.push(browser.fetch_resource("extracss.css"));

            if(store.prefs.enable_nsfw) {
                tmp.push(browser.fetch_resource("combiners-nsfw.css"));
            }
        }

        Promise.all(tmp).then(function() {
            console.log("Preloader: Finished loading extra stylesheets");
        });

        return tmp;
    });

    // Load custom subreddit CSS
    var custom = browser.fetch_custom_css();

    custom.then(function() {
        console.log("Preloader: Finished loading custom subreddit CSS");
    });

    // Batch all DOM changes
    var resources = Promise.all(core.concat(extra).concat([custom]));

    resources.then(function(stylesheets) {
        console.log("Preloader: Finished loading", stylesheets.length, "stylesheets");

        dom.then(function() {
            console.log("Preloader: DOM ready");

            var css = stylesheets.join("\n");

            var tag = document.createElement("style");
            tag.id = "bpm-styles";
            tag.textContent = css;

            document.head.appendChild(tag);
        });
    });
};

function reddit_main() {
    var sb = new SearchBox();
    sb.inject();

    console.log("STUB: reddit_main: add emotes buttons");
    // Add "emotes" buttons
    // var usertext_edits = slice(document.getElementsByClassName(is_reddit ? "usertext-edit" : "markdownEditor"));
    // usertext_edits.forEach(function(el) {
    //     inject_emotes_button(el);
    // });

    // Process emotes on the page
    var wc = new _RedditWorkContext();
    var posts = slice(document.getElementsByClassName("md"));
    posts.forEach(function(el) {
        wc.add_post(el);
    });
    wc.process();
};
