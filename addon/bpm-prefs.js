/*
 * Preferences interface.
 */
var bpm_prefs = bpm_exports.prefs = {
    /*
     * Preferences object and caches:
     *    - prefs: actual preferences object
     *    - custom_emotes: map of extracted custom CSS emotes
     *    - sr_array: array of enabled subreddits. sr_array[sr_id] === enabled
     *    - de_map/we_map: dict of blacklisted/whitelisted emotes
     */
    prefs: null,
    sr_array: null,
    de_map: null,
    we_map: null,
    custom_emotes: null,
    custom_css: null,
    sync_timeouts: {},

    /*
     * Trigger called when prefs are available.
     */
    prefs_avail: bpm_utils.trigger(function(ready) {}),

    /*
     * Trigger called when custom CSS/emotes is available.
     */
    customcss_avail: bpm_utils.trigger(function(ready) {}),

    /*
     * Called from browser code when preferences have been received.
     */
    got_prefs: function(prefs) {
        bpm_debug("Prefs ready");
        this.prefs = prefs;
        this._make_sr_array();
        this.de_map = this._make_emote_map(prefs.disabledEmotes);
        this.we_map = this._make_emote_map(prefs.whitelistedEmotes);
        this.prefs_avail.trigger(this);
    },

    /*
     * Called from browser code when the custom CSS emote list has been
     * received.
     */
    got_custom_emotes: function(emotes, css) {
        bpm_debug("Custom emotes ready");
        this.custom_emotes = emotes;
        this.custom_css = css;
        this.customcss_avail.trigger(this);
    },

    _make_sr_array: function() {
        this.sr_array = [];
        for(var id in sr_id2name) {
            this.sr_array[id] = this.prefs.enabledSubreddits2[sr_id2name[id]];
        }
        if(this.sr_array.indexOf(undefined) > -1) {
            // Holes in the array mean holes in sr_id2name, which can't possibly
            // happen. If it does, though, any associated emotes will be hidden.
            //
            // Also bad would be items in prefs not in sr_id2name, but that's
            // more or less impossible to handle.
            bpm_error("sr_array has holes; installation or prefs are broken!");
        }
    },

    _make_emote_map: function(list) {
        var map = {};
        for(var i = 0; i < list.length; i++) {
            map[list[i]] = 1;
        }
        return map;
    },

    /*
     * Sync the given preference key. This may be called rapidly, as it will
     * enforce a small delay between the last sync_key() invocation and any
     * actual browser call is made.
     */
    sync_key: function(key) {
        // Schedule pref write for one second in the future, clearing out any
        // previous timeout. Prevents excessive backend calls, which can generate
        // some lag (on Firefox, at least).
        if(this.sync_timeouts[key] !== undefined) {
            clearTimeout(this.sync_timeouts[key]);
        }

        this.sync_timeouts[key] = setTimeout(bpm_utils.catch_errors(function() {
            bpm_browser.set_pref(key, this.prefs[key]);
            delete this.sync_timeouts[key];
        }.bind(this)), 1000);
    }
};
