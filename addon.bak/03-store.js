
var CACHE_TIME = 1000 * 60 * 5; // Five minutes

if(DEV_MODE) {
    CACHE_TIME = 1000 * 30; // 30 seconds
}

function Store() {
    this.prefs = null;
    this._custom_emotes = null;
    this.custom_css = null; // Accessed by init_css() so not really private
    this._last_access = null;
    this._bpm_data = null;
    this._data_callbacks = [];
    this.css = null;

    this._sr_array = null;
    this._tag_array = null;
    this._de_map = null;
    this._we_map = null;
    this.formatting_tag_id = null;

    this._sync_timeouts = {};
}

Store.prototype = {
    data: function(f) {
        this._last_access = Date.now();
        if(this._bpm_data) {
            f(this._bpm_data);
        } else {
            this._data_callbacks.push(f);

            if(this._data_callbacks.length === 1) {
                log_debug("Fetching emote data");
                this._reload_cache();
            }
        }
    },

    setup_prefs: function(prefs) {
        log_debug("Got prefs");
        this.prefs = prefs;
        this._de_map = this._make_emote_map(prefs.disabledEmotes);
        this._we_map = this._make_emote_map(prefs.whitelistedEmotes);

    },

    setup_customcss: function(emotes, css) {
        log_debug("Got customcss");
        this._custom_emotes = emotes;
        this.custom_css = css;
    },

    setup_data: function(bpm_data) {
        log_debug("Got emote data");

        this._last_access = Date.now();
        this._bpm_data = bpm_data;

        this.formatting_tag_id = bpm_data.tag_name2id["+formatting"];
        this._make_sr_array(bpm_data);
        this._make_tag_array(bpm_data);

        setTimeout(this._clear_cache.bind(this), CACHE_TIME);
    },

    setup_css: function(css) {
        this.css = css;
    },

    _clear_cache: function() {
        var age = Date.now() - this._last_access;

        if(age > CACHE_TIME - 1000) {
            log_debug("Clearing emote data cache");

            this._bpm_data = null;
            this.formatting_tag_id = null;
            this._sr_array = null;
            this._tag_array = null;
        } else {
            // Wait some more
            setTimeout(this._clear_cache.bind(this), CACHE_TIME - age);
        }
    },

    _reload_cache: function() {
        refresh_cache(function(bpm_data) {
            this.setup_data(bpm_data);

            for(var i = 0; i < this._data_callbacks.length; i++) {
                this._data_callbacks[i](bpm_data);
            }

            this._data_callbacks = [];
        }.bind(this));
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
        if(this._sync_timeouts[key] !== undefined) {
            clearTimeout(this._sync_timeouts[key]);
        }

        this._sync_timeouts[key] = ST(catch_errors(function() {
            set_pref(key, this.prefs[key]);
            delete this._sync_timeouts[key];
        }.bind(this)), 1000);
    },

    /*
     * Determines whether or not an emote has been disabled by the user. Returns:
     *    0: not disabled
     *    1: nsfw has been turned off
     *    2: subreddit was disabled
     *    3: too large
     *    4: blacklisted
     */
    is_disabled: function(info) {
        if(this._we_map[info.name]) {
            return 0;
        }
        if(info.is_nsfw && !this.prefs.enableNSFW) {
            return 1;
        }
        if(info.source_id !== null && !this._sr_array[info.source_id]) {
            return 2;
        }
        if(this.prefs.maxEmoteSize && info.max_size > this.prefs.maxEmoteSize) {
            return 3;
        }
        if(this._de_map[info.name]) {
            return 4;
        }
        return 0;
    },

    custom_emotes: function() {
        return this._custom_emotes;
    },

    /*
     * Tries to locate an emote, either builtin or global.
     */
    lookup_emote: function(bpm_data, name, want_tags) {
        return this.lookup_core_emote(bpm_data, name, want_tags) || this.lookup_custom_emote(name) || null;
    },

    /*
     * Looks up a builtin emote's information. Returns an object with a couple
     * of properties, or null if the emote doesn't exist.
     */
    lookup_core_emote: function(bpm_data, name, want_tags) {
        // Refer to bpgen.py:encode() for the details of this encoding
        var data = bpm_data.emote_map[name];
        if(!data) {
            return null;
        }

        var parts = data.split(",");
        var flag_data = parts[0];
        var tag_data = parts[1];

        var flags = parseInt(flag_data.slice(0, 1), 16);     // Hexadecimal
        var source_id = parseInt(flag_data.slice(1, 3), 16); // Hexadecimal
        var size = parseInt(flag_data.slice(3, 7), 16);      // Hexadecimal
        var is_nsfw = (flags & _FLAG_NSFW);
        var is_redirect = (flags & _FLAG_REDIRECT);

        var tags = null, base = null;
        if(want_tags) {
            var start, str;

            tags = [];
            start = 0;
            while((str = tag_data.slice(start, start+2)) !== "") {
                tags.push(parseInt(str, 16)); // Hexadecimal
                start += 2;
            }

            if(is_redirect) {
                base = parts[2];
            } else {
                base = name;
            }
        }

        return {
            name: name,
            is_nsfw: Boolean(is_nsfw),
            source_id: source_id,
            source_name: bpm_data.sr_id2name[source_id],
            max_size: size,

            tags: tags,

            css_class: "bpmote-" + sanitize_emote(name.slice(1)),
            base: base
        };
    },

    /*
     * Looks up a custom emote's information. The returned object is rather
     * sparse, but roughly compatible with core emote's properties.
     */
    lookup_custom_emote: function(name) {
        var source_subreddit = this._custom_emotes[name];
        if(source_subreddit === undefined) {
            // Emote doesn't actually exist
            return null;
        }

        return {
            name: name,
            is_nsfw: false,
            source_id: null,
            source_name: "r/" + source_subreddit,
            max_size: null,

            tags: [],

            css_class: "bpm-cmote-" + sanitize_emote(name.slice(1)),
            base: null
        };
    },

    _make_sr_array: function(bpm_data) {
        this._sr_array = [];
        for(var id in bpm_data.sr_id2name) {
            this._sr_array[id] = this.prefs.enabledSubreddits2[bpm_data.sr_id2name[id]];
        }
        if(this._sr_array.indexOf(undefined) > -1) {
            // Holes in the array mean holes in sr_id2name, which can't possibly
            // happen. If it does, though, any associated emotes will be hidden.
            //
            // Also bad would be items in prefs not in sr_id2name, but that's
            // more or less impossible to handle.
            log_error("sr_array has holes; installation or prefs are broken!");
        }
    },

    _make_tag_array: function(bpm_data) {
        this._tag_array = [];
        for(var id in bpm_data.tag_id2name) {
            this._tag_array[id] = bpm_data.tag_id2name[id];
        }
        if(this._tag_array.indexOf(undefined) > -1) {
            log_error("tag_array has holes; installation or prefs are broken!");
        }
    },

    _make_emote_map: function(list) {
        var map = {};
        for(var i = 0; i < list.length; i++) {
            map[list[i]] = 1;
        }
        return map;
    }
};

// Keep in sync with bpgen.
var _FLAG_NSFW = 1;
var _FLAG_REDIRECT = 1 << 1;

/*
 * Escapes an emote name (or similar) to match the CSS classes.
 *
 * Must be kept in sync with other copies, and the Python code.
 */
function sanitize_emote(s) {
    return s.toLowerCase().replace("!", "_excl_").replace(":", "_colon_").replace("#", "_hash_").replace("/", "_slash_");
}
