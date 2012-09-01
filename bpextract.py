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

import yaml

import bplib
import bplib.css
import bplib.extract
import bplib.file

def main():
    parser = argparse.ArgumentParser(description="Extract emotes from subreddit CSS")
    parser.add_argument("-n", "--name", help="Emote section")
    parser.add_argument("-d", "--displayname", help="display name")
    parser.add_argument("css", help="Input CSS file", type=argparse.FileType(mode="r"))
    parser.add_argument("emotes", help="Output emotes file", type=argparse.FileType(mode="w"))
    parser.add_argument("-e", "--extract", help="Extract specific emote", action="append", default=[])
    args = parser.parse_args()

    # Load CSS
    css_rules = list(bplib.css.parse_css_file(args.css))
    bplib.extract.filter_ponyscript_ignores(css_rules)

    # Extract raw emote data
    partial_emotes = bplib.extract.extract_raw_emotes(args.extract, css_rules)
    emote_map = bplib.extract.build_emote_map(partial_emotes)
    bplib.extract.collapse_specials_properties(emote_map)

    # Process emotes
    normal_emotes, custom_emotes = bplib.extract.classify_emotes(emote_map)
    spritesheets = bplib.extract.build_spritesheet_map(normal_emotes)

    # Generate output file
    base_name = os.path.splitext(os.path.basename(args.css.name))[0]
    name = args.name or "r_%s" % (base_name)
    display_name = args.displayname or "r/%s" % (base_name)
    assert "/" not in name # TODO: be more restrictive
    file = bplib.file.EmoteFile(name, display_name, custom_emotes, spritesheets.values())

    yaml.dump(file.dump(), args.emotes)

if __name__ == "__main__":
    main()
