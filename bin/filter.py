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
import json
import sys

fmt = "/*{{%s}}*/"

def expand_vars(data):
    triggers = {fmt%k: v for (k, v) in data.items()}
    unexpanded = set(data)

    while unexpanded:
        for key in list(unexpanded):
            text = data[key]
            # A key is safe if it contains no references to other vars
            if not any(k in text for k in triggers):
                unexpanded.remove(key)
                break
            # Or if it only references safe vars (expand it)
            if not any(fmt%k in text for k in unexpanded):
                for (k, v) in triggers.items():
                    text = text.replace(k, v)
                data[key] = text
                unexpanded.remove(key)
                break
        else:
            # Couldn't find any new safe variables
            raise ValueError("Recursive variable instantiation?!")

def main():
    parser = argparse.ArgumentParser(description="File template tool")
    parser.add_argument("config")
    parser.add_argument("-v", help="Print the contents of a variable")
    args = parser.parse_args()

    with open(args.config) as file:
        vars = json.load(file)
    expand_vars(vars)

    if args.v:
        text = fmt % args.v
    else:
        text = sys.stdin.read() # slurp

    for (key, value) in vars.items():
        t = fmt % (key)
        text = text.replace(t, value)
    sys.stdout.write(text)

if __name__ == "__main__":
    main()
