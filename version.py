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

def load(filename):
    return json.load(open(filename))

def save(filename, data):
    json.dump(data, open(filename, "w"), sort_keys=True, indent=4)

def main():
    parser = argparse.ArgumentParser(description="Version tool")
    # For some extremely stupid reason I can't make this optional.
    parser.add_argument("operation", choices=("get", "set", "check"))
    parser.add_argument("-v")
    args = parser.parse_args()

    fx_data = load("package.json")
    cr_data = load("chrome/manifest.json")

    if args.operation == "check":
        print("Firefox:", fx_data["version"])
        print("Chrome:", cr_data["version"])

        if fx_data["version"] != cr_data["version"]:
            print("Broken!")
    elif args.operation == "get":
        assert fx_data["version"] == cr_data["version"]
        print(fx_data["version"]) # Meh
    elif args.operation == "set":
        if args.v is None:
            parser.error("-v is required for set")

        fx_data["version"] = args.v
        cr_data["version"] = args.v

        save("package.json", fx_data)
        save("chrome/manifest.json", cr_data)

if __name__ == "__main__":
    main()
