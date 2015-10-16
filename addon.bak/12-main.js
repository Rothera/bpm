/*
 * Attaches all of our CSS.
 */
function init_css(store) {
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
    setup_browser({"prefs": 1, "customcss": 1, "emotes": 1, "css": 1}, function(store) {
        if(document.location && document.location.hostname && (is_reddit || is_voat)) {
            reddit_main(store);
        } else {
            global_main(store);
        }
    });
}

main();

})(this); // Script wrapper
