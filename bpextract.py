#!/usr/bin/env python3
# -*- coding: utf8 -*-
################################################################################
##
## Copyright (C) 2012 Typhos
##
## This Source Code Form is subject to the terms of the Mozilla Public
## License, v. 2.0. If a copy of the MPL was not distributed with this
## file, You can obtain one at http://mozilla.org/MPL/2.0/.
##
################################################################################

import argparse
import os.path
import re
import time

import yaml

import bplib
import bplib.css
import bplib.extract

### Spritesheeting

def build_spritesheet_map(emotes):
    spritesheets = {}

    for (name_pair, raw_emote) in emotes.items():
        image_url = get_url(bplib.css.get_prop(raw_emote.css.pop("background-image")))
        if image_url not in spritesheets:
            spritesheets[image_url] = {}
        spritesheets[image_url][name_pair] = convert_emote(name_pair, image_url, raw_emote)

    for (image_url, ss_map) in spritesheets.items():
        verify_spritesheet(image_url, ss_map)

    return spritesheets

def get_url(text):
    if text.startswith("url(") and text.endswith(")"):
        return text[4:-1]
    raise ValueError("Invalid URL")

def convert_emote(name_pair, image_url, raw_emote):
    css = raw_emote.css.copy()
    def try_pop(prop):
        if prop in css:
            del css[prop]

    try_pop("display")
    try_pop("clear")
    try_pop("float")

    width = parse_size(bplib.css.get_prop(css.pop("width")))
    height = parse_size(bplib.css.get_prop(css.pop("height")))
    size = (width, height)

    if "background-position" in css:
        offset = parse_position(bplib.css.get_prop(css["background-position"]), width, height)
        del css["background-position"]
    else:
        offset = None

    # Remove some annoying, commonly seen properties
    for p in ("background-repeat",):
        if p in css:
            del css[p]
    for p in css:
        # These properties are also included a lot, so omitted from logs for brevity.
        if p not in ("margin-left", "margin-right"):
            print("WARNING: emote %r has extra property %r (%r)" % (name_pair, p, css[p]))

    return bplib.Emote(name_pair[0], name_pair[1], css, size, offset, image_url)

def parse_size(sz):
    # Plain numbers are typically zero, though there are some unusual emotes
    # with positive offsets
    if sz.endswith("px"):
        sz = sz[:-2]
    return int(sz)

def parse_position(pos, width, height):
    (str_x, str_y) = pos.split()
    return (parse_pos(str_x, width), parse_pos(str_y, height))

def parse_pos(s, size):
    # Hack to handle percentage values, which are essentially multiples of the
    # width/height. Used in r/mylittlelistentothis for some crazy reason.
    if s[-1] == "%":
        # Non-multiples of 100 won't work too well here, but who would do that
        # anyway
        return int(int(s[:-1]) / 100.0 * size)
    else:
        return parse_size(s)

def verify_spritesheet(image_url, emotes):
    # Ensure that all emotes have a bg-position. Only one may lack one.
    unpositioned_emotes = []
    for (name_pair, emote) in emotes.items():
        if emote.offset is None:
            emote.offset = (0, 0)
            unpositioned_emotes.append(name_pair)

    if len(unpositioned_emotes) > 1:
        print("ERROR: Multiple unsized emotes within spritesheet %r: %s" % (
            image_url, " ".join(map(repr, unpositioned_emotes))))

### Serialization

def generate_meta(src_filename, name, display_name):
    base_name = os.path.splitext(os.path.basename(src_filename))[0]
    name = name or "r_%s" % (base_name)
    display_name = display_name or "r/%s" % (base_name)
    assert "/" not in name # TODO: be more restrictive
    return {"Name": name, "DisplayName": display_name}

def convert_spritesheets(spritesheets):
    return {image_url: _convert_emote_map(ss) for (image_url, ss) in spritesheets.items()}

def _convert_emote_map(emotes):
    data = [emote.to_data() for emote in emotes.values()]
    data.sort(key=lambda e: e["Name"])
    return data

convert_customs = _convert_emote_map

### Main

def main():
    parser = argparse.ArgumentParser(description="Extract emotes from subreddit CSS")
    parser.add_argument("-n", "--name", help="Emote section")
    parser.add_argument("-d", "--displayname", help="display name")
    parser.add_argument("css", help="Input CSS file", type=argparse.FileType(mode="r"))
    parser.add_argument("emotes", help="Output emotes file", type=argparse.FileType(mode="w"))
    parser.add_argument("-e", "--extract", help="Extract specific emote", action="append", default=[])
    args = parser.parse_args()

    css_rules = list(bplib.css.parse_css_file(args.css))
    bplib.extract.filter_ponyscript_ignores(css_rules)
    partial_emotes = bplib.extract.extract_raw_emotes(args, css_rules)
    emote_map = bplib.extract.build_emote_map(partial_emotes)
    bplib.extract.collapse_specials_properties(emote_map)
    normal_emotes, custom_emotes = classify_emotes(emote_map)
    spritesheets = build_spritesheet_map(normal_emotes)

    data = {
        "Meta": generate_meta(args.css.name, args.name, args.displayname),
        "Emotes": {
            "Spritesheets": convert_spritesheets(spritesheets),
            "Custom": convert_customs(custom_emotes)
            }
        }
    yaml.dump(data, args.emotes)

if __name__ == "__main__":
    main()
