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

import base64
import sys

data = open(sys.argv[1], "rb").read()
encoded = base64.b64encode(data)

print("url(\"data:image/png;base64," + encoded.decode("ascii") + "\")")
