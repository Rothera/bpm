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

import yaml

def pop2(d1, d2, key, *default):
    # WARNING: careful with this method; if you pass it default={} then you get
    # the same object twice
    if default:
        return d1.pop(key, default), d2.pop(key, default)
    else:
        return d1.pop(key), d2.pop(key)

def compare_spritesheets(ss, old, new):
    for emote in list(old.keys()):
        old_emote = old.pop(emote)

        if emote in new:
            new.pop(emote)
            pass # Probably the same
        else:
            print("  Removed emote:", emote)

    for emote in new.keys():
        print("  Added emote:", emote)

def summarize_diff(old, new):
    old_sheets, new_sheets = pop2(old, new, "Spritesheets", {})
    for ss in list(old_sheets.keys()):
        old_ss = old_sheets.pop(ss)

        if ss in new_sheets:
            if old_ss != new_sheets[ss]: # This doesn't work; quick hack
                print("Spritesheet edited:", ss)
                compare_spritesheets(ss, old_ss, new_sheets.pop(ss))
        else:
            print("Removed spritesheet:", ss)
            compare_spritesheets(ss, old_ss, {}) # Hack

    for (ss, new_ss) in new_sheets.items():
        print("Added spritesheet:", ss)
        compare_spritesheets(ss, {}, new_ss) # Hack

def main():
    parser = argparse.ArgumentParser(description="Summarizes the differences between two emote files")
    parser.add_argument("old", help="Old file")
    parser.add_argument("new", help="New file")
    args = parser.parse_args()

    with open(args.old) as old_file, open(args.new) as new_file:
        old = yaml.load(old_file)
        new = yaml.load(new_file)

        summarize_diff(old, new)

if __name__ == "__main__":
    main()
