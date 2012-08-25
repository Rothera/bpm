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

script_in = open("opera/includes/betterponymotes.js.in").read()
emote_map = open("build/emote-map.js").read()

script = script_in.replace("/*$(EMOTE_MAP)*/", emote_map)

open("opera/includes/betterponymotes.js", "w").write(script)
