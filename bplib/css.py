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

class CssRule:
    def __init__(self, selectors, properties, ignore=False):
        self.selectors = selectors
        self.properties = properties
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

def parse_css_file(file):
    text = file.read()
    text = strip_comments(text)
    return parse_all_rules(file.name, text)

def strip_comments(text):
    # Taken from a section in the CSS spec on tokenization. I'm not actually
    # sure how this works, but it'll work until someone embeds a comment
    # endpoint in a string.
    return re.sub(r"/\*[^*]*\*+(?:[^/][^*]*\*+)*/", "", text)

def parse_all_rules(filename, text):
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
            selectors = parse_selectors(selector_text)
            properties = parse_properties(properties_text)
            yield CssRule(selectors, properties)

def parse_selectors(text):
    # Breaks if people put commas in weird places, of course...
    return [s.strip() for s in text.split(",")]

def parse_properties(text):
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

def get_prop(text, ignore_important=True):
    parts = text.split()
    if ignore_important and "!important" in parts:
        parts.remove("!important")
    return " ".join(parts)
