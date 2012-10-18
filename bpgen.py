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
import time

import bplib
import bplib.condense
import bplib.objects

### Directive application

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

    # Converts a list of files into one big emote map
    emotes = {}
    sources = {}
    conflicts = {}

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

    # Sort all emotes by prioritization
    for source in data_manager.sources.values():
        for emote in source.unignored_emotes(data_manager):
            all_tags = emote.all_tags(data_manager)

            if emote.name in emotes:
                # Conflict resolution: who wins?
                result = overrides(sorting_rules, conflict_rules, sources[emote.name][0].name, source.name, emote.name)
                if result is True:
                    # This one wins. Put it first
                    if emote.name in conflicts:
                        del conflicts[emote.name]
                    emotes[emote.name].insert(0, emote)
                    sources[emote.name].insert(0, source)
                elif result is False:
                    # Lost. Move to end (or anywhere, really)
                    emotes[emote.name].append(emote)
                    sources[emote.name].append(source)
                elif result is None:
                    # ?!? previous source wins I guess. Move to end
                    conflicts[emote.name] = (source, sources[emote.name][0])
                    emotes[emote.name].append(emote)
                    sources[emote.name].append(source)
            else:
                emotes[emote.name] = [emote]
                sources[emote.name] = [source]

    for (name, (old, new)) in conflicts.items():
        print("ERROR: CONFLICT between %s and %s over %s" % (old.name, new.name, name))

    return emotes, sources

### Generation

def build_css(emotes):
    css_rules = {}

    for emote in emotes:
        for variant in emote.variants.values():
            selector, properties = variant.selector(), variant.to_css()
            if selector in css_rules and css_rules[selector] != properties:
                print("ERROR: Selector %r used twice!" % (selector))
            css_rules[selector] = properties

    return css_rules

def build_tag_map(emotes, data_manager):
    tag_id2name = []
    tag_name2id = {}
    next_id = 0

    all_tags = set()
    for (name, emote_set) in emotes.items():
        for emote in emote_set:
            all_tags |= emote.all_tags(data_manager)

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

FLAG_NSFW = 1
FLAG_REDIRECT = 1 << 1

def encode(data_manager, source, emote, tag_name2id):
    base = emote.base_variant()
    root = source.variant_matches[emote]
    all_tags = root.all_tags(data_manager) | emote.all_tags(data_manager)
    emitted_tags = [tag for tag in all_tags if tag not in data_manager.tag_config["HiddenTags"]]
    tag_ids = sorted(tag_name2id[tag] for tag in emitted_tags)
    assert all(id < 0xff for id in tag_ids) # One byte per
    size = max(base.size) if hasattr(base, "size") else 0
    is_nsfw = "+nsfw" in all_tags
    assert ("+v" in emote.tags) == (emote.name != root.name)
    is_redirect = emote.name != root.name

    # FRRSSSSTT+[//base] where F=flags, RR=subreddit, SSSS=size, TT=tags
    flags = 0
    if is_nsfw:
        flags |= FLAG_NSFW
    if is_redirect:
        flags |= FLAG_REDIRECT
    encoded_tags = "".join("%02x" % id for id in tag_ids)
    data = "%1x%02i%04x%s" % (flags, source.source_id, size, encoded_tags)
    if is_redirect:
        data += "/" + root.name

    return data

def build_js_map(data_manager, emotes, sources, tag_name2id):
    emote_map = {}
    for (name, emote_set) in emotes.items():
        emote = emote_set[0]
        source = sources[name][0]
        assert name not in emote_map
        if source.variant_matches is None:
            source.match_variants(data_manager)
        data = encode(data_manager, source, emote, tag_name2id)
        emote_map[name] = data
    return emote_map

def build_sr_data(data_manager):
    sr_id2name = []
    sr_name2id = {}

    for (name, source) in data_manager.sources.items():
        sr_id2name.extend((source.source_id - len(sr_id2name) + 1) * [None])
        sr_id2name[source.source_id] = name
        sr_name2id[name] = source.source_id

    assert None not in sr_id2name

    return sr_id2name, sr_name2id

AutogenHeader = """
/*
 * This file is AUTOMATICALLY GENERATED. DO NOT EDIT.
 * Generated at %s.
 */

""" % (time.strftime("%c"))

def dump_css(file, rules):
    file.write(AutogenHeader)
    for (selector, properties) in rules.items():
        property_strings = ["%s:%s" % i for i in properties.items()]
        s = "%s{%s}\n" % (selector, ";".join(property_strings))
        file.write(s)

def dump_js_data(file, js_map, sr_id2name, sr_name2id, tag_id2name, tag_name2id):
    file.write(AutogenHeader)
    _dump_js_obj(file, "sr_id2name", sr_id2name)
    _dump_js_obj(file, "sr_name2id", sr_name2id)
    # exports is used in Firefox main.js, but doesn't exist elsewhere
    file.write("if(typeof(exports) !== 'undefined') {\n")
    file.write("    exports.sr_id2name = sr_id2name;\n")
    file.write("    exports.sr_name2id = sr_name2id;\n")
    file.write("}\n")
    _dump_js_obj(file, "tag_id2name", tag_id2name)
    _dump_js_obj(file, "tag_name2id", tag_name2id)
    _dump_js_obj(file, "emote_map", js_map)

def _dump_js_obj(file, var_name, obj):
    file.write("var %s = " % (var_name))
    json.dump(obj, file, indent=0, separators=(",", ":"))
    file.write(";\n")

### Main

def main():
    parser = argparse.ArgumentParser(description="Generate addon data files from emotes")
    parser.add_argument("-j", "--js", help="Output JS data file", default="build/bpm-data.js")
    parser.add_argument("-c", "--css", help="Output CSS file", default="build/emote-classes.css")
    parser.add_argument("--no-compress", help="Disable CSS compression", action="store_true")
    args = parser.parse_args()

    files = {}

    print("Loading emotes")
    data_manager = bplib.objects.DataManager()
    data_manager.load_all_sources()

    print("Processing")
    emotes, sources = resolve_emotes(data_manager)

    css_rules = build_css([emote_set[0] for emote_set in emotes.values()])
    tag_id2name, tag_name2id = build_tag_map(emotes, data_manager)
    js_map = build_js_map(data_manager, emotes, sources, tag_name2id)
    sr_id2name, sr_name2id = build_sr_data(data_manager)
    if not args.no_compress:
        bplib.condense.condense_css(css_rules)

    print("Dumping")
    with open(args.css, "w") as file:
        dump_css(file, css_rules)
    with open(args.js, "w") as file:
        dump_js_data(file, js_map, sr_id2name, sr_name2id, tag_id2name, tag_name2id)

if __name__ == "__main__":
    main()
