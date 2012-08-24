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

def all_emotes(spritesheets):
    all = []
    for emotes in spritesheets.values():
        all.extend(emotes.keys())
    return all

def find_conflicts(first, second):
    f_emotes, s_emotes = all_emotes(first["Spritesheets"]), all_emotes(second["Spritesheets"])
    conflicts = []
    for emote in f_emotes:
        if emote in s_emotes:
            conflicts.append(emote)
    print("\n".join(sorted(conflicts)))

def main():
    parser = argparse.ArgumentParser(description="Finds conflicts between two emote files")
    parser.add_argument("first", help="First file")
    parser.add_argument("second", help="Second file")
    args = parser.parse_args()

    with open(args.first) as first_file, open(args.second) as second_file:
        first = yaml.load(first_file)
        second = yaml.load(second_file)

        find_conflicts(first, second)

if __name__ == "__main__":
    main()
