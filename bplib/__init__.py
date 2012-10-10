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

__all__ = ["load_yaml_file", "safe_update", "combine_name_pair"]

import yaml

try:
    from yaml import CLoader as Loader
except ImportError:
    from yaml import Loader

def load_yaml_file(file):
    return yaml.load(file, Loader)

def safe_update(base, new, changes_only=True):
    for key in new:
        if key in base:
            if base[key] != new[key]:
                yield key
    base.update(new)

def combine_name_pair(name, suffix):
    if suffix:
        if suffix[0] == ":":
            return name + suffix
        else:
            return name + " " + suffix
    else:
        return name
