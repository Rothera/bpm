/*
 * Emote lookup utilities and other stuff related to BPM's data files. These
 * are rather helpful, since our data format is optimized for space and memory,
 * not easy of access.
 */

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

/*
 * Tries to locate an emote, either builtin or global.
 */
function lookup_emote(name, custom_emotes) {
    return lookup_core_emote(name) || lookup_custom_emote(name, custom_emotes) || null;
}

/*
 * Looks up a builtin emote's information. Returns an object with a couple
 * of properties, or null if the emote doesn't exist.
 */
function lookup_core_emote(name) {
    // Refer to bpgen.py:encode() for the details of this encoding
    var data = emote_map[name];
    if(!data) {
        return null;
    }

    var parts = data.split(",");
    var flag_data = parts[0];
    var source_data = parts[1];
    var tag_data = parts[2];

    var flags = parseInt(flag_data.slice(0, 1), 16);     // Hexadecimal
    var source_id = parseInt(flag_data.slice(1, 3), 16); // Hexadecimal
    var size = parseInt(flag_data.slice(3, 7), 16);      // Hexadecimal
    var is_nsfw = (flags & _FLAG_NSFW);
    var is_redirect = (flags & _FLAG_REDIRECT);

    var sources = [], start = 0, str;
    while((str = source_data.slice(start, start+2)) !== "") {
        sources.push(parseInt(str, 16)); // Hexadecimal
        start += 2;
    }

    var tags = [];
    start = 0;
    while((str = tag_data.slice(start, start+2)) !== "") {
        tags.push(parseInt(str, 16)); // Hexadecimal
        start += 2;
    }

    var base;
    if(is_redirect) {
        base = parts[3];
    } else {
        base = name;
    }

    return {
        name: name,
        is_nsfw: Boolean(is_nsfw),
        source_id: source_id,
        source_name: sr_id2name[source_id],
        max_size: size,

        sources: sources,
        tags: tags,

        css_class: "bpmote-" + sanitize_emote(name.slice(1)),
        base: base
    };
}

/*
 * Looks up a custom emote's information. The returned object is rather
 * sparse, but roughly compatible with core emote's properties.
 */
function lookup_custom_emote(name, custom_emotes) {
    if(custom_emotes[name] === undefined) {
        return null;
    }

    return {
        name: name,
        is_nsfw: false,
        source_id: null,
        source_name: "custom subreddit",
        max_size: null,

        sources: [],
        tags: [],

        css_class: "bpm-cmote-" + sanitize_emote(name.slice(1)),
        base: null
    };
}

/*
 * Determines whether or not an emote has been disabled by the user. Returns:
 *    0: not disabled
 *    1: nsfw has been turned off
 *    2: subreddit was disabled
 *    3: too large
 *    4: blacklisted
 */
function is_disabled(prefs, info) {
    if(prefs.we_map[info.name]) {
        return 0;
    }
    if(info.is_nsfw && !prefs.prefs.enableNSFW) {
        return 1;
    }
    if(info.source_id !== null && !prefs.sr_array[info.source_id]) {
        return 2;
    }
    if(prefs.prefs.maxEmoteSize && info.max_size > prefs.prefs.maxEmoteSize) {
        return 3;
    }
    if(prefs.de_map[info.name]) {
        return 4;
    }
    return 0;
}
