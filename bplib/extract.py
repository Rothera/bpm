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
    "filter_ponyscript_ignores", "extract_raw_emotes", "build_emote_map",
    "collapse_specials_properties", "classify_emotes", "build_spritesheet_map"
    ]

import re

import bplib
import bplib.css
import bplib.file
import bplib.emote

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

def extract_raw_emotes(specified_extractions, css_rules):
    # Extracts partial emotes from a list of CSS rules.
    for rule in css_rules:
        # FIXME: Maybe we should warn if non-emote selectors are mixed in with
        # valid ones. That's probably a sign of trouble.
        alias_pairs = filter(None, [_parse_emote_selector(s) for s in rule.selectors])

        for (name, suffix) in alias_pairs:
            name_pair_str = bplib.combine_name_pair((name, suffix))
            extract_explicit = name_pair_str in specified_extractions

            if extract_explicit:
                print("NOTICE: Extracting ignored emote %r" % (name_pair_str))
                specified_extractions.remove(name_pair_str)

            if extract_explicit or (not rule.ignore):
                # Copy CSS so it's not read-only
                yield bplib.emote.PartialEmote(name, suffix, rule.properties.copy())

    for name_pair_str in specified_extractions:
        print("WARNING: %r was not found" % (name_pair_str))

def _parse_emote_selector(selector):
    # Match against 'a[href|="/emote"]'. This is complicated by a few things:
    # psuedo-classes can be either with the a ("a:hover[...]") or at the end
    # ("a[...]:hover"). I'm aware of :hover, :active, and :nth-of-type(n) (which
    # is used on colored text emotes), though only the first two are relevant.
    #
    # |= is the generally recommended attribute selector, but not everybody
    # respects this. We accept |=, ^=, and = as alternatives, but no others.
    # Generally this is a not a problem, and may help avoid false positives on
    # selectors that we shouldn't actually be parsing.
    #
    # ":", "!", "#", and "/" are permitted in emote names. ":" is used by
    # "/pp:3", "!" for colored text emotes, and the remaining two mostly for
    # non-pony emotes and image macros.
    m = re.match(r'a\s*(:[a-zA-Z\-()]+)?\[href[|^]?="(\/[\w:!#\/]+)"\](:[a-zA-Z\-()]+)?$', selector)
    if m is None:
        return None
    pc1, emote_name, pc2 = m.groups()

    if pc1 and pc2:
        # Probably shouldn't ever happen (what would we do, anyway?)
        print("WARNING: Selector %r has multiple psuedo classes" % (selector))
    psuedo_class = pc1 or pc2
    suffix = None

    if psuedo_class:
        # We want to keep everything except :nth-of-type(n) (though we could
        # safely keep it, it does nothing, so I'd prefer removal), but warn if
        # we don't recognize it.
        if psuedo_class in (":hover", ":active"):
            suffix = psuedo_class
        elif psuedo_class != ":nth-of-type(n)":
            # Currently this just means weird non-emote things with :after and
            # :before. It might be best just to omit these entirely (return a
            # special value indicating deletion of the "base" selector as well),
            # but... eh.
            print("WARNING: Unknown psuedo-class on %r" % (selector))
            suffix = psuedo_class

    return (emote_name, suffix)

def build_emote_map(partial_emotes):
    # Combines properties in partial emotes, producing a single emote map.
    emotes = {}
    for raw_emote in partial_emotes:
        if raw_emote.name_pair not in emotes:
            # Newly seen emote
            emotes[raw_emote.name_pair] = raw_emote
        else:
            # Merge properties
            base_emote = emotes[raw_emote.name_pair]
            for prop in bplib.safe_update(base_emote.css, raw_emote.css):
                print("WARNING: emote %r redefined property %r from base (from %r to %r)" % (
                    bplib.combine_name_pair(raw_emote.name_pair), prop,
                    base_emote.css[prop], raw_emote.css[prop]))
    return emotes

