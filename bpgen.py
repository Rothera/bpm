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

def check_emote(section, emote, callback):
    if emote in bpemotes.ConflictOverrides:
        if section == bpemotes.ConflictOverrides[emote]:
            print("Notice: Choosing %s in conflict over %s" % (section, emote))
            emotes[emote] = section
        else:
            callback()
    elif emote in emotes:
        print("WARNING: UNRESOLVED CONFLICT between %s and %s over %s." % (
                section, emotes[emote], emote))
    else:
        emotes[emote] = section

for thing in bpemotes.Things:
    if isinstance(thing, bplib.Spritesheet):
        for emote in thing.emotes:
            for name in emote.names[:]:
                def remove():
                    print("Notice: Conflict over %s. Disabling %s in favor of %s." % (
                        name, thing.section, bpemotes.ConflictOverrides[name]))
                    # Quick hack to change a tuple
                    tmp = list(emote.names)
                    tmp.remove(name)
                    emote.names = tmp
                check_emote(thing.section, name, remove)
    elif isinstance(thing, bplib.PsuedoEmote):
        check_emote(thing.section, thing.name, None)
    elif isinstance(thing, bplib.CustomCss):
        pass # Hope it's ok...
    else:
        print("WARNING: Don't know how to process", thing)

output = bplib.Output(
    bplib.CssGenerator(open("data/betterponymotes.css", "w")),
    bplib.JsGenerator(open("data/emote_map.js", "w")))

for thing in bpemotes.Things:
    thing(output)

output.close()
