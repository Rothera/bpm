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

import bplib
import bplib.css

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
                print("WARNING: Selector %r split across PONYSCRIPT-IGNORE block!" % (selector))

        rule.ignore = ignoring

        # This goes down here, so that the END-PONYSCRIPT-IGNORE rule is itself
        # filtered out.
        if "END-PONYSCRIPT-IGNORE" in rule.selectors:
            ignoring = False

def extract_raw_emotes(args, css_rules):
    for rule in css_rules:
        alias_pairs = filter(None, [parse_emote_selector(s) for s in rule.selectors])
        for (name, suffix) in alias_pairs:
            extract_explicit = bplib.combine_name_pair(name, suffix) in args.extract
            if extract_explicit:
                print("NOTICE: Extracting ignored emote", (name, suffix))
            if extract_explicit or (not rule.ignore):
                yield bplib.RawEmote(name, suffix, rule.properties.copy()) # So it's not read-only

def parse_emote_selector(selector):
    # Match against 'a[href|="/emote"]'. This is complicated by a few things:
    # psuedo-classes can be either with the a ("a:hover[...]") or at the end
    # ("a[...]:hover"). I'm aware of :hover, :active, and :nth-of-type(n) (which
    # is used on colored text emotes), though only the first two are relevant.
    #
    # |= is the generally recommended attribute selector, but not everybody
    # respects this. We're pretty forgiving here, accepting anything at all.
    #
    # ":" and "!" are permitted in emote names- the former for "/pp:3", and the
    # latter for colored text emotes.
    m = re.match(r'a\s*(:[a-zA-Z\-()]+)?\[href.?="(/[\w:!]+)"\](:[a-zA-Z\-()]+)?$', selector)
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
    emotes = {}
    for raw_emote in partial_emotes:
        name_pair = (raw_emote.name, raw_emote.suffix)
        if name_pair not in emotes:
            emotes[name_pair] = raw_emote
        else:
            base_props = emotes[name_pair].css
            for (property, value) in raw_emote.css.items():
                if property in base_props and base_props[property] != value:
                    print("WARNING: emote %r redefined property %r from base (from %r to %r)" % (
                        name_pair, property, base_props[property], value))
            base_props.update(raw_emote.css)
    return emotes

def collapse_specials_properties(emotes):
    # Basically, copies /ajdance properties to /ajdance:hover so that they can
    # exist independently
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
            custom_emotes[name_pair] = emote

    return (normal_emotes, custom_emotes)

def build_spritesheet_map(emotes):
    spritesheets = {}

    for (name_pair, raw_emote) in emotes.items():
        image_url = get_url(bplib.css.get_prop(raw_emote.css.pop("background-image")))
        if image_url not in spritesheets:
            spritesheets[image_url] = {}
        spritesheets[image_url][name_pair] = convert_emote(name_pair, image_url, raw_emote)

    for (image_url, ss_map) in spritesheets.items():
        verify_spritesheet(image_url, ss_map)

    return spritesheets

def get_url(text):
    if text.startswith("url(") and text.endswith(")"):
        return text[4:-1]
    raise ValueError("Invalid URL")

def convert_emote(name_pair, image_url, raw_emote):
    css = raw_emote.css.copy()
    def try_pop(prop):
        if prop in css:
            del css[prop]

    try_pop("display")
    try_pop("clear")
    try_pop("float")

    width = parse_size(bplib.css.get_prop(css.pop("width")))
    height = parse_size(bplib.css.get_prop(css.pop("height")))
    size = (width, height)

    if "background-position" in css:
        offset = parse_position(bplib.css.get_prop(css["background-position"]), width, height)
        del css["background-position"]
    else:
        offset = None

    # Remove some annoying, commonly seen properties
    for p in ("background-repeat",):
        if p in css:
            del css[p]
    for p in css:
        # These properties are also included a lot, so omitted from logs for brevity.
        if p not in ("margin-left", "margin-right"):
            print("WARNING: emote %r has extra property %r (%r)" % (name_pair, p, css[p]))

    return bplib.Emote(name_pair[0], name_pair[1], css, size, offset, image_url)

def parse_size(sz):
    # Plain numbers are typically zero, though there are some unusual emotes
    # with positive offsets
    if sz.endswith("px"):
        sz = sz[:-2]
    return int(sz)

def parse_position(pos, width, height):
    (str_x, str_y) = pos.split()
    return (parse_pos(str_x, width), parse_pos(str_y, height))

def parse_pos(s, size):
    # Hack to handle percentage values, which are essentially multiples of the
    # width/height. Used in r/mylittlelistentothis for some crazy reason.
    if s[-1] == "%":
        # Non-multiples of 100 won't work too well here, but who would do that
        # anyway
        return int(int(s[:-1]) / 100.0 * size)
    else:
        return parse_size(s)

def verify_spritesheet(image_url, emotes):
    # Ensure that all emotes have a bg-position. Only one may lack one.
    unpositioned_emotes = []
    for (name_pair, emote) in emotes.items():
        if emote.offset is None:
            emote.offset = (0, 0)
            unpositioned_emotes.append(name_pair)

    if len(unpositioned_emotes) > 1:
        print("ERROR: Multiple unsized emotes within spritesheet %r: %s" % (
            image_url, " ".join(map(repr, unpositioned_emotes))))
