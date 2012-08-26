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

import yaml

try:
    from yaml import CLoader as _yaml_Loader
except ImportError:
    from yaml import _yaml_Loader

def load_yaml_file(file):
    return yaml.load(file, _yaml_Loader)

class BaseEmote:
    def __init__(self, name, suffix, css, nsfw=False):
        self.name = name
        self.suffix = suffix
        self.css = css

        self.selector = None
        self.nsfw = nsfw
        self.nocss = False

    def make_selector(self):
        if self.selector:
            return self.selector

        name = self.name.replace("!", "_excl_").replace(":", "_colon_")
        if self.suffix is not None:
            name += self.suffix
        return ".bpmotes-" + name.lstrip("/").lower()

class RawEmote(BaseEmote):
    # Usually partial...
    def __init__(self, name, suffix, css, nsfw=False):
        BaseEmote.__init__(self, name, suffix, css, nsfw=nsfw)

    def to_data(self):
        data = {
            "Name": self.name,
            "CSS": self.css
            }
        if self.suffix:
            data["Suffix"] = self.suffix
        return data

    def to_css(self):
        return (self.make_selector(), self.css.copy())

    @classmethod
    def from_data(cls, data):
        name = data.pop("Name")
        suffix = data.pop("Suffix", None)
        css = data.pop("CSS")
        nsfw = data.pop("NSFW", False)

        for key in data:
            print("ERROR: Extra key on %r: %r (%r)" % ((name, suffix), key, data[key]))

        return cls(name, suffix, css, nsfw=nsfw)

    def __repr__(self):
        return "RawEmote(%r, %r, %r)" % (self.name, self.suffix, self.css)

class Emote(BaseEmote):
    def __init__(self, name, suffix, css, size, offset, image_url, nsfw=False):
        BaseEmote.__init__(self, name, suffix, css, nsfw=nsfw)
        self.size = size
        self.offset = offset
        self.image_url = image_url

    def to_data(self):
        data = {
            "Name": self.name,
            "Size": list(self.size),
            "Offset": list(self.offset),
            }
        if self.suffix:
            data["Suffix"] = self.suffix
        if self.css:
            data["CSS"] = self.css
        return data

    def to_css(self):
        assert not self.nocss
        css = {
            "display": "block",
            "clear": "none",
            "float": "left",
            "background-image": "url(%s)" % (self.image_url),
            "width": "%spx" % (self.size[0]),
            "height": "%spx" % (self.size[1]),
            "background-position": "%spx %spx" % (self.offset[0], self.offset[1])
            }
        css.update(self.css)
        return (self.make_selector(), css)

    @classmethod
    def from_data(cls, image_url, data):
        name = data.pop("Name")
        suffix = data.pop("Suffix", None)
        size = data.pop("Size")
        offset = data.pop("Offset")
        css = data.pop("CSS", {})
        nsfw = data.pop("NSFW", False)

        for key in data:
            print("ERROR: Extra key on %r: %r (%r)" % ((name, suffix), key, data[key]))

        return cls(name, suffix, css, size, offset, image_url, nsfw=nsfw)

    def __repr__(self):
        return "Emote(%r, %r, %r, %r, %r)" % (
            self.name, self.suffix, self.css, self.size, self.offset)
