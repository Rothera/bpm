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

import yaml

try:
    from yaml import CLoader as Loader
except ImportError:
    from yaml import Loader

def load_yaml_file(file):
    return yaml.load(file, Loader)

def combine_name_pair(name, suffix):
    if suffix:
        if suffix[0] == ":":
            return name + suffix
        else:
            return name + " " + suffix
    else:
        return name

def image_download_url(url):
    if re.match(r"http://[a-z]\.thumbs\.redditmedia\.com/", url):
        bucket = url[7] + ".thumbs.redditmedia.com"
        filename = url[32:]
        return "https://s3.amazonaws.com/%s/%s" % (bucket, filename)
    elif re.match(r"//[a-z]\.thumbs\.redditmedia\.com/", url):
        bucket = url[2] + ".thumbs.redditmedia.com"
        filename = url[27:]
        return "https://s3.amazonaws.com/%s/%s" % (bucket, filename)
    else:
        print("Warning: Don't know how to rewrite URL:", url)
        return url

def clean_image_url(url):
    if re.match(r"http://[a-z]\.thumbs\.redditmedia\.com/", url):
        bucket = url[7]
        filename = url[32:]
        return "redditmedia-%s-%s" % (bucket, filename)
    elif re.match(r"//[a-z]\.thumbs\.redditmedia\.com/", url):
        bucket = url[2]
        filename = url[27:]
        return "redditmedia-%s-%s" % (bucket, filename)
    else:
        print("Warning: Don't know how to rewrite URL:", url)
        return url
