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
