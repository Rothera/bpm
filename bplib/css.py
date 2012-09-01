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

__all__ = ["CssRule", "parse_css_file", "prop", "as_size", "as_position", "as_url"]

import re

class CssRule:
    def __init__(self, selectors, properties, ignore=False):
        self.selectors = selectors
        self.properties = properties
        # This is an odd place to have an "ignore" property, but for logspam
        # purposes we like to filter PONYSCRIPT-IGNORE blocks before we seek
        # out emotes. For extraction purposes, though, we need to keep the rules
        # that get filtered out, and this is the simplest way.
        self.ignore = ignore

    def __repr__(self):
        return "CssRule(%r, %r)" % (self.selectors, self.properties)

# This isn't a real parser and should not be treated as such. As it doesn't
# actually do any lexing, it's prone to failing when delimiter characters are
# found embedded into strings. This doesn't happen often, but obviously you
# can't expect perfect parsing.
#
# A decent regexp-based tokenizer isn't actually that hard, but I want this
# code to run as fast as possible, and it doesn't matter yet.
#
# If necessary, a better parser could be implemented without necessarily
# performing full lexing. A regexp able to recognize comments, strings, and
# everything else would suffice to tokenize- then our split() based code would
# be modified to understand the "string" objects, and not to split them up.

def parse_css_file(file):
    text = file.read()
    text = _strip_comments(text)
    return _parse_all_rules(file.name, text)

def _strip_comments(text):
    # Taken from a section in the CSS spec on tokenization. I'm not actually
    # sure how this works, but it'll work until someone embeds a comment
    # endpoint in a string.
    return re.sub(r"/\*[^*]*\*+(?:[^/][^*]*\*+)*/", "", text)

def _parse_all_rules(filename, text):
    # No more text -> EOF
    while text.strip():
        # Search through the next pair of brackets. Mismatched pairs, and ones
        # embedded into strings will break this. Fortunately it'll probably
        # recover after a rule or two.
        try:
            selector_text, text = text.split("{", 1)
            properties_text, text = text.split("}", 1)
        except ValueError:
            print("ERROR: CSS parse error in %r" % (filename))
        else:
            selectors = _parse_selectors(selector_text)
            properties = _parse_properties(properties_text)
            yield CssRule(selectors, properties)

def _parse_selectors(text):
    # Breaks if people put commas in weird places, of course...
    return [s.strip() for s in text.split(",")]

def _parse_properties(text):
    # Simplistically split on ";" and remove any empty statements.
    #
    # There are a couple of places where extraneous ";"'s are a problem, but
    # they don't really matter. Empty statements includes anything after a
    # trailing semicolon (which isn't always omitted).
    strings = filter(None, [s.strip() for s in text.split(";")])
    props = {}
    for s in strings:
        try:
            key, val = s.split(":", 1)
        except ValueError:
            # This actually only happens in one file right now (and it's due to
            # a string).
            print("ERROR: CSS parse error while reading properties: %r" % (s))
            continue

        props[key.strip().lower()] = val.strip()
    return props

def prop(text):
    parts = text.split()
    if "!important" in parts:
        parts.remove("!important")
    return " ".join(parts)

def as_size(text):
    # Parses a single size declaration. Meant to be used on width/height
    # properties.
    #
    # This should always be measured in pixels, though "0px" is often abbreviated
    # to just "0".
    return _parse_size(prop(text))

def as_position(text, width, height):
    x_text, y_text = prop(text).split()
    return (_parse_pos(x_text, width), _parse_pos(y_text, height))

def as_url(text):
    text = prop(text)
    if text.startswith("url(") and text.endswith(")"):
        return text[4:-1].strip()
    raise ValueError("Invalid URL")

def _parse_size(s):
    if s.endswith("px"):
        s = s[:-2]
    return int(s)

def _parse_pos(s, size):
    # Hack to handle percentage values, which are essentially multiples of the
    # width/height. Used in r/mylittlelistentothis for some crazy reason.
    if s[-1] == "%":
        # Non-multiples of 100 won't work too well here (but who would do that?).
        return int(int(s[:-1]) / 100.0 * size)
    else:
        # Value is generally negative, though there are some odd exceptions.
        return _parse_size(s)
