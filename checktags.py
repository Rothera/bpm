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

import bplib
import bplib.json
import bplib.objects

context = bplib.objects.Context()
context.load_config()
context.load_sources()

drops = {}
dirty = set()
for source in context.sources.values():
    # Find nonexistent emotes (before we start dropping things...)
    missing = set(source._tag_data) - set(source.emotes)
    if missing:
        print("ERROR: In %s: The following emotes have tags, but do not exist: %s" % (source.name, " ".join(missing)))
        dirty.add(source)

for source in context.sources.values():
    for emote in source.dropped_emotes():
        if emote.tags:
            print("WARNING: In %s: %s is tagged, but marked as +drop in %s" % (source.name, emote.name, context.drops[emote.name].name))

def info_for(emote):
    if hasattr(emote, "info_set"):
        return emote.info_set()
    return None

variant_log = open("checktags-variants.log", "w")
for source in context.sources.values():
    print("%s:" % (source.name), file=variant_log)

    for emote in source.unignored_emotes():
        # Make sure it's tagged at all
        if not emote.tags:
            print("ERROR: In %s: %s has no tags" % (source.name, emote.name))
            continue # No sense continuing to complain

        # Check that exclusive tags aren't being used with any other tags
        # (except where permitted)
        for (ex, allowed) in context.tag_config["ExclusiveTags"].items():
            if ex in emote.tags:
                remaining = emote.tags - {ex} - set(allowed)
                if remaining:
                    print("WARNING: In %s: %s has the exclusive tag %s, but additionally: %s" % (source.name, emote.name, ex, " ".join(remaining)))
                    break

        # Check that implied tags aren't being given
        redundant_tags = emote.tags & emote.implied_tags(context)
        if redundant_tags:
            print("WARNING: In %s: %s has redundant tags %s" % (source.name, emote.name, " ".join(redundant_tags)))

        # Check that at least one root tag is specified
        roots = {tag for tag in emote.all_tags(context) if tag in context.tag_config["RootTags"]}
        if not roots:
            print("WARNING: In %s: %s has no root tags (set: %s)" % (source.name, emote.name, " ".join(emote.tags)))

    for emote in source.ignored_emotes():
        if emote.tags and emote.ignore:
            print("WARNING: In %s: %s is tagged, but ignored" % (source.name, emote.name))
            emote.tags = set()
            dirty.add(source)

    for error in source.match_variants():
        print("ERROR: In %s: %s" % (source.name, error))

    for (emote, base) in sorted(source.variant_matches.items(), key=lambda e: e[0].name):
        if emote is not base:
            if base is None:
                continue # Broken +v
            print("  %s <- %s" % (base.name, emote.name), file=variant_log)
variant_log.close()

for source in dirty:
    print("NOTICE: Rewriting %s to eliminate loose tags" % (source.name))
    path = "tags/%s.json" % (source.name.split("/")[-1])
    file = open(path, "w")
    bplib.json.dump(source.dump_tags(), file, indent=0, max_depth=1, sort_keys=True)
