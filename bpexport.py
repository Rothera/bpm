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
import bplib.json

import bplib.objects
import bplib.resolve

def dump_json(context, emotes):
    data = {}
    for (name, emote) in emotes.items():
        if emote.source.variant_matches is None:
            emote.source.match_variants()
        info = encode(emote, context)
        data[name] = info
    return data

def encode(emote, context):
    # Info: is_nsfw?, source, size, tags
    base = emote.base_variant()
    root = emote.source.variant_matches[emote]
    all_tags = root.all_tags(context) | emote.all_tags(context)

    for tag in list(all_tags):
        all_tags |= set(context.tag_config["TagAliases"].get(tag, []))

    is_nsfw = "+nsfw" in all_tags
    size = max(base.size) if hasattr(base, "size") else 0
    emitted_tags = [tag for tag in all_tags if tag not in context.tag_config["HiddenTags"]]

    info = {"source": emote.source.name, "tags": emitted_tags, "size": size}
    if is_nsfw:
        info["is_nsfw"] = is_nsfw
    if base.css:
        info["css"] = base.css
    if hasattr(base, "image_url"): # FIXME
        info["image_url"] = base.image_url
        info["size"] = base.size
        info["offset"] = base.offset
    if emote.name != root.name: # Redirect
        info["primary"] = root.name
    return info

def main():
    parser = argparse.ArgumentParser(description="Export processed emote data")
    parser.add_argument("-js", "--json", help="Output file", default="export.json")
    args = parser.parse_args()

    print("Loading emotes")
    context = bplib.objects.Context()
    context.load_config()
    context.load_sources()

    print("Processing")
    emotes, all_emotes = bplib.resolve.resolve_emotes(context)

    data = dump_json(context, emotes)

    print("Dumping")
    with open(args.json, "w") as file:
        bplib.json.dump(data, file, indent=0, max_depth=1, sort_keys=True)

if __name__ == "__main__":
    main()
