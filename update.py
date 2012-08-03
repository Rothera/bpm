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

import os
import os.path
import random
import sys
import time
import urllib.request

UA = "BetterPonymotes stylesheet update checker (1req/2.5secs; pm Typhos)"
SESS = "reddit_session=9958622%2C2012-06-14T22%3A56%3A05%2C432b711c2f42ca0748d224c12c54ec2ed514cd7d"

if not os.path.exists("stylesheet-cache"):
    print("ERROR: run from the wrong directory!")
    sys.exit(1)

filenames = sorted(os.listdir("stylesheet-cache"))
for (i, filename) in enumerate(filenames):
    if filename in (".bzr",):
        continue

    subreddit = filename.split(".")[0]
    url = "http://reddit.com/r/%s/stylesheet?random=%s" % (subreddit, random.randrange(1000000))

    old_ss = open("stylesheet-cache/%s" % (filename), "rb").read()

    print("%s/%s: %s" % (i+1, len(filenames), url))
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Cookie": SESS})
    with urllib.request.urlopen(req) as stream:
        new_ss = stream.read()

    if old_ss != new_ss:
        print("NOTICE: Stylesheet changed in r/%s" % (subreddit))
        with open("stylesheet-updates/%s.css" % (subreddit), "wb") as file:
            file.write(new_ss)

    time.sleep(2.5)
