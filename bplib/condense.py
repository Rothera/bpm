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

__all__ = ["condense_css"]

def condense_css(rules):
    # Make a copy for validation purposes
    base_rules = {sel: props.copy() for (sel, props) in rules.items()}

    # Locate all known CSS properties, and sort selectors by their value
    properties = {}
    for (selector, props) in rules.items():
        for (prop_name, prop_value) in props.items():
            properties.setdefault(prop_name, {}).setdefault(prop_value, [])
            properties[prop_name][prop_value].append(selector)

    def common_selectors(props):
        i = iter(props.items())

        try:
            (k, v) = next(i)
        except StopIteration:
            return set()
        common = set(properties.get(k, {}).get(v, []))

        for (k, v) in i:
            these = set(properties.get(k, {}).get(v, []))
            common = common.intersection(these)

        return common

    def condense(common_props):
        # Assume they're common
        selectors = common_selectors(common_props)
        if len(selectors) <= 1:
            return

        # len("property:value") for each property + semicolons
        props_chars = sum((len(key) + len(val) + 1) for (key, val) in common_props.items())

        # TODO: frozenset? probably doesn't matter if we sort
        sel_string = ",".join(sorted(selectors))

        chars_added = len(sel_string) + props_chars

        chars_removed = 0
        for sel in selectors:
            chars_removed += props_chars
            if len(rules[sel]) <= len(common_props):
                chars_removed += len(sel) + 2

        if chars_added > chars_removed:
            return

        existing_props = rules.setdefault(sel_string, {})
        if existing_props:
            # Ensure compatibility
            for (prop_name, value) in existing_props.items():
                # Don't overwrite anything not permitted
                if prop_name in common_props:
                    assert common_props[prop_name] == value

                # Don't bring anything in not expected
                for sel in selectors:
                    # Also fails if the property didn't exist before
                    assert base_rules[sel][prop_name] == value

        for (prop_name, value) in common_props.items():
            # Make sure we're not screwing anything up
            if prop_name in existing_props:
                print("WARNING: condensing same property twice", prop_name, "=", value)
                assert existing_props[prop_name] == value

            # Write property to rule
            existing_props[prop_name] = value
            properties[prop_name][value].append(sel_string)
            for selector in selectors:
                properties[prop_name][value].remove(selector)

            # Delete property from old rules
            for selector in selectors:
                rules[selector].pop(prop_name)
                # If it's empty, remove it entirely
                if not rules[selector]:
                    del rules[selector]

    # TODO: Would be nice to automatically seek out stuff we can efficiently
    # collapse, but for now, this achieves great gains for little complexity.

    # Remove all useless background-position's
    if "0px 0px" in properties.get("background-position", {}):
        for selector in properties["background-position"]["0px 0px"]:
            del rules[selector]["background-position"]
            if not rules[selector]:
                del rules[selector]
        del properties["background-position"]["0px 0px"]

    # Condense multi-emote spritesheets (probably most of our savings)
    for (image_url, selectors) in list(properties.get("background-image", {}).items()):
        if len(selectors) > 1:
            # For some reason, condensing these properties here gains more savings
            # than doing them separately. Oh well.
            condense({"background-image": image_url, "display": "block", "float": "left"})

    # Condense similar background-position's. Not likely to make a big difference
    # except for a few very similar spritesheet grids.
    for position in list(properties.get("background-position", {})):
        condense({"background-position": position})

    # Condense by width/height, since many emotes have the same dimensions
    for (width, w_selectors) in [(w, s) for (w, s) in properties.get("width", {}).items() if len(s) > 1]:
        for (height, h_selectors) in [(h, s) for (h, s) in properties.get("height", {}).items() if len(s) > 1]:
            if set(h_selectors).intersection(w_selectors): # Any in common? Try condensing the pair
                condense({"height": height, "width": width})

    for width in properties.get("width", {}):
        condense({"width": width})

    for height in properties.get("height", {}):
        condense({"height": height})

    # Locate and combine identical rules
    for (selector, props) in rules.copy().items():
        condense(props.copy())
