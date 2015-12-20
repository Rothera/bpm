/*
 * Sets up search for use in a frame. No search box is generated, but it
 * listens for postMessage() calls from the parent frame.
 */
function init_frame_search(store) {
    log_debug("Setting frame message hook");
    window.addEventListener("message", catch_errors(function(event) {
        // Not worried about event source (it might be null in Firefox, as
        // a note). Both of these methods are quite harmless, so it's
        // probably ok to let them be publically abusable.
        //
        // I'm not sure how else we can do it, anyway- possibly by going
        // through the backend, but not in userscripts. (Maybe we can abuse
        // GM_setValue().)
        var message = event.data;
        switch(message.__betterponymotes_method) {
            case "__bpm_inject_emote":
                // Call toString() just in case
                inject_emote(store, message.__betterponymotes_emote.toString());
                break;

            case "__bpm_track_focus":
                track_focus();
                break;

            // If it's not our message, it'll be undefined. (We don't care.)
        }
    }), false);
}
