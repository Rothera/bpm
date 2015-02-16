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

def overrides(sorting_rules, conflict_rules, base, new, name):
    for rule in sorting_rules:
        if rule == [base, "*"]: # Old subreddit wins all
            return False
        elif rule == [new, "*"]: # New subreddit wins all
            return True
        elif rule == [base, new]: # Old subreddit wins vs. new
            return False
        elif rule == [new, base]: # New subreddit wins vs. old
            return True

    if name in conflict_rules:
        # Does either subreddit explicitly win for this emote?
        favor = conflict_rules[name]
        if favor == base:
            return False
        elif favor == new:
            return True

    # No solution
    return None

def resolve_emotes(context):
    sorting_rules = context.config["Sorting"]
    conflict_rules = context.config["Conflicts"]

    # Process directives
    for rule in context.config["Generation"]:
        cmd, args = rule[0], rule[1:]
        if cmd == "AddCSS":
            source_name, name, variant, css = args
            var = context.sources[source_name].emotes[name].variants[variant]
            # HACK
            if var.css is None:
                var.data["CSS"] = {}
            var.css.update(css)
        elif cmd == "MergeEmotes":
            target_name, merge, merge_tags = args
            target = context.sources[target_name]
            target.merge(merge, merge_tags)
        else:
            print("ERROR: Unknown directive: %r" % (rule))

    emotes = {}
    all_emotes = {}
    conflicts = {}

    # Sort all emotes by prioritization
    for source in context.sources.values():
        for emote in source.emotes.values():
            all_emotes.setdefault(emote.name, []).append(emote)
            if source.is_ignored(emote):
                continue

            if emote.name in emotes:
                existing = emotes[emote.name]
                # Conflict resolution: who wins?
                result = overrides(sorting_rules, conflict_rules, existing.source.name, source.name, emote.name)
                if result is True:
                    # This one wins
                    if emote.name in conflicts:
                        del conflicts[emote.name]
                    emotes[emote.name] = emote
                elif result is False:
                    # Lost
                    pass
                elif result is None:
                    # ?!? previous source wins I guess
                    conflicts[emote.name] = (source, existing.source)
            else:
                emotes[emote.name] = emote

    for (name, (old, new)) in conflicts.items():
        print("ERROR: CONFLICT between %s and %s over %s" % (old.name, new.name, name))

    return emotes, all_emotes

def build_tag_map(all_emotes, context):
    tag_id2name = []
    tag_name2id = {}
    next_id = 0

    all_tags = set()
    for (name, emote_set) in all_emotes.items():
        for emote in emote_set:
            if emote.source.is_ignored(emote):
                continue
            all_tags |= emote.all_tags(context)
    all_tags -= set(context.tag_config["HiddenTags"])

    for tag in sorted(all_tags):
        if tag not in tag_name2id:
            tag_id2name.append(tag)
            tag_name2id[tag] = next_id
            next_id += 1
            assert len(tag_id2name) == next_id

    for (name, aliases) in context.tag_config["TagAliases"].items():
        for alias in aliases:
            if alias in tag_name2id:
                # Don't ever overwrite a tag
                assert tag_name2id[alias] == tag_name2id[name]
            tag_name2id[alias] = tag_name2id[name]

    return tag_id2name, tag_name2id

def build_sr_data(context):
    sr_id2name = []
    sr_name2id = {}

    for (name, source) in context.sources.items():
        sr_id2name.extend((source.source_id - len(sr_id2name) + 1) * [None])
        sr_id2name[source.source_id] = name
        sr_name2id[name] = source.source_id

    assert None not in sr_id2name

    return sr_id2name, sr_name2id
