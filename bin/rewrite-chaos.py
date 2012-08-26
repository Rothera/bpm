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

import re
import sys

def rewrite_line(line):
    ss, props = line.split("{", 1)
    props = "{" + props # Put it back
    selectors = ss.split(",")
    ns = []
    for s in selectors:
        orig = s
        hover = ":hover" in s
        s = s.replace(":hover", "")
        s = s.replace("a[href^='/']", "") # Useless
        if s[0] == "a": # Sometimes still there
            s = s[1:]
        s = re.sub(r"\[href\*='-(\w+)']", r".bpflags-\1", s)
        s = re.sub(r"\[href\$='-(\w+)']", r".bpflags-\1", s)
        s = re.sub(r"\[href\*=-(\w+)]", r".bpflags-\1", s)
        s += ":hover" if hover else ""
        ns.append(s)
    print(", ".join(ns), props)

for l in open(sys.argv[1]):
    l = l.rstrip() # newlines
    if l and l[0] == "a":
        rewrite_line(l)
    else:
        print(l)
