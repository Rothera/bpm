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

__all__ = ["base_emote_suffix", "EmoteFile", "PartialEmote", "CustomEmote", "NormalEmote"]

import bplib

def base_emote(name, variants):
    if None in variants:
        return (None, variants[None])
    elif len(variants) == 1:
        key = next(iter(variants.keys()))
        # Should probably suffice
        if key not in (":after", ":before"):
            print("WARNING: Unknown primary base suffix %r" % (key))
        return (key, variants[key])
    raise ValueError("Cannot locate base emote for %r" % (name))

class EmoteFile:
    def __init__(self, name, emotes):
        self.name = name
        self.emotes = emotes

    @classmethod
    def load_from_data(cls, set_name, root):
        emotes = {}
        for (name, variants) in root.items():
            emotes[name] = {}
            for (suffix, data) in variants.items():
                type = data.pop("Type", "Normal")
                if type == "Normal":
                    emote = NormalEmote.load(name, suffix, data)
                elif type == "Custom":
                    emote = CustomEmote.load(name, suffix, data)
                else:
                    raise ValueError("Unknown emote type %r (under %r)" % (type, name))
                emotes[name][suffix] = emote
            try:
                base_emote(name, emotes[name]) # Ensure one exists
            except ValueError as e:
                print("ERROR:", e)
                raise

        return cls(set_name, emotes)

    @classmethod
    def load_from_file(cls, set_name, file):
        data = bplib.load_yaml_file(file)
        return cls.load_from_data(set_name, data)

    @classmethod
    def load_subreddit(cls, subreddit):
        filename = "emotes/" + subreddit + ".yaml"
        try:
            with open(filename) as file:
                data = bplib.load_yaml_file(file)
        except IOError:
            return None # No such file most likely
        return cls.load_from_data("r/" + subreddit, data)

    def dump(self):
        data = {}
        for (name, variants) in self.emotes.items():
            data[name] = {}
            for (suffix, emote) in variants.items():
                data[name][suffix] = emote.dump()
        return data

    def __repr__(self):
        return "EmoteFile(%r, ...)" % (self.name)

class EmoteBase:
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

class PartialEmote(EmoteBase):
    pass

class Emote(EmoteBase):
    def __init__(self, name, suffix, css):
        EmoteBase.__init__(self, name, suffix, css)

    def selector(self):
        name = self.name[1:].replace("!", "_excl_").replace(":", "_colon_").replace("#", "_hash_").replace("/", "_slash_")
        return ".bpmote-" + bplib.combine_name_pair(name, self.suffix).lower()

class CustomEmote(Emote):
    @classmethod
    def load(cls, name, suffix, data):
        css = data.pop("CSS", {})
        return cls(name, suffix, css)

    def dump(self):
        data = {
            "CSS": self.css,
            "Type": "Custom"
            }

        return data

    def to_css(self):
        return self.css.copy()

# For lack of a better name
class NormalEmote(Emote):
    def __init__(self, name, suffix, css, image_url, size, offset):
        Emote.__init__(self, name, suffix, css)
        self.image_url = image_url
        self.size = size
        self.offset = offset

    @classmethod
    def load(cls, name, suffix, data):
        css = data.pop("CSS", {})
        image_url = data.pop("Image")
        size = data.pop("Size")
        offset = data.pop("Offset")
        return cls(name, suffix, css, image_url, size, offset)

    def dump(self):
        data = {
            "Image": self.image_url,
            "Size": list(self.size),
            "Offset": list(self.offset)
            }

        if self.css:
            data["CSS"] = self.css

        return data

    def to_css(self):
        css = {
            "display": "block",
            "float": "left",
            "background-image": "url(%s)" % (self.image_url),
            "width": "%spx" % (self.size[0]),
            "height": "%spx" % (self.size[1]),
            }
        if self.offset != [0, 0] or self.suffix is not None:
            css["background-position"] = "%spx %spx" % (self.offset[0], self.offset[1])
        css.update(self.css)
        return css
