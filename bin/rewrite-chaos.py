#!/usr/bin/env python3
# -*- coding: utf8 -*-
################################################################################
##
## This file is part of BetterPonymotes.
## Copyright (c) 2012-2015 Typhos.
##
## This program is free software: you can redistribute it and/or modify it
## under the terms of the GNU Affero General Public License as published by
## the Free Software Foundation, either version 3 of the License, or (at your
## option) any later version.
##
## This program is distributed in the hope that it will be useful, but WITHOUT
## ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
## FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public License
## for more details.
##
## You should have received a copy of the GNU Affero General Public License
## along with this program.  If not, see <http://www.gnu.org/licenses/>.
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
        s = s.replace("!", "_excl_")
        s = re.sub(r"\[href\*='-(\w+)']", r".bpflag-\1", s)
        s = re.sub(r"\[href\$='-(\w+)']", r".bpflag-\1", s)
        s = re.sub(r"\[href\*=-(\w+)]", r".bpflag-\1", s)
        s += ":hover" if hover else ""
        ns.append(s)
    print(", ".join(ns), props)

for l in open(sys.argv[1]):
    l = l.rstrip() # newlines
    if l and l[0] == "a":
        rewrite_line(l)
    else:
        print(l)
