#!/usr/bin/env python3
# -*- coding: utf8 -*-
################################################################################
##
## This file is part of BetterPonymotes.
## Copyright (c) 2012-2015 Typhos.
##
## This program is free software: you can redistribute it and/or modify it
## under the terms of the GNU Affero General Public License as published by
## the Free Software Foundation, either version 3 of the License, or (at your
## option) any later version.
##
## This program is distributed in the hope that it will be useful, but WITHOUT
## ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
## FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public License
## for more details.
##
## You should have received a copy of the GNU Affero General Public License
## along with this program.  If not, see <http://www.gnu.org/licenses/>.
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

known_tags = (set(context.tag_config["RootTags"]) |
              set(context.tag_config["ExclusiveTags"]) |
              set(context.tag_config["HiddenTags"]) |
              set(context.tag_config["TagImplications"]) |
              set(context.tag_config["OtherTags"]))
all_tags = set()

variant_log = open("checktags-variants.log", "w")
for source in sorted(context.sources.values(), key=lambda s: s.name):
    print("%s:" % (source.name), file=variant_log)

    for emote in sorted(source.unignored_emotes(), key=lambda e: e.name):
        all_tags |= emote.tags

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
        all_tags |= emote.tags

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

print("Unknown tags:", (all_tags - known_tags))
