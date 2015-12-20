/*******************************************************************************
**
** This file is part of BetterPonymotes.
** Copyright (c) 2012-2015 Typhos.
** Copyright (c) 2015 TwilightShadow1.
**
** This program is free software: you can redistribute it and/or modify it
** under the terms of the GNU Affero General Public License as published by
** the Free Software Foundation, either version 3 of the License, or (at your
** option) any later version.
**
** This program is distributed in the hope that it will be useful, but WITHOUT
** ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
** FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public License
** for more details.
**
** You should have received a copy of the GNU Affero General Public License
** along with this program.  If not, see <http://www.gnu.org/licenses/>.
**
*******************************************************************************/

"use strict";

// Keep in sync with bpgen.
var EMOTE_FLAG_NSFW = 1;
var EMOTE_FLAG_REDIRECT = 1 << 1;

function lookup_emote(name) {
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

    var is_nsfw = (flags & EMOTE_FLAG_NSFW);
    var is_redirect = (flags & EMOTE_FLAG_REDIRECT);

    var tags = [];
    var start = 0;

    var str;
    while((str = tag_data.slice(start, start+2)) !== "") {
        var tag_id = parseInt(str, 16); // Hexadecimal
        tags.push(bpm_data.tag_id2name[tag_id]);
        start += 2;
    }

    var base = is_redirect ? parts[2] : name;

    return {
        is_nsfw: !!is_nsfw,
        subreddit: bpm_data.sr_id2name[source_id],
        size: size,
        tags: tags,
        css_class: "bpmote-" + sanitize_emote(name.slice(1)),
        base: base
    };
}

/*
 * Escapes an emote name (or similar) to match the CSS classes.
 *
 * Must be kept in sync with other copies, and the Python code.
 */
function sanitize_emote(s) {
    return s.toLowerCase().replace("!", "_excl_").replace(":", "_colon_").replace("#", "_hash_").replace("/", "_slash_");
}
