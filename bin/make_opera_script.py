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

import sys

macros = {
    "EMOTE_MAP": "build/emote-map.js",
    "SR_DATA": "build/sr-data.js"
    }

script = open(sys.argv[1] + ".in").read()

for (macro, filename) in macros.items():
    script = script.replace("/*$(%s)*/" % (macro), open(filename).read())

open(sys.argv[1], "w").write(script)
