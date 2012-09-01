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
    normal_emotes, custom_emotes = bplib.extract.classify_emotes(emote_map)
    spritesheets = bplib.extract.build_spritesheet_map(normal_emotes)

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
