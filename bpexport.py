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
import json

import bplib.objects
import bplib.resolve

def dump_json(data_manager, emotes):
    data = {}
    for (name, emote) in emotes.items():
        source = data_manager.emote_sources[emote]
        if source.variant_matches is None:
            source.match_variants(data_manager)
        info = encode(emote, source, data_manager)
        data[name] = info
    return data

def encode(emote, source, data_manager):
    # Info: is_nsfw?, source, size, tags
    base = emote.base_variant()
    root = source.variant_matches[emote]
    all_tags = root.all_tags(data_manager) | emote.all_tags(data_manager)

    is_nsfw = "+nsfw" in all_tags
    size = max(base.size) if hasattr(base, "size") else 0
    emitted_tags = [tag for tag in all_tags if tag not in data_manager.tag_config["HiddenTags"]]

    info = {"source": source.name, "tags": emitted_tags, "size": size}
    if is_nsfw:
        info["is_nsfw"] = is_nsfw
    if base.css:
        info["css"] = base.css
    if hasattr(base, "image_url"): # FIXME
        info["image_url"] = base.image_url
        info["size"] = base.size
        info["offset"] = base.offset
    return info

def main():
    parser = argparse.ArgumentParser(description="Export processed emote data")
    parser.add_argument("-js", "--json", help="Output file", default="export.json")
    args = parser.parse_args()

    print("Loading emotes")
    data_manager = bplib.objects.DataManager()
    data_manager.load_all_sources()

    print("Processing")
    emotes, all_emotes = bplib.resolve.resolve_emotes(data_manager)

    data = dump_json(data_manager, emotes)

    print("Dumping")
    with open(args.json, "w") as file:
        json.dump(data, file, indent=0)

if __name__ == "__main__":
    main()
