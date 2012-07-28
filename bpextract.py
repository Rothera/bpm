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
import re
import sys

import yaml

def parse_css(text):
    while True:
        rule, text = parse_block(text)
        if rule is None:
            break
        else:
            yield rule

def parse_block(text):
    # Go up to first "{", then "}"
    if not text.strip():
        return None, None
    selectors, text = text.split("{", 1)
    props, text = text.split("}", 1)

    return (parse_selectors(selectors), parse_properties(props)), text

def parse_selectors(string):
    selectors = string.split(",")
    return filter(None, [parse_selector(sel) for sel in selectors])

def parse_selector(string):
    string = string.strip()

    if string.startswith("a:hover") or string.endswith(":hover"):
        print("NOTICE: Emote selector requires manual handling:", string)
        string = string.replace(":hover", "")
        suffix = ":hover"
    elif string.startswith("a:active") or string.endswith(":active"):
        print("NOTICE: Emote selector requires manual handling:", string)
        string = string.replace(":active", "")
        suffix = ":active"
    else:
        suffix = ""

    # There's one emote that includes a ":" as part of the name...
    m = re.match(r'a\[href\|?="(/[\w:]+)"\]$', string)
    if m is None:
        raise ValueError(string)
    return m.group(1) + suffix

def parse_properties(text):
    prop_strings = text.split(";")
    props = {}
    for s in prop_strings:
        s = s.replace("!important", "") # FIXME: this may be bad
        key, val = s.split(":", 1)
        props[key.strip()] = val.strip()
    return props

def split_rules(rules):
    emotes = {}

    for (names, properties) in rules:
        for name in names:
            if name not in emotes:
                emotes[name] = properties.copy()
            else:
                emotes[name].update(properties)

    return emotes

def get_prop(d, k, n=1, *default):
    if k in d:
        parts = d[k].split()

        if "!important" in parts:
            parts.remove("!important")

        if len(parts) != n:
            raise ValueError(d[k])

        if n == 1:
            return parts[0]
        else:
            return parts
    elif default:
        return default[0]
    else:
        raise KeyError(k)

def pop_prop(d, k, n=1, *default):
    tmp = get_prop(d, k, n, *default)
    if k in d:
        d.pop(k)
    return tmp

def verify_prop(name, props, key, value, default=False):
    try:
        v = pop_prop(props, key)
    except KeyError:
        if default:
            print("WARNING: %s is missing %s: %s; fixing" % (name, key, value))
            return
        else:
            raise ValueError(name, key)

    if v != value:
        raise ValueError(name, key)

def parse_url(s):
    if not (s.startswith("url(") and s.endswith(")")):
        raise ValueError(s)
    return s[4:-1]

def parse_size(s):
    if s.endswith("px"):
        s = s[:-2]
    return int(s)

def parse_emote(name, props):
    props = props.copy()

    verify_prop(name, props, "display", "block")
    verify_prop(name, props, "clear", "none")
    verify_prop(name, props, "float", "left", True)

    try:
        width = parse_size(pop_prop(props, "width"))
        height = parse_size(pop_prop(props, "height"))
    except KeyError as e:
        raise ValueError(name, e.args[0])

    assert width > 0 and height > 0

    # FIXME: It's only safe to do this if it's the only one in the sheet,
    # otherwise it might just be missing (e.g. defined in the big list, but
    # never positioned).
    #
    # I hope this hasn't caused any problems, as it's too late to re-check
    # everything against this bug.
    #x_pos, y_pos = map(parse_size, pop_prop(props, "background-position", 2, ["0px", "0px"]))
    x_pos, y_pos = map(parse_size, pop_prop(props, "background-position", 2))
    if x_pos > 0 or y_pos > 0:
        print("WARNING: positive spritesheet offsets in", name)

    positioning = [width, height, x_pos, y_pos]
    image_url = parse_url(pop_prop(props, "background-image"))

    for (k, v) in props.items():
        print("WARNING: Unknown extra property on %s:" % (name), repr(k), repr(v))

    emote = {"Positioning": positioning, "Spritesheet": image_url}
    if props:
        emote["Extra CSS"] = props

    return emote

def process_special(name, src, props, src_props):
    print("NOTICE: Attempting to process %s (source %s)" % (name, src))
    tmp = src_props.copy()
    tmp.update(props)
    props.clear()
    props.update(tmp)

def read_spritesheets(css):
    rules = list(parse_css(css))
    raw_emotes = split_rules(rules)

    emotes = {}
    specials = []
    for (name, props) in raw_emotes.items():
        if name.endswith(":hover") or name.endswith(":active"):
            specials.append(name)
        else:
            emotes[name] = parse_emote(name, props)

    for special in specials:
        src = special.replace(":hover", "").replace(":active", "")
        process_special(special, src, raw_emotes[special], raw_emotes[src])
        emotes[special] = parse_emote(special, raw_emotes[special])

    spritesheets = {}

    for (name, props) in emotes.items():
        image = props.pop("Spritesheet")
        if image in spritesheets:
            spritesheets[image][name] = props
        else:
            spritesheets[image] = {name: props}

    return spritesheets

def main():
    parser = argparse.ArgumentParser(description="Generates a .yaml emote file from CSS source")
    parser.add_argument("css", help="Input CSS file", type=argparse.FileType("r"))
    parser.add_argument("yaml", help="Output YAML file", type=argparse.FileType("w"))
    args = parser.parse_args()

    spritesheets = read_spritesheets(args.css.read())
    args.yaml.write(yaml.dump({"Spritesheets": spritesheets}, indent=4))

if __name__ == "__main__":
    main()
