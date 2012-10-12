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

import itertools
import os
import sys

import yaml

import bplib
import bplib.objects

config = bplib.load_yaml_file(open("data/rules.yaml"))
tagdata = bplib.load_yaml_file(open("data/tags.yaml"))

files = {}
loader = bplib.objects.SubredditLoader()
for subreddit in config["Subreddits"]:
    file = loader.load_subreddit(subreddit)
    if file is None:
        continue
    files[subreddit] = file

drops = {}
dirty = []
for (subreddit, file) in files.items():
    # Find nonexistent emotes (before we start dropping things...)
    missing = set(file.tag_data) - set(file.emotes)
    if missing:
        print("ERROR: In %s: The following emotes have tags, but do not exist: %s" % (subreddit, " ".join(missing)))
        dirty.append(subreddit)

    for (name, emote) in list(file.emotes.items()):
        # Handle +drop and +remove
        if "+drop" in emote.all_tags(tagdata):
            assert name not in drops
            drops[name] = subreddit
        elif "+remove" in emote.all_tags(tagdata):
            del file.emotes[name] # Remember never to save this file...

# Remove all copies of +drop emotes
for (subreddit, file) in files.items():
    for (name, src_subreddit) in drops.items():
        if name not in file.emotes or subreddit == src_subreddit:
            continue

        if file.emotes[name].tags:
            print("WARNING: In %s: %s is tagged, but marked as +drop in %s" % (subreddit, name, src_subreddit))

        del file.emotes[name] # Same

def info_for(emote):
    if hasattr(emote, "image_url"):
        return (emote.image_url, emote.offset[0], emote.offset[1], emote.size[0], emote.size[1])
    return None

variant_log = open("checktags-variants.log", "w")
for (subreddit, file) in files.items():
    print("r/%s:" % (subreddit), file=variant_log)
    core_emotes = {}
    variants = []

    for (name, emote) in list(file.emotes.items()):
        # Make sure it's tagged at all
        if not emote.tags:
            print("ERROR: In %s: %s has no tags" % (subreddit, name))
            continue # No sense continuing to complain

        # Check that exclusive tags aren't being used with any other tags
        # (except where permitted)
        for (ex, allowed) in tagdata["ExclusiveTags"].items():
            if ex in emote.tags:
                remaining = emote.tags - {ex} - set(allowed)
                if remaining:
                    print("WARNING: In %s: %s has the exclusive tag %s, but additionally: %s" % (subreddit, name, ex, " ".join(remaining)))
                    break

        # Check that implied tags aren't being given
        redundant_tags = emote.tags & emote.implied_tags(tagdata)
        if redundant_tags:
            print("WARNING: In %s: %s has redundant tags %s" % (subreddit, name, " ".join(redundant_tags)))

        # Check that at least one root tag is specified
        roots = {tag for tag in emote.all_tags(tagdata) if tag in tagdata["RootTags"]}
        if not roots:
            print("WARNING: In %s: %s has no root tags (set: %s)" % (subreddit, name, " ".join(emote.tags)))

        # Is it a variant?
        is_core = "+v" not in emote.tags

        info = info_for(emote.base_variant()) # Hmm...
        if info is not None:
            if is_core:
                core_emotes[info] = name
            else:
                variants.append((name, info))

    # Match up all variants
    for (name, info) in variants:
        base = None
        if info in core_emotes:
            base = core_emotes[info]
        else:
            # Try non-reversed name
            if name[:2].lower() == "/r":
                emote = file.emotes.get("/" + name[2:])
                if emote is not None:
                    info = info_for(emote.base_variant())
                    if info is not None and info in core_emotes:
                        base = core_emotes[info]

        if base is not None:
            print("  %s: %s" % (name, core_emotes[info]), file=variant_log)
        else:
            print("ERROR: In %s: Cannot locate root emote of %s" % (subreddit, name))
variant_log.close()

for subreddit in dirty:
    print("NOTICE: Rewriting %s to eliminate loose tags" % (files[subreddit].name))
    path = "tags/%s.yaml" % (subreddit)
    file = open(path, "w")
    yaml.dump(files[subreddit].dump_tags(), file)
