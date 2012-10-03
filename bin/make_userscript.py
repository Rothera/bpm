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

MD_START = "// ==UserScript=="
MD_END = "// ==/UserScript=="

def read_metadata_block(file):
    metadata = []
    line = file.readline()
    if line != MD_START + "\n":
        raise ValueError("Invalid UserScript- no metadata block at head of file")
    line = file.readline()
    while line != MD_END + "\n":
        if not line.startswith("//"):
            raise ValueError("Invalid UserScript: metadata block is invalid")
        line = line[2:].strip()
        metadata.append(line.split(" ", 1))
        line = file.readline()
    return metadata

def format_metadata_block(metadata):
    lines = ["// %s %s" % (d, r) for (d, r) in metadata]
    return "%s\n%s\n%s\n" % (MD_START, "\n".join(lines), MD_END)

def rewrite_requires(metadata, prefix):
    for (i, (d, filename)) in enumerate(metadata):
        if d == "@require":
            metadata[i] = ("@require", prefix + filename)

in_filename, out_filename, prefix = sys.argv[1:]

file = open(in_filename)
metadata = read_metadata_block(file)
rewrite_requires(metadata, prefix)
rest = file.read()
file.close()

file = open(out_filename, "w")
file.write(format_metadata_block(metadata))
file.write(rest)
file.close()
