/*
 * Attaches all of our CSS.
 */
function init_css(store) {
    // Most environments permit us to create <link> tags before DOMContentLoaded
    // (though Chrome forces us to use documentElement). Scriptish is one that
    // does not- there's no clear way to manipulate the partial DOM, so we delay.
    with_css_parent(function() {
        log_info("Setting up css");
        link_css("/bpmotes.css");
        link_css("/emote-classes.css");

        if(store.prefs.enableExtraCSS) {
            // Inspect style properties to determine what extracss variant to
            // apply.
            //    Firefox: <16.0 requires -moz, which we don't support
            //    Chrome (WebKit): Always needs -webkit
            var style = document.createElement("span").style;

            if(style.webkitTransform !== undefined) {
                link_css("/extracss-webkit.css");
            } else if(style.transform !== undefined) {
                link_css("/extracss-pure.css");
            } else {
                log_warning("Cannot inspect vendor prefix needed for extracss.");
                // You never know, maybe it'll work
                link_css("/extracss-pure.css");
            }

            if(store.prefs.enableNSFW) {
                link_css("/combiners-nsfw.css");
            }
        }

        if(platform === "chrome-ext") {
            // Fix for Chrome, which sometimes doesn't rerender unknown emote
            // elements. The result is that until the element is "nudged" in
            // some way- merely viewing it in the Console/platform Elements
            // tabs will do- it won't display.
            //
            // RES seems to reliably set things off, but that won't always be
            // installed. Perhaps some day we'll trigger it implicitly through
            // other means and be able to get rid of this, but for now it seems
            // not to matter.
            var tag = document.createElement("style");
            tag.type = "text/css";
            document.head.appendChild(tag);
        }

        add_css(store.custom_css);

        // This needs to come after subreddit CSS to override their !important,
        // so just use document.head directly.
        if(platform === "chrome-ext") {
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
        if(platform === "firefox-ext") {
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
            div[IHTML] = svg_src;
            document.body.insertBefore(div.firstChild, document.body.firstChild);

            add_css(".bpflag-i { filter: url(#bpm-darkle); }" +
                    ".bpflag-invert { filter: url(#bpm-invert); }");
        }
    });
}

function main() {
    log_info("Starting up");
    setup_browser({"prefs": 1, "customcss": 1, "emotes": 1}, function(store) {
        if(document.location && document.location.hostname && (is_reddit || is_voat)) {
            reddit_main(store);
        } else {
            global_main(store);
        }
    });
}

main();

})(this); // Script wrapper
