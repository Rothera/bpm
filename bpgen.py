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
import bplib.file

### Directive application

def resolve_emotes(files, data):
    file_ignores = data.pop("File Ignores")
    sorting_rules = data.pop("Sorting")
    _conflict_rules = data.pop("Conflicts")
    directive_map = data.pop("Directives")
    emote_merges = data.pop("Merge")

    conflict_rules = {tuple(d["Name"]): d["Favor"] for d in _conflict_rules}

    def overrides(base, new, name_pair):
        for rule in sorting_rules:
            if rule == [base, "*"]: # Old subreddit wins all
                return False
            elif rule == [new, "*"]: # New subreddit wins all
                return True
            elif rule == [base, new]: # Old subreddit wins vs. new
                return False
            elif rule == [new, base]: # New subreddit wins vs. old
                return True

        if name_pair in conflict_rules:
            # Does either subreddit explicitly win for this emote?
            favor = conflict_rules[name_pair]
            if favor == base:
                return False
            elif favor == new:
                return True

        # No solution
        return None

    for filename in file_ignores:
        if filename in files:
            # Safer than deletion
            files[filename].emotes = {}

    for (filename, spritesheets) in emote_merges.items():
        if filename not in files:
            continue

        file = files[filename]
        for ss in bplib.file.convert_spritesheet_map(spritesheets):
            for emote in ss.emotes.values():
                emote.file = file # FIXME
            file.add_spritesheet(ss)

    # Converts a list of files into one big emote map
    emotes = {}
    sources = {}

    conflicts = {}

    # Sort all emotes by prioritization
    for file in files.values():
        for (name_pair, emote) in file.emotes.items():
            if name_pair in emotes:
                result = overrides(sources[name_pair], file.name, name_pair)
                if result:
                    # Get rid of the old one so it can't hurt anyone anymore
                    del files[sources[name_pair]].emotes[name_pair]
                    if name_pair in conflicts:
                        del conflicts[name_pair]
                    # Replace emote
                    emotes[name_pair] = emote
                    sources[name_pair] = file.name
                elif result is None:
                    # ?!? first file wins I guess
                    conflicts[name_pair] = (file.name, sources[name_pair])
            else:
                emotes[name_pair] = emote
                sources[name_pair] = file.name

    for (name_pair, (old, new)) in conflicts.items():
        print("ERROR: CONFLICT between %s and %s over %s" % (old, new, name_pair))

    # Apply custom directives
    for (filename, directives) in directive_map.items():
        if filename not in files:
            continue

        for d in directives:
            if isinstance(d, str):
                op = d
                args = ()
            else:
                op = d[0]
                args = d[1:]
            Directives[op](emotes, files[filename], *args)

    return emotes

def d_add_css(emotes, file, emote, css):
    emotes[parse_emote(emote)].css.update(css)

def d_mark_nsfw(emotes, file, *es):
    for e in es:
        file.emotes[parse_emote(e)].is_nsfw = True

def d_set_selector(emotes, file, emote, to):
    assert file.emotes[parse_emote(emote)].custom_selector is None
    file.emotes[parse_emote(emote)].custom_selector = to

def d_disable_css(emotes, file, emote):
    file.emotes[parse_emote(emote)].disable_css_gen = True

def d_remove_emote(emotes, file, emote):
    del emotes[parse_emote(emote)]
    del file.emotes[parse_emote(emote)]

def parse_emote(s):
    if isinstance(s, list):
        return tuple(s)
    else:
        return (s, None)

Directives = {
    "AddCSS": d_add_css,
    "MarkNSFW": d_mark_nsfw,
    "SetSelector": d_set_selector,
    "DisableCSS": d_disable_css,
    "Remove": d_remove_emote,
    }

### Generation

def build_css(emotes):
    css_rules = {}

    for emote in emotes.values():
        # FIXME
        if hasattr(emote, "disable_css_gen") and emote.disable_css_gen:
            continue

        selector, properties = emote.selector(), emote.to_css()
        if selector in css_rules:
            print("ERROR: Selector %r used twice!" % (selector))
        css_rules[selector] = properties

    return css_rules

def build_js_map(emotes):
    emote_map = {}

    for emote in emotes.values():
        if emote.suffix is not None:
            # Assume we should ignore- I can't think of when this isn't true
            continue

        assert emote.name not in emote_map
        emote_map[emote.name] = [int(emote.is_nsfw), emote.file.file_id]

    return emote_map

def build_sr_data(files):
    sr_id_map = {}
    sr_data = {}

    for (name, file) in files.items():
        sr_id_map[file.file_id] = name
        sr_data[name] = [file.display_name, file.file_id]

    return sr_id_map, sr_data

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

def dump_js_map(file, js_map):
    file.write(AutogenHeader)
    _dump_js_obj(file, "emote_map", js_map)

def dump_sr_data(file, sr_id_map, sr_data):
    file.write(AutogenHeader)
    _dump_js_obj(file, "sr_id_map", sr_id_map)
    _dump_js_obj(file, "sr_data", sr_data)
    # exports is used in Firefox main.js, but doesn't exist elsewhere
    file.write("if(typeof(exports) !== 'undefined') {\n")
    file.write("    exports.sr_id_map = sr_id_map;\n")
    file.write("    exports.sr_data = sr_data;\n")
    file.write("}\n")

def _dump_js_obj(file, var_name, obj):
    file.write("var %s = " % (var_name))
    strings = ["%r:%r" % i for i in sorted(obj.items())]
    data = "{\n" + ",\n".join(strings) + "\n};\n"
    file.write(data)

### Main

def main():
    parser = argparse.ArgumentParser(description="Generate addon data files from emotes")
    parser.add_argument("-j", "--js", help="Output emote map JS file", default="build/emote-map.js")
    parser.add_argument("-s", "--srdata", help="Output subreddit data JS file", default="build/sr-data.js")
    parser.add_argument("-c", "--css", help="Output CSS file", default="build/emote-classes.css")
    parser.add_argument("-d", "--directives", help="Processing directives",
                        default="data/emote-directives.yaml", type=argparse.FileType("r"))
    parser.add_argument("--no-compress", help="Disable CSS compression", action="store_true")
    parser.add_argument("emotes", help="Input emote files", nargs="+")
    args = parser.parse_args()

    files = {}

    print("Loading emotes")
    file_id = 0
    for (i, filename) in enumerate(args.emotes):
        with open(filename) as file:
            data = bplib.load_yaml_file(file)
            efile = bplib.file.EmoteFile.load(data)
            efile.file_id = file_id # FIXME
            for emote in efile.emotes.values(): emote.file = efile # FIXME
            files[efile.name] = efile
            file_id += 1

    print("Processing")
    emotes = resolve_emotes(files, bplib.load_yaml_file(args.directives))
    css_rules = build_css(emotes)
    js_map = build_js_map(emotes)
    sr_id_map, sr_data = build_sr_data(files)
    if not args.no_compress:
        bplib.condense.condense_css(css_rules)

    print("Dumping")
    with open(args.css, "w") as file:
        dump_css(file, css_rules)
    with open(args.js, "w") as file:
        dump_js_map(file, js_map)
    with open(args.srdata, "w") as file:
        dump_sr_data(file, sr_id_map, sr_data)

if __name__ == "__main__":
    main()