def collapse_specials_properties(emotes):
    # Basically, copies /ajdance properties to /ajdance:hover so that they can
    # exist independently.
    #
    # Note: overwriting properties is considered valid here by necessity.
    for emote in emotes.values():
        if emote.suffix:
            base_emote = emotes.get((emote.name, None), None)
            if base_emote is not None:
                base_properties = base_emote.css.copy()
                base_properties.update(emote.css)
                emote.css = base_properties

def classify_emotes(emote_map):
    # Sorts emotes based on whether or not they are "normal" emotes belonging to
    # a spritesheet, or "custom" ones possessing only arbitrary CSS.
    #
    # Normal emotes are left intact as PartialEmote's, and require further
    # processing. Custom ones are converted to CustomEmote's.
    normal_emotes = {}
    custom_emotes = {}

    for (name_pair, emote) in emote_map.items():
        # Required properties (background-position is semi-required)
        if all(k in emote.css for k in ("background-image", "width", "height")):
            # Probably an emote. We could check for expected values of display/
            # clear/float, but they're broken in a lot of places, and not worth
            # the resulting warning spam.
            normal_emotes[name_pair] = emote
        else:
            # Replace one class with another, essentially
            custom_emotes[name_pair] = bplib.emote.CustomEmote(emote.name, emote.suffix, emote.css)

    return (normal_emotes, custom_emotes)

def build_spritesheet_map(emotes):
    # Converts a map of "normal" emotes into a map of spritesheets.
    spritesheets = {}

    for (name_pair, raw_emote) in emotes.items():
        image_url = bplib.css.as_url(raw_emote.css.pop("background-image"))

        if image_url not in spritesheets:
            spritesheets[image_url] = bplib.file.Spritesheet(image_url, {})

        # Note: this isn't ever really possible. The closest way the CSS could
        # be broken to make this happen would be if it defined two emotes with
        # the same name- but they would be collapsed as part of build_emote_map(),
        # which would produce several warnings.
        assert name_pair not in spritesheets[image_url].emotes
        spritesheets[image_url].emotes[name_pair] = _convert_emote(name_pair, image_url, raw_emote)

    for (image_url, ss) in spritesheets.items():
        _verify_spritesheet(image_url, ss)

    return spritesheets

def _convert_emote(name_pair, image_url, raw_emote):
    css = raw_emote.css.copy()

    for (prop, expected_value) in [("display", "block"), ("clear", "none"), ("float", "left")]:
        if prop not in css:
            print("WARNING: %r is missing %r property" % (bplib.combine_name_pair(name_pair), prop))
        else:
            if css[prop] != expected_value:
                print("WARNING: %r has wrong value %r for property %r (expected %r)" % (
                    bplib.combine_name_pair(name_pair), css[prop], prop, expected_value))

            del css[prop]

    width = bplib.css.as_size(css.pop("width"))
    height = bplib.css.as_size(css.pop("height"))
    size = (width, height)

    if "background-position" in css:
        offset = bplib.css.as_position(css.pop("background-position"), width, height)
    else:
        offset = None

    for p in css:
        print("WARNING: emote %r has extra property %r (%r)" % (bplib.combine_name_pair(name_pair), p, css[p]))

    for p in ["background-repeat"]:
        # Commonly added properties that we want to ignore
        if p in css:
            del css[p]

    return bplib.emote.NormalEmote(name_pair[0], name_pair[1], css, image_url, size, offset)

def _verify_spritesheet(image_url, ss):
    # Ensure that all emotes have a bg-position. Only one may lack one.
    unpositioned_emotes = []
    for (name_pair, emote) in ss.emotes.items():
        if emote.offset is None:
            emote.offset = (0, 0)
            unpositioned_emotes.append(name_pair)

    if len(unpositioned_emotes) > 1:
        print("ERROR: Multiple unsized emotes within spritesheet %r: %s" % (
            image_url, " ".join(map(bplib.combine_name_pair, unpositioned_emotes))))
