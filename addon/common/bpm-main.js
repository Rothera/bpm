
/*
 * main() and such.
 */
var bpm_core = bpm_exports.core = {
    /*
     * Attaches all of our CSS.
     */
    init_css: function() {
        // Most environments permit us to create <link> tags before
        // DOMContentLoaded (though Chrome forces us to use documentElement).
        // Scriptish is one that does not- there's no clear way to
        // manipulate the partial DOM, so we delay.
        bpm_browser.with_css_parent(function() {
            bpm_info("Setting up css");
            bpm_browser.link_css("/bpmotes.css");
            bpm_browser.link_css("/emote-classes.css");

            bpm_prefs.prefs_avail.listen(function(prefs) {
                if(prefs.prefs.enableExtraCSS) {
                    // Inspect style properties to determine what extracss variant
                    // to apply.
                    //    Firefox: Old versions require -moz, but >=16.0 are unprefixed
                    //    Chrome (WebKit): -webkit
                    //    Opera: Current stable requires -o, but >=12.10 are unprefixed
                    var style = document.createElement("span").style;

                    if(style.transform !== undefined) {
                        // This might actually be extracss-pure-opera for Opera
                        // Next, since it requires some modified rules
                        bpm_browser.link_css("/extracss-pure.css");
                    } else if(style.MozTransform !== undefined) {
                        bpm_browser.link_css("/extracss-moz.css");
                    } else if(style.webkitTransform !== undefined) {
                        bpm_browser.link_css("/extracss-webkit.css");
                    } else if(style.OTransform !== undefined) {
                        bpm_browser.link_css("/extracss-o.css");
                    } else {
                        bpm_warning("Cannot inspect vendor prefix needed for extracss.");
                        // You never know, maybe it'll work
                        bpm_browser.link_css("/extracss-pure.css");
                    }
                }

                if(prefs.prefs.enableNSFW) {
                    bpm_browser.link_css("/combiners-nsfw.css");
                }

                if(bpm_utils.platform === "chrome-ext") {
                    // Fix for Chrome, which sometimes doesn't rerender unknown
                    // emote elements. The result is that until the element is
                    // "nudged" in some way- merely viewing it in the Console/platform
                    // Elements tabs will do- it won't display.
                    //
                    // RES seems to reliably set things off, but that won't
                    // always be installed. Perhaps some day we'll trigger it
                    // implicitly through other means and be able to get rid of
                    // this, but for now it seems not to matter.
                    var tag = document.createElement("style");
                    tag.type = "text/css";
                    document.head.appendChild(tag);
                }
            }.bind(this));

            bpm_prefs.customcss_avail.listen(function(prefs) {
                bpm_browser.add_css(prefs.custom_css);
            }.bind(this));

            // This needs to come after subreddit CSS to override their !important,
            // so just use document.head directly.
            if(bpm_utils.platform === "chrome-ext" || bpm_utils.platform === "userscript") {
                bpm_browser.make_css_link("/gif-animotes.css", function(tag) {
                    if(document.head) {
                        document.head.appendChild(tag);
                    } else {
                        bpm_dom.dom_ready.listen(function() { // Chrome, at least
                            document.head.appendChild(tag);
                        }.bind(this));
                    }
                }.bind(this));
            }
        }.bind(this));

        bpm_dom.dom_ready.listen(function() {
            // Inject our filter SVG for Firefox. Chrome renders this thing as a
            // massive box, but "display: none" (or putting it in <head>) makes
            // Firefox hide all of the emotes we apply the filter to- as if *they*
            // had display:none. Furthermore, "height:0;width:0" isn't quite enough
            // either, as margins or something make the body move down a fair bit
            // (leaving a white gap). "position:fixed" is a workaround for that.
            //
            // We also can't include either the SVG or the CSS as a normal resource
            // because Firefox throws security errors. No idea why.
            //
            // Can't do this before the DOM is built, because we use document.body
            // by necessity.
            //
            // Christ. I hope people use the fuck out of -i after this nonsense.
            if(bpm_utils.platform === "firefox-ext") { // TODO: detect userscript on Firefox
                var svg_src = [
                    '<svg version="1.1" baseProfile="full" xmlns="http://www.w3.org/2000/svg"',
                    ' style="height: 0; width: 0; position: fixed">',
                    '  <filter id="bpm-darkle">',
                    '    <feColorMatrix in="SourceGraphic" type="hueRotate" values="180"/>',
                    '  </filter>',
                    '  <filter id="bpm-invert">',
                    '    <feColorMatrix in="SourceGraphic" type="matrix" values="',
                    '                   -1  0  0 0 1',
                    '                    0 -1  0 0 1',
                    '                    0  0 -1 0 1',
                    '                    0  0  0 1 0"/>',
                    '  </filter>',
                    '</svg>'
                ].join("\n");
                var div = document.createElement("div");
                div.innerHTML = svg_src;
                document.body.insertBefore(div.firstChild, document.body.firstChild);

                bpm_browser.add_css(".bpflag-i { filter: url(#bpm-darkle); }" +
                                    ".bpflag-invert { filter: url(#bpm-invert); }");
            }
        }.bind(this));
    },

    /*
     * Main function when running on Reddit.
     */
    run: function(prefs) {
        bpm_info("Running on Reddit");

        bpm_searchbox.init(prefs);
        var usertext_edits = document.getElementsByClassName("usertext-edit");
        bpm_searchbox.inject_search_button(prefs, usertext_edits);
        bpm_converter.hook_usertext_edit(prefs, usertext_edits);

        // Initial pass- show all emotes currently on the page.
        var posts = document.getElementsByClassName("md");
        bpm_converter.process_posts(prefs, posts);

        // Add emote click blocker
        document.body.addEventListener("click", bpm_utils.catch_errors(function(event) {
            var element = event.target;
            if(element.classList.contains("bpm-emote") || element.classList.contains("bpm-unknown")) {
                event.preventDefault();
            }

            if(element.classList.contains("bpm-emote")) {
                // Click toggle
                var state = element.getAttribute("data-bpm_state") || "";
                var is_nsfw_disabled = state.indexOf("1") > -1; // NSFW
                // Not a disabled emote, or NSFW
                if((state.indexOf("d") < 0) || (prefs.prefs.clickToggleSFW && is_nsfw_disabled)) {
                    return;
                }
                var info = bpm_data.lookup_emote(element.getAttribute("data-bpm_emotename"), prefs.custom_emotes);
                if(element.classList.contains("bpm-disabled") ||
                   element.classList.contains("bpm-nsfw")) {
                    // Show
                    element.classList.remove("bpm-disabled");
                    element.classList.remove("bpm-nsfw");
                    element.classList.add(info.css_class);
                    if(state.indexOf("T") > -1) {
                        element.textContent = "";
                    }
                } else {
                    // Hide
                    element.classList.remove(info.css_class);
                    element.classList.add(is_nsfw_disabled ? "bpm-nsfw" : "bpm-disabled");
                    if(state.indexOf("T") > -1) {
                        element.textContent = info.name;
                    }
                }
            }
        }.bind(this)), false);

        // As a relevant note, it's a terrible idea to set this up before
        // the DOM is built, because monitoring it for changes seems to slow
        // the process down horribly.

        // What we do here: for each mutation, inspect every .md we can
        // find- whether the node in question is deep within one, or contains
        // some.
        bpm_dom.observe_document(function(nodes) {
            for(var i = 0; i < nodes.length; i++) {
                var root = nodes[i];
                if(root.nodeType !== _bpm_global("Node").ELEMENT_NODE) {
                    // Not really interested in other kinds.
                    continue;
                }

                var md;
                if(md = bpm_dom.class_above(root, "md")) {
                    // Inside of a formatted text block, take all the
                    // links we can find
                    bpm_converter.process_rooted_post(prefs, root, md);
                } else {
                    // Outside of formatted text, try to find some
                    // underneath us
                    var posts = root.getElementsByClassName("md");
                    bpm_converter.process_posts(prefs, posts);
                }

                // TODO: move up in case we're inside it?
                var usertext_edits = root.getElementsByClassName("usertext-edit");
                bpm_searchbox.inject_search_button(prefs, usertext_edits);
                bpm_converter.hook_usertext_edit(prefs, usertext_edits);
            }
        }.bind(this));
    },

    /*
     * Manages communication with our options page on platforms that work this
     * way (userscripts).
     */
    setup_options_link: function() {
        bpm_info("Setting up options page link");
        function _check(prefs) {
            var tag = document.getElementById("ready");
            var ready = tag.textContent.trim();

            if(ready === "true") {
                window.postMessage({
                    "__betterponymotes_target": "__bpm_options_page",
                    "__betterponymotes_method": "__bpm_prefs",
                    "__betterponymotes_prefs": bpm_prefs.prefs
                }, BPM_RESOURCE_PREFIX);
                return true;
            } else {
                return false;
            }
        }

        // Impose a limit, in case something is broken.
        var checks = 0;
        function recheck(prefs) {
            if(checks < 10) {
                checks++;
                if(!_check(prefs)) {
                    window.setTimeout(bpm_utils.catch_errors(function() {
                        recheck();
                    }), 200);
                }
            } else {
                bpm_error("Options page is unavailable after 2 seconds. Assuming broken.");
                // TODO: put some kind of obvious error <div> on the page or
                // something
            }
        }

        // Listen for messages that interest us
        window.addEventListener("message", bpm_utils.catch_errors(function(event) {
            var message = event.data;
            // Verify source and intended target (we receive our own messages,
            // and don't want to get anything from rogue frames).
            if(event.origin !== BPM_RESOURCE_PREFIX || event.source !== window ||
               message.__betterponymotes_target !== "__bpm_extension") {
                return;
            }

            switch(message.__betterponymotes_method) {
                case "__bpm_set_pref":
                    var key = message.__betterponymotes_pref;
                    var value = message.__betterponymotes_value;

                    if(bpm_prefs.prefs[key] !== undefined) {
                        bpm_prefs.prefs[key] = value;
                        bpm_prefs.sync_key(key);
                    } else {
                        bpm_error("Invalid pref write from options page: '" + key + "'");
                    }
                    break;

                default:
                    bpm_error("Unknown request from options page: '" + message.__betterponymotes_method + "'");
                    break;
            }
        }.bind(this)), false);

        bpm_dom.dom_ready.listen(function() {
            bpm_prefs.prefs_avail.listen(function(prefs) {
                // Wait for options.js to be ready (checking every 200ms), then
                // send it down.
                recheck();
            });
        });
    },

    /*
     * main()
     */
    main: function() {
        bpm_info("Starting up");
        bpm_browser.request_prefs();
        bpm_browser.request_custom_css();

        if(document.location.href === BPM_OPTIONS_PAGE) {
            this.setup_options_link();
        } else if(bpm_utils.ends_with(document.location.hostname, "reddit.com")) {
            this.init_css();

            // This script is generally run before the DOM is built. Opera may break
            // that rule, but I don't know how and there's nothing we can do anyway.
            //
            // Need DOM (to operate on), prefs and customcss (to work with).
            bpm_dom.dom_ready.listen(function() {
                bpm_logutil.inject_log_dumper(); // Do this early

                bpm_prefs.prefs_avail.listen(function(prefs) {
                    bpm_prefs.customcss_avail.listen(function(prefs) {
                        this.run(prefs);
                    }.bind(this));
                }.bind(this));
            }.bind(this));
        } else {
            // Check against domain blacklist
            for(var i = 0; i < BPM_DOMAIN_BLACKLIST.length; i++) {
                if(BPM_DOMAIN_BLACKLIST[i] == document.location.host) {
                    bpm_warning("Refusing to run on '" + document.location.host + "': domain is blacklisted (probably broken)");
                    return;
                }
            }

            bpm_dom.dom_ready.listen(function() {
                bpm_prefs.prefs_avail.listen(function(prefs) {
                    bpm_prefs.customcss_avail.listen(function(prefs) {
                        bpm_global.run(prefs);
                    }.bind(this));
                }.bind(this));
            }.bind(this));
        }
    }
};

bpm_core.main();

})(this); // Script wrapper
