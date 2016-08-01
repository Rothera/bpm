#!/usr/bin/env python3
# -*- coding: utf8 -*-
################################################################################
##
## This file is part of BetterPonymotes.
## Copyright (c) 2012-2015 Typhos.
##
## This program is free software: you can redistribute it and/or modify it
## under the terms of the GNU Affero General Public License as published by
## the Free Software Foundation, either version 3 of the License, or (at your
## option) any later version.
##
## This program is distributed in the hope that it will be useful, but WITHOUT
## ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
## FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public License
## for more details.
##
## You should have received a copy of the GNU Affero General Public License
## along with this program.  If not, see <http://www.gnu.org/licenses/>.
##
################################################################################

import re

class CssRule(object):
    def __init__(self, selectors, properties, ignore=False):
        self.selectors = selectors
        self.properties = properties
        # This is an odd place to have an "ignore" property, but in order to
        # detect split rules properly, we filter PONYSCRIPT-IGNORE blocks before
        # extracting emotes. For extraction purposes, though, we need to keep
        # the rules that get filtered out (since some may be added back in),
        # and this is the simplest way.
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
    offset = 0
    while offset < len(text):
        # Mismatched pairs and brackets in strings will probably break this
        # quite badly, though it should recover after a rule or two.
        # Unfortunately it can do strange things while it does.
        open = text.find("{", offset)
        if open < 0:
            rest = text[offset:].strip()
            if rest:
                print("ERROR: Junk at end of file %s" % (filename))
            return

        # Need to find the } that matches this one. This can get complicated due
        # to @keyframes and the like, which nest blocks.
        depth = 1
        start = open + 1
        nested = False
        while depth > 0:
            next_open = text.find("{", start)
            next_close = text.find("}", start)

            # Need to have a matching brace
            if next_close < 0:
                print("ERROR: Premature end of file %s" % (filename))
                return

            # Check for nested block
            if next_open > -1 and next_open < next_close:
                # We found another { before the next }, probably @keyframes
                depth += 1
                nested = True
                start = next_open + 1
            else:
                depth -= 1
                start = next_close + 1

                close = next_close

        if not nested:
            selector_text = text[offset:open]
            properties_text = text[open+1:close]

            selectors = _parse_selectors(selector_text)
            properties = _parse_properties(properties_text)
            yield CssRule(selectors, properties)

        offset = close + 1 # Validated already that close isn't negative

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

        key = key.strip().lower()
        if key in props:
            print("WARNING: CSS defines property %r twice in one block" % (key))
        props[key] = val.strip()
    return props

def prop(text):
    return " ".join(text.replace("!important", "").split())

def as_size(text):
    # Parses a single size declaration. Meant to be used on width/height
    # properties.
    #
    # This should always be measured in pixels, though "0px" is often abbreviated
    # to just "0".
    return _parse_size(prop(text))

def as_position(text, width, height):
    parts = prop(text).split()

    # Funky hack to make stupid things like "0px, 0px" work. I'm not sure if
    # this is actually allowed but we'll pretend it is
    if len(parts) == 1:
        parts = parts[0].split(",")
        parts = [p.strip() for p in parts]

    # This probably isn't how it works, but oh well
    x_text = parts[0] if len(parts) else "0px"
    y_text = parts[1] if len(parts) > 1 else "0px"
    return (_parse_pos(x_text, width), _parse_pos(y_text, height))

def as_url(text):
    text = prop(text)
    if text.startswith("url(") and text.endswith(")"):
        return text[4:-1].strip().strip('"')
    raise ValueError("Invalid URL", text)

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
