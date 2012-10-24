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

def resolve_emotes(data_manager):
    sorting_rules = data_manager.config["Sorting"]
    conflict_rules = data_manager.config["Conflicts"]

    # Process directives
    for rule in data_manager.config["Generation"]:
        cmd, args = rule[0], rule[1:]
        if cmd == "AddCSS":
            source_name, name, variant, css = args
            data_manager.sources[source_name].emotes[name].variants[variant].css.update(css)
        elif cmd == "MergeEmotes":
            target_name, merge, merge_tags = args
            target = data_manager.sources[target_name]
            target.load_data(data_manager, merge, merge_tags)
        else:
            print("ERROR: Unknown directive: %r" % (rule))

    emotes = {}
    all_emotes = {}
    conflicts = {}

    # Sort all emotes by prioritization
    for source in data_manager.sources.values():
        for emote in source.emotes.values():
            all_emotes.setdefault(emote.name, []).append(emote)
            if source.is_ignored(emote, data_manager):
                continue

            if emote.name in emotes:
                existing = emotes[emote.name]
                prev_source = data_manager.emote_sources[existing]
                # Conflict resolution: who wins?
                result = overrides(sorting_rules, conflict_rules, prev_source.name, source.name, emote.name)
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
                    conflicts[emote.name] = (source, prev_source)
            else:
                emotes[emote.name] = emote

    for (name, (old, new)) in conflicts.items():
        print("ERROR: CONFLICT between %s and %s over %s" % (old.name, new.name, name))

    return emotes, all_emotes

def build_tag_map(all_emotes, data_manager):
    tag_id2name = []
    tag_name2id = {}
    next_id = 0

    all_tags = set()
    for (name, emote_set) in all_emotes.items():
        for emote in emote_set:
            source = data_manager.emote_sources[emote]
            if source.is_ignored(emote, data_manager):
                continue
            all_tags |= emote.all_tags(data_manager)
    all_tags -= set(data_manager.tag_config["HiddenTags"])

    for tag in sorted(all_tags):
        if tag not in tag_name2id:
            tag_id2name.append(tag)
            tag_name2id[tag] = next_id
            next_id += 1
            assert len(tag_id2name) == next_id

    for (name, aliases) in data_manager.tag_config["TagAliases"].items():
        for alias in aliases:
            if alias in tag_name2id:
                # Don't ever overwrite a tag
                assert tag_name2id[alias] == tag_name2id[name]
            tag_name2id[alias] = tag_name2id[name]

    return tag_id2name, tag_name2id

def build_sr_data(data_manager):
    sr_id2name = []
    sr_name2id = {}

    for (name, source) in data_manager.sources.items():
        sr_id2name.extend((source.source_id - len(sr_id2name) + 1) * [None])
        sr_id2name[source.source_id] = name
        sr_name2id[name] = source.source_id

    assert None not in sr_id2name

    return sr_id2name, sr_name2id
