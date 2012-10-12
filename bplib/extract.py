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

__all__ = [
    "filter_ponyscript_ignores", "extract_partial_emotes",
    "combine_partial_emotes", "check_variants", "classify_emotes"
    ]

import re

import bplib
import bplib.css
import bplib.objects

def filter_ponyscript_ignores(css_rules):
    # Takes list of CssRule's and sets .ignore properties on them as appropriate.
    #
    # This function also warns if any rules are split up as a result.
    visible, hidden = set(), set()
    ignoring = False
    for rule in css_rules:
        # NOTE: As a very weird edge case, supposing this is combined with
        # other selectors, the entire block would be hidden. That's probably
        # the best thing to do, though.
        if "START-PONYSCRIPT-IGNORE" in rule.selectors:
            ignoring = True

        # Split-rule detection
        add_to, refuse_in = (hidden, visible) if ignoring else (visible, hidden)
        for selector in rule.selectors:
            add_to.add(selector)
            if selector in refuse_in:
                # FIXME: Since this code runs before emote extraction, this
                # warning goes off for non-emote rules. We should fix that.
                #
                # Maybe run an extraction phase that just edits rules a bit,
                # but doesn't combine them? Then this, and *then* combine things.
                print("WARNING: Selector %r split across PONYSCRIPT-IGNORE block!" % (selector))

        rule.ignore = ignoring

        # This goes down here, so that the END-PONYSCRIPT-IGNORE rule is itself
        # filtered out.
        if "END-PONYSCRIPT-IGNORE" in rule.selectors:
            ignoring = False

def extract_partial_emotes(css_rules):
    # Extracts partial emotes from a list of CSS rules.
    for rule in css_rules:
        if rule.ignore:
            continue

        alias_pairs = [_parse_emote_selector(s) for s in rule.selectors]
        if any(ap is None for ap in alias_pairs) and any(ap is not None for ap in alias_pairs):
            print("WARNING: CSS rule has both emotes and non-emote selectors")

        for pair in alias_pairs:
            if pair is None:
                continue

            name, suffix = pair

            # Copy CSS so it's not read-only
            yield bplib.objects.EmoteCSSBlock(name, suffix, rule.properties.copy())

_selector_regexp = re.compile(r"""
    a(?P<pc1>:[\w\-()]+)?
    \[href[|^]?=(?P<quote>["'])(?P<name>\/[\w:!#\/]+)(?P=quote)\] # Match quotes
    (?P<pc2>:[\w:\-()]+)?\s* # Accept : to get basically any non-space thing
    (?P<sel>[\w\s:\-()]*)$
    """, re.VERBOSE)

def _parse_emote_selector(selector):
    match = re.match(_selector_regexp, selector)
    if match is None:
        return None

    name = match.groupdict()["name"]
    pc1 = match.groupdict()["pc1"] or ""
    pc2 = match.groupdict()["pc2"] or ""
    sel = match.groupdict()["sel"].strip()

    # Generally, pc1 will be empty, but some emotes put :hover there. pc2 is
    # what we're chiefly interested in, and sel is used by image macros and
    # such.

    def verify_psuedo_class(pc):
        if pc == ":nth-of-type(n)":
            return "" # Drop this
        elif pc and pc not in (":hover", ":active"):
            print("WARNING: Unknown psuedo-class on %r" % (selector))
        return pc

    pc1 = verify_psuedo_class(pc1)
    pc2 = verify_psuedo_class(pc2)
    suffix = pc1 + pc2
    if sel:
        suffix += " " + sel

    return (name, suffix.strip() or None)

def combine_partial_emotes(partial_emotes):
    # Combines properties in partial emotes, producing a single emote map.
    emotes = {}
    for partial in partial_emotes:
        if partial.name not in emotes:
            # Newly seen emote
            emotes[partial.name] = bplib.objects.Emote(partial.name, {partial.suffix: partial}, {})
        elif partial.suffix not in emotes[partial.name]:
            # New suffix for an existing emote
            emotes[partial.name][partial.suffix] = partial
        else:
            # Existing emote. Check for property overwrites
            base = emotes[partial.name][partial.suffix]
            for (prop, value) in partial.css.items():
                if prop in base.css and bplib.css.prop(base.css[prop]) != bplib.css.prop(value):
                    print("WARNING: emote %r redefined property %r from base (from %r to %r)" % (
                        bplib.combine_name_pair(partial.name, partial.suffix), prop,
                        base.css[prop], partial.css[prop]))
            base.css.update(partial.css)
    return emotes

def check_variants(emotes):
    # Checks that a base emote exists for all names.
    # TODO: It might be nice to delete extra properties shared with the base
    # emote but this could be dangerous. Consider deleting properties on a
    # variant that are inherited (and being overridden back to default) from
    # another variant.
    for (name, emote) in list(emotes.items()):
        try:
            base = emote.base_variant()
        except ValueError as e:
            print("ERROR: Cannot locate base emote for %r. (Variants: %r)" % (name, list(emote.variants.keys())))
            del emotes[name]
            continue

def classify_emotes(emotes):
    # Sorts emotes based on whether or not they are "normal" emotes belonging to
    # a spritesheet, or "custom" ones possessing only arbitrary CSS.

    for (name, emote) in emotes.items():
        for (suffix, variant) in emote.variants.items():
            # Required properties (background-position is semi-required)
            if all(k in variant.css for k in ("background-image", "width", "height")):
                # Probably an emote. We could check for expected values of display/
                # clear/float, but they're broken in a lot of places, and not worth
                # the resulting warning spam.
                emote[suffix] = _convert_emote(name, suffix, variant)
            else:
                # Replace one class with another, essentially
                emote[suffix] = bplib.objects.CustomEmote(name, suffix, variant.css)

def _convert_emote(name, suffix, raw_emote):
    css = raw_emote.css.copy()

    for (prop, expected_value) in [("display", "block"), ("float", "left")]:
        if prop not in css:
            print("WARNING: %r is missing %r property" % (bplib.combine_name_pair(name, suffix), prop))
        else:
            if css[prop] != expected_value:
                print("WARNING: %r has unexpected value %r for property %r (expected %r)" % (
                    bplib.combine_name_pair(name, suffix), css[prop], prop, expected_value))

            del css[prop]

    width = bplib.css.as_size(css.pop("width"))
    height = bplib.css.as_size(css.pop("height"))
    size = (width, height)
    image_url = bplib.css.as_url(css.pop("background-image"))

    if "background-position" in css:
        offset = bplib.css.as_position(css.pop("background-position"), width, height)
    else:
        offset = (0, 0)

    for p in ("background-repeat", "clear"):
        # Commonly added useless properties that we want to ignore
        if p in css:
            del css[p]

    for p in css:
        print("WARNING: emote %r has unknown extra property %r (%r)" % (bplib.combine_name_pair(name, suffix), p, css[p]))

    return bplib.objects.NormalEmote(name, suffix, css, image_url, size, offset)
