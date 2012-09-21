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

import lxml.etree

class JsonSource:
    def __init__(self, filename, key):
        self.filename = filename
        self.key = key

        self.data = json.load(open(filename))
        self.version = self.data[key] # TODO: arbitrary keys?

    def set(self, version):
        self.data[self.key] = version

    def save(self):
        json.dump(self.data, open(self.filename, "w"), sort_keys=True, indent=4)

class XmlSource:
    def __init__(self, filename, get_ver):
        self.filename = filename

        self.data = lxml.etree.parse(open(filename))
        self.version = get_ver(self.data)

    def save(self):
        s = lxml.etree.tostring(self.data, encoding=str, pretty_print=True)
        open(self.filename, "w").write(s)

def main():
    parser = argparse.ArgumentParser(description="Version tool")
    # For some extremely stupid reason I can't make this optional.
    parser.add_argument("operation", choices=("get", "set", "check"))
    parser.add_argument("-v")
    args = parser.parse_args()

    fx_package = JsonSource("firefox/package.json", "version")
    cr_package = JsonSource("chrome/manifest.json", "version")
    o_package = XmlSource("opera/config.xml", lambda t: t.getroot().attrib["version"])
    files = (fx_package, cr_package, o_package)

    if args.operation == "check":
        print("Firefox:", fx_package.version)
        print("Chrome:", cr_package.version)
        print("Opera:", o_package.version)
    elif args.operation == "get":
        for (i, f) in enumerate(files[1:]):
            assert files[i-1].version == f.version
        print(fx_package.version) # Meh
    elif args.operation == "set":
        if args.v is None:
            parser.error("-v is required for set")

        fx_package.data["version"] = args.v
        cr_package.data["version"] = args.v
        o_package.data.getroot().attrib["version"] = args.v

        fx_package.save()
        cr_package.save()
        o_package.save()

if __name__ == "__main__":
    main()
