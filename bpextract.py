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

    sr_key = os.path.splitext(os.path.basename(args.css.name))[0]

    data_manager = bplib.objects.DataManager()
    ext_config = data_manager.config["Extraction"].get(sr_key, {})

    css_rules = list(bplib.css.parse_css_file(args.css))
    if ext_config.get("RespectIgnore", True):
        bplib.extract.filter_ponyscript_ignores(css_rules)
    partial_emotes = bplib.extract.extract_partial_emotes(css_rules)
    emotes = bplib.extract.combine_partial_emotes(partial_emotes)
    bplib.extract.check_variants(emotes)
    bplib.extract.classify_emotes(emotes)

    source = bplib.objects.Source("r/" + sr_key, emotes)

    yaml.dump(source.dump_emote_data(), args.emotes)

if __name__ == "__main__":
    main()
