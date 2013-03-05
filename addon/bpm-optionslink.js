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
