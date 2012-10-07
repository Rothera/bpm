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

__all__ = ["PartialEmote", "CustomEmote", "NormalEmote"]

import bplib

class BaseEmote:
    def __init__(self, name, suffix, css):
        self.name = name
        self.suffix = suffix
        self.css = css

    @property
    def name_pair(self):
        return (self.name, self.suffix)

    def __repr__(self):
        if self.suffix:
            return "Emote(%r, %r)" % (self.name, self.suffix)
        else:
            return "Emote(%r)" % (self.name)

class PartialEmote(BaseEmote):
    pass

class Emote(BaseEmote):
    def __init__(self, name, suffix, css, is_nsfw=False, custom_selector=None):
        BaseEmote.__init__(self, name, suffix, css)
        self.is_nsfw = is_nsfw
        self.custom_selector = custom_selector

    def selector(self):
        if self.custom_selector:
            return self.custom_selector

        name = self.name.replace("!", "_excl_").replace(":", "_colon_").replace("#", "_hash_").replace("/", "_slash_")
        return ".bpmote-" + bplib.combine_name_pair((name, self.suffix)).lstrip("/").lower()

class CustomEmote(Emote):
    @classmethod
    def load(cls, data):
        name = data.pop("Name")
        suffix = data.pop("Suffix", None)
        css = data.pop("CSS", {})
        is_nsfw = data.pop("NSFW", False)
        custom_selector = data.pop("Selector", None)
        return cls(name, suffix, css, is_nsfw, custom_selector)

    def dump(self):
        data = {
            "Name": self.name,
            "CSS": self.css
            }

        if self.suffix:
            data["Suffix"] = self.suffix
        if self.is_nsfw:
            data["NSFW"] = True
        if self.custom_selector:
            data["Selector"] = self.custom_selector

        return data

    def to_css(self):
        return self.css.copy()

# For lack of a better name
class NormalEmote(Emote):
    def __init__(self, name, suffix, css, image_url, size, offset,
                 is_nsfw=False, custom_selector=None, disable_css_gen=False):
        Emote.__init__(self, name, suffix, css, is_nsfw, custom_selector)
        self.image_url = image_url
        self.size = size
        self.offset = offset
        self.disable_css_gen = disable_css_gen

    @classmethod
    def load(cls, image_url, data):
        name = data.pop("Name")
        suffix = data.pop("Suffix", None)
        css = data.pop("CSS", {})
        is_nsfw = data.pop("NSFW", False)
        custom_selector = data.pop("Selector", None)
        size = data.pop("Size")
        offset = data.pop("Offset")
        disable_css_gen = data.pop("NoCSS", False)
        return cls(name, suffix, css, image_url, size, offset, is_nsfw, custom_selector, disable_css_gen)

    def dump(self):
        data = {
            "Name": self.name,
            "Size": list(self.size),
            "Offset": list(self.offset)
            }

        if self.suffix:
            data["Suffix"] = self.suffix
        if self.css:
            data["CSS"] = self.css
        if self.is_nsfw:
            data["NSFW"] = True
        if self.custom_selector:
            data["Selector"] = self.custom_selector

        return data

    def to_css(self):
        assert not self.disable_css_gen
        css = {
            "display": "block",
            "float": "left",
            "background-image": "url(%s)" % (self.image_url),
            "width": "%spx" % (self.size[0]),
            "height": "%spx" % (self.size[1]),
            "background-position": "%spx %spx" % (self.offset[0], self.offset[1])
            }
        css.update(self.css)
        return css
