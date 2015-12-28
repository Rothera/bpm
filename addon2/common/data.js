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

function lookup_emotes(emotes) {
    for(var name in emotes) {
        console.log("Looking up emote:", name);
        emotes[name] = decode_emote(name);
    }
    return emotes;
}

var FLAG_NSFW = 1;
var FLAG_REDIRECT = 1 << 1;

function decode_emote(name) {
    var data = bpm_data.emote_map[name];
    if(!data) {
        return null;
    }

    var parts = data.split(",");

    var flag_data = parts[0];

    var flags = parseInt(flag_data.slice(0, 1), 16);     // Hexadecimal
    var source_id = parseInt(flag_data.slice(1, 3), 16); // Hexadecimal
    var size = parseInt(flag_data.slice(3, 7), 16);      // Hexadecimal

    var is_nsfw = (flags & FLAG_NSFW);
    var is_redirect = (flags & FLAG_REDIRECT);

    var subreddit_name = bpm_data.sr_id2name[source_id];

    var tag_data = parts[1];
    var tags = [];

    for(var start = 0; start < tag_data.length; start += 2) {
        var str = tag_data.slice(start, start+2);
        var tag_id = parseInt(str, 16); // Hexadecimal
        var tag_name = bpm_data.tag_id2name[tag_id];
        tags.push(tag_name);
    }

    var base = is_redirect ? parts[2] : name;

    var info = {
        nsfw: !!is_nsfw,
        subreddit: subreddit_name,
        size: size,
        tags: tags,
        base: base
    };

    return info;
}
