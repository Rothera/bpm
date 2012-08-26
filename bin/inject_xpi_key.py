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
import zipfile

import lxml.etree

key = """
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCZnk8XNNC6+pmDqxY/5CzREJXj
BUY2JzvtcIMBH9gvyq7ZoOdCHIxm2rew7jZ76zdJfKlsUXI2tEdvR5C5PI4NBCw7
PGm6yzGLSn8/cG7tG9XvpnyxGAX8TfQyV602NhAucqJXYGvCNePalZGU7FJbeJc1
5JjoU+fv8mFBK/QTAwIDAQAB
"""

xpi_in = zipfile.ZipFile(sys.argv[1], "r")
xpi_out = zipfile.ZipFile(sys.argv[2], "w")

for item in xpi_in.infolist():
    data = xpi_in.read(item.filename)

    if item.filename == "install.rdf":
        item = "install.rdf"

        manifest = lxml.etree.fromstring(data)
        update_key = lxml.etree.Element("{http://www.mozilla.org/2004/em-rdf#}updateKey")
        update_key.text = key
        manifest[0].append(update_key)
        data = lxml.etree.tostring(manifest, encoding=str, pretty_print=True)

    xpi_out.writestr(item, data)

xpi_in.close()
xpi_out.close()
