/*
 * Attaches all of our CSS.
 */
function init_css(store) {
    // Most environments permit us to create <link> tags before
    // DOMContentLoaded (though Chrome forces us to use documentElement).
    // Scriptish is one that does not- there's no clear way to
    // manipulate the partial DOM, so we delay.
    with_css_parent(function() {
        log_info("Setting up css");
        link_css("/bpmotes.css");
        link_css("/emote-classes.css");

        if(store.prefs.enableExtraCSS) {
            // Inspect style properties to determine what extracss variant
            // to apply.
            //    Firefox: Old versions require -moz, but >=16.0 are unprefixed
            //    Chrome (WebKit): -webkit
            //    Opera: Current stable requires -o, but >=12.10 are unprefixed
            var style = document.createElement("span").style;

            if(style.transform !== undefined) {
                // This might actually be extracss-pure-opera for Opera
                // Next, since it requires some modified rules
                link_css("/extracss-pure.css");
            } else if(style.MozTransform !== undefined) {
                link_css("/extracss-moz.css");
            } else if(style.webkitTransform !== undefined) {
                link_css("/extracss-webkit.css");
            } else if(style.OTransform !== undefined) {
                link_css("/extracss-o.css");
            } else {
                log_warning("Cannot inspect vendor prefix needed for extracss.");
                // You never know, maybe it'll work
                link_css("/extracss-pure.css");
            }
        }

        if(store.prefs.enableNSFW) {
            link_css("/combiners-nsfw.css");
        }

        if(platform === "chrome-ext") {
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

        add_css(store.custom_css);

        // This needs to come after subreddit CSS to override their !important,
        // so just use document.head directly.
        if(platform === "chrome-ext" || platform === "userscript") {
            make_css_link("/gif-animotes.css", function(tag) {
                if(document.head) {
                    document.head.appendChild(tag);
                } else {
                    with_dom(function() { // Chrome, at least
                        document.head.appendChild(tag);
                    });
                }
            });
        }
    });

    with_dom(function() {
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
        if(platform === "firefox-ext") { // TODO: detect userscript on Firefox
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

            add_css(".bpflag-i { filter: url(#bpm-darkle); }" +
                    ".bpflag-invert { filter: url(#bpm-invert); }");
        }
    });
}

/*
 * Manages communication with our options page on platforms that work this
 * way (userscripts).
 */
function setup_options_link(store) {
    log_info("Setting up options page link");
    function _check() {
        var tag = document.getElementById("ready");
        var ready = tag.textContent.trim();

        if(ready === "true") {
            window.postMessage({
                "__betterponymotes_target": "__bpm_options_page",
                "__betterponymotes_method": "__bpm_prefs",
                "__betterponymotes_prefs": store.prefs
            }, EXT_RESOURCE_PREFIX);
            return true;
        } else {
            return false;
        }
    }

    // Impose a limit, in case something is broken.
    var checks = 0;
    function recheck() {
        if(checks < 10) {
            checks++;
            if(!_check()) {
                window.setTimeout(catch_errors(function() {
                    recheck();
                }), 200);
            }
        } else {
            log_error("Options page is unavailable after 2 seconds. Assuming broken.");
            // TODO: put some kind of obvious error <div> on the page or
            // something
        }
    }

    // Listen for messages that interest us
    window.addEventListener("message", catch_errors(function(event) {
        var message = event.data;
        // Verify source and intended target (we receive our own messages,
        // and don't want to get anything from rogue frames).
        if(event.origin !== EXT_RESOURCE_PREFIX || event.source !== window ||
           message.__betterponymotes_target !== "__bpm_extension") {
            return;
        }

        switch(message.__betterponymotes_method) {
            case "__bpm_set_pref":
                var key = message.__betterponymotes_pref;
                var value = message.__betterponymotes_value;

                if(store.prefs[key] !== undefined) {
                    store.prefs[key] = value;
                    store.sync_key(key);
                } else {
                    log_error("Invalid pref write from options page: '" + key + "'");
                }
                break;

            default:
                log_error("Unknown request from options page: '" + message.__betterponymotes_method + "'");
                break;
        }
    }), false);

    with_dom(function() {
        // Wait for options.js to be ready (checking every 200ms), then
        // send it down.
        recheck();
    });
}

/*
 * main()
 */
function main() {
    log_info("Starting up");
    setup_browser({"prefs": 1, "customcss": 1}, function(store) {
        if(document.location.href === EXT_OPTIONS_PAGE) {
            setup_options_link(store);
        } else if(ends_with(document.location.hostname, "reddit.com")) {
            reddit_main(store);
        } else {
            global_main(store);
        }
    });
}

main();

})(this); // Script wrapper
