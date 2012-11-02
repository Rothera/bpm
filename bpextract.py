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

import bplib
import bplib.css
import bplib.extract
import bplib.json
import bplib.objects

def main():
    parser = argparse.ArgumentParser(description="Extract emotes from subreddit CSS")
    parser.add_argument("css", help="Input CSS file", type=argparse.FileType(mode="r"))
    parser.add_argument("emotes", help="Output emotes file", type=argparse.FileType(mode="w"))
    args = parser.parse_args()

    sr_key = os.path.splitext(os.path.basename(args.css.name))[0]

    context = bplib.objects.Context()
    context.load_config()
    ext_config = context.config["Extraction"].get(sr_key, {})

    css_rules = list(bplib.css.parse_css_file(args.css))
    if ext_config.get("RespectIgnore", True):
        bplib.extract.filter_ponyscript_ignores(css_rules)
    emote_blocks = bplib.extract.extract_emote_blocks(css_rules)
    emote_data = bplib.extract.combine_emote_blocks(emote_blocks)
    emotes = bplib.extract.classify_emotes(emote_data)
    bplib.extract.check_variants(emotes)

    source = bplib.objects.Source("r/" + sr_key, emotes)

    bplib.json.dump(source.dump(), args.emotes, indent=2, max_depth=1, sort_keys=True)

if __name__ == "__main__":
    main()
