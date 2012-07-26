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

import bplib
import bpemotes

emotes = {}
for ss in bpemotes.Things:
    if isinstance(ss, bplib.Spritesheet):
        for emote in ss.emotes:
            for name in emote.names:
                if name in emotes:
                    if name not in bpemotes.ConflictWhitelist:
                        print("WARNING: Conflict between %s and %s over %s." % (
                              emotes[name].section, ss.section, name))
                else:
                    emotes[name] = ss

output = bplib.Output(
    bplib.CssGenerator(open("data/betterponymotes.css", "w")),
    bplib.JsGenerator(open("data/emote_map.js", "w")))

for thing in bpemotes.Things:
    thing(output)

output.close()
