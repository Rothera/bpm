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

script = open("opera/includes/betterponymotes.js.in").read()
emote_map = open("build/emote-map.js").read()
sr_data = open("build/sr-data.js").read()

script = script.replace("/*$(EMOTE_MAP)*/", emote_map)
script = script.replace("/*$(SR_DATA)*/", sr_data)

open("opera/includes/betterponymotes.js", "w").write(script)
