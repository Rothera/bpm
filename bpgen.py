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

def resolve_emotes(files, config, tagdata):
    sorting_rules = config.pop("Sorting")
    conflict_rules = config.pop("Conflicts")

    # Converts a list of files into one big emote map
    emotes = {}
    sources = {}
    conflicts = {}
    drops = {}

    # Process directives
    for rule in config["Generation"]:
        cmd, args = rule[0], rule[1:]
        if cmd == "AddCSS":
            source, name, variant, css = args
            files[source].emotes[name][variant].css.update(css)
        elif cmd == "MergeEmotes":
            target, merge, merge_tags = args
            # Simple way to load a dict like this
            merge_sr = bplib.objects.Subreddit.load_from_data(target, merge, merge_tags)
            files[target].emotes.update(merge_sr.emotes)
            files[target].tag_data.update(merge_sr.tag_data)
        else:
            print("ERROR: Unknown directive: %r" % (rule))

    # Sort all emotes by prioritization
    for file in files.values():
        for (name, emote) in list(file.emotes.items()):
            all_tags = emote.all_tags(tagdata)
            if "+remove" in all_tags:
                # Removed emote: ignore completely
                del file.emotes[name]
                continue
            elif "+drop" in all_tags:
                # Unique emote: win unconditionally
                assert name not in drops
                drops[name] = file.name
                emotes[name] = [emote]
                sources[name] = [file]
                # Any prior conflict has been resolved
                if name in conflicts:
                    del conflicts[name]
                continue

            if name in emotes:
                # Ignore dropped ones
                if "+drop" in emotes[name][0].all_tags(tagdata):
                    del file.emotes[name]
                    continue
                else:
                    # Conflict resolution: who wins?
                    result = overrides(sorting_rules, conflict_rules, sources[name][0].name, file.name, name)
                    if result is True:
                        # This one wins. Put it first
                        if name in conflicts:
                            del conflicts[name]
                        emotes[name].insert(0, emote)
                        sources[name].insert(0, file)
                    elif result is False:
                        # Lost. Move to end (or anywhere, really)
                        emotes[name].append(emote)
                        sources[name].append(file)
                    elif result is None:
                        # ?!? previous file wins I guess. Move to end
                        conflicts[name] = (file, sources[name][0])
                        emotes[name].append(emote)
                        sources[name].append(file)
            else:
                emotes[name] = [emote]
                sources[name] = [file]

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

def build_tag_map(emotes, tagdata):
    tag_id2name = {}
    tag_name2id = {}
    next_id = 0

    for (name, emote_set) in emotes.items():
        for emote in emote_set:
            for tag in emote.all_tags(tagdata):
                if tag not in tag_name2id:
                    tag_id2name[next_id] = tag
                    tag_name2id[tag] = next_id
                    next_id += 1

    for (name, aliases) in tagdata["TagAliases"].items():
        for alias in aliases:
            if alias in tag_name2id:
                # Don't ever overwrite a tag
                assert tag_name2id[alias] == tag_name2id[name]
            tag_name2id[alias] = tag_name2id[name]

    return tag_id2name, tag_name2id

def build_js_map(config, tagdata, emotes, sources, tag_name2id):
    emote_map = {}
    matchdicts = {}
    for (name, emote_set) in emotes.items():
        emote = emote_set[0]
        file = sources[name][0]

        assert name not in emote_map
        if file not in matchdicts:
            matchconfig = config["RootVariantEmotes"].get(file.name, {})
            matchdicts[file] = file.match_variants(matchconfig)
        matches = matchdicts[file]
        base = emote.base_variant()
        root = matches[emote]
        all_tags = matches[emote].all_tags(tagdata) | emote.all_tags(tagdata)
        is_nsfw = "+nsfw" in emote.all_tags(tagdata)
        tags = [tag for tag in all_tags if tag not in tagdata["HiddenTags"]]
        tag_ids = [tag_name2id[tag] for tag in tags]
        assert all(id < 256 for id in tag_ids) # Only use one byte...
        size = max(base.size) if hasattr(base, "size") else 0
        encoded_tags = "".join("%02x" % id for id in tag_ids)
        # NRRSSSS+tags where N=nsfw, RR=subreddit, SSSS=size
        encoded_data = "%1i%02i%04x%s" % (is_nsfw, file.file_id, size, encoded_tags)
        emote_map[name] = encoded_data
    return emote_map

def build_sr_data(files):
    sr_id2name = {}
    sr_name2id = {}

    for (name, file) in files.items():
        sr_id2name[file.file_id] = name
        sr_name2id[name] = file.file_id

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
    _dump_js_obj(file, "tag_id2name", tag_id2name)
    _dump_js_obj(file, "tag_name2id", tag_name2id)
    # exports is used in Firefox main.js, but doesn't exist elsewhere
    file.write("if(typeof(exports) !== 'undefined') {\n")
    file.write("    exports.sr_id2name = sr_id2name;\n")
    file.write("    exports.sr_name2id = sr_name2id;\n")
    file.write("}\n")
    _dump_js_obj(file, "emote_map", js_map)

def _dump_js_obj(file, var_name, obj):
    file.write("var %s = " % (var_name))
    strings = ["%r:%r" % i for i in sorted(obj.items())]
    data = "{\n" + ",\n".join(strings) + "\n};\n"
    file.write(data)

### Main

def main():
    parser = argparse.ArgumentParser(description="Generate addon data files from emotes")
    parser.add_argument("-j", "--js", help="Output JS data file", default="build/bpm-data.js")
    parser.add_argument("-c", "--css", help="Output CSS file", default="build/emote-classes.css")
    parser.add_argument("--no-compress", help="Disable CSS compression", action="store_true")
    args = parser.parse_args()

    files = {}

    with open("data/rules.yaml") as file:
        config = bplib.load_yaml_file(file)
    with open("data/tags.yaml") as file:
        tagdata = bplib.load_yaml_file(file)

    print("Loading emotes")
    loader = bplib.objects.SubredditLoader()
    for subreddit in config["Subreddits"]:
        file = loader.load_subreddit(subreddit)
        if file is None:
            continue
        files[file.name] = file

    print("Processing")
    emotes, sources = resolve_emotes(files, config, tagdata)

    css_rules = build_css([emote_set[0] for emote_set in emotes.values()])
    tag_id2name, tag_name2id = build_tag_map(emotes, tagdata)
    js_map = build_js_map(config, tagdata, emotes, sources, tag_name2id)
    sr_id2name, sr_name2id = build_sr_data(files)
    if not args.no_compress:
        bplib.condense.condense_css(css_rules)

    print("Dumping")
    with open(args.css, "w") as file:
        dump_css(file, css_rules)
    with open(args.js, "w") as file:
        dump_js_data(file, js_map, sr_id2name, sr_name2id, tag_id2name, tag_name2id)

if __name__ == "__main__":
    main()
