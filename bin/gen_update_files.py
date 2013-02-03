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
import subprocess

OperaUpdateTemplate = """\
<update-info xmlns="http://www.w3.org/ns/widgets" src="http://rainbow.mlas1.us/betterponymotes_{version}.oex" version="{version}"/>
"""

def main():
    parser = argparse.ArgumentParser(description="Version tool")
    parser.add_argument("version")
    parser.add_argument("pem")
    args = parser.parse_args()

    subprocess.call(["uhura", "-k", args.pem,
                     "build/betterponymotes.xpi", "http://rainbow.mlas1.us/betterponymotes_" + args.version + ".xpi"],
                    stdout=open("build/betterponymotes.update.rdf", "w"))
    open("build/opera-updates.xml", "w").write(OperaUpdateTemplate.format(version=args.version))

if __name__ == "__main__":
    main()
