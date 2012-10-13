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
import bplib.objects

def main():
    parser = argparse.ArgumentParser(description="Extract emotes from subreddit CSS")
    parser.add_argument("css", help="Input CSS file", type=argparse.FileType(mode="r"))
    parser.add_argument("emotes", help="Output emotes file", type=argparse.FileType(mode="w"))
    args = parser.parse_args()

    name = os.path.splitext(os.path.basename(args.css.name))[0]

    with open("data/rules.yaml") as file:
        config = bplib.load_yaml_file(file)
    extconfig = config["Extraction"].get(name, {})

    # Load CSS
    css_rules = list(bplib.css.parse_css_file(args.css))
    if extconfig.get("RespectIgnore", True):
        bplib.extract.filter_ponyscript_ignores(css_rules)

    # Extract raw emote data
    partial_emotes = bplib.extract.extract_partial_emotes(css_rules)
    emotes = bplib.extract.combine_partial_emotes(partial_emotes)
    bplib.extract.check_variants(emotes)

    # Process emotes
    bplib.extract.classify_emotes(emotes)

    # Generate output file
    file = bplib.objects.Subreddit(name, emotes, {})

    yaml.dump(file.dump_emotes(), args.emotes)

if __name__ == "__main__":
    main()
