/*
 * Attaches all of our CSS.
 */
function init_css(store) {
    // Most environments permit us to create <link> tags before DOMContentLoaded
    // (though WebExt forces us to use documentElement). Scriptish is one that
    // does not- there's no clear way to manipulate the partial DOM, so we delay.
    // TODO We don't support Scriptish anymore.
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

        if(platform === "webext") {
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
    });
}

function main() {
    log_info("Starting up");
    setup_browser({"prefs": 1, "customcss": 1}, function(store) {
        if(document.location && document.location.hostname && (is_reddit || is_modreddit || is_voat)) {
            reddit_main(store);
        } else {
            global_main(store);
        }
    });
}

main();

})(this); // Script wrapper
