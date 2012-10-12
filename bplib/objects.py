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

__all__ = [
    "SubredditLoader", "Subreddit",
    "Emote", "EmoteCSSBlock", "CustomEmote", "NormalEmote"
    ]

import bplib

class SubredditLoader:
    def __init__(self):
        self.file_id = 0

    def load_subreddit(self, subreddit):
        emotes_filename = "emotes/" + subreddit + ".yaml"
        tag_filename = "tags/" + subreddit + ".yaml"
        try:
            emote_data = bplib.load_yaml_file(open(emotes_filename))
        except IOError:
            return None # Subreddit just doesn't exist
        try:
            tag_data = bplib.load_yaml_file(open(tag_filename))
        except IOError:
            tag_data = {}
        return self.load_from_data("r/" + subreddit, emote_data, tag_data)

    def load_from_data(self, name, emote_data, tag_data):
        sr = Subreddit.load_from_data(name, emote_data, tag_data)
        sr.file_id = self.file_id
        self.file_id += 1
        return sr

class Subreddit:
    def __init__(self, name, emotes, tag_data):
        self.name = name
        self.emotes = emotes
        self.tag_data = tag_data

    @classmethod
    def load_from_data(cls, subreddit, emote_data, tag_data):
        emotes = {}
        for (name, variants) in emote_data.items():
            emotes[name] = Emote.from_data(name, variants, set(tag_data.get(name, [])))
        return cls(subreddit, emotes, tag_data)

    def dump_emotes(self):
        return {name: emote.dump() for (name, emote) in self.emotes.items()}

    def dump_tags(self):
        return {name: sorted(emote.tags) for (name, emote) in self.emotes.items()}

    def __repr__(self):
        return "Subreddit(%r, ...)" % (self.name)

class Emote:
    def __init__(self, name, variants, tags):
        self.name = name
        self.variants = variants
        self.tags = tags

    @classmethod
    def from_data(cls, name, emote_data, tags):
        variants = {}
        for (suffix, data) in emote_data.items():
            type = data.pop("Type", "Normal")
            if type == "Normal":
                emote = NormalEmote.from_data(name, suffix, data)
            elif type == "Custom":
                emote = CustomEmote.from_data(name, suffix, data)
            else:
                raise ValueError("Unknown emote type %r (under %r)" % (type, name))
            variants[suffix] = emote
        return cls(name, variants, tags)

    def dump(self):
        return {suffix: variant.dump() for (suffix, variant) in self.variants.items()}

    def base_variant(self):
        if None in self.variants:
            return self.variants[None]
        elif len(self.variants) == 1:
            key = next(iter(self.variants.keys()))
            # Should probably suffice
            if key not in (":after", ":before"):
                print("WARNING: Unknown primary base suffix %r" % (key))
            return self.variants[key]
        raise ValueError("Cannot locate base emote for %r" % (name))

    def __contains__(self, suffix):
        return suffix in self.variants
    def __getitem__(self, suffix):
        return self.variants[suffix]
    def __setitem__(self, suffix, variant):
        self.variants[suffix] = variant

class _EmoteBase:
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

class EmoteCSSBlock(_EmoteBase):
    pass

class _Emote(_EmoteBase):
    def __init__(self, name, suffix, css):
        _EmoteBase.__init__(self, name, suffix, css)

    def selector(self):
        name = self.name[1:].replace("!", "_excl_").replace(":", "_colon_").replace("#", "_hash_").replace("/", "_slash_")
        return ".bpmote-" + bplib.combine_name_pair(name, self.suffix).lower()

class CustomEmote(_Emote):
    @classmethod
    def from_data(cls, name, suffix, data):
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

class NormalEmote(_Emote):
    def __init__(self, name, suffix, css, image_url, size, offset):
        _Emote.__init__(self, name, suffix, css)
        self.image_url = image_url
        self.size = size
        self.offset = offset

    @classmethod
    def from_data(cls, name, suffix, data):
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
