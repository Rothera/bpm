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

__all__ = ["convert_spritesheet_map", "EmoteFile", "Spritesheet"]

import bplib.emote

def _sort_emotes(emotes):
    # Sorting by name_pair would be preferable, but suffix is usually None,
    # which can't be compared with strings.
    return sorted(emotes, key=lambda e: e.name)

def convert_spritesheet_map(data):
    return [Spritesheet.load(image_url, ss_data) for (image_url, ss_data) in data.items()]

class EmoteFile:
    def __init__(self, name, display_name, custom_emotes, spritesheets):
        self.name = name
        self.display_name = display_name
        self.custom_emotes = custom_emotes
        self.spritesheets = spritesheets

        self.emotes = custom_emotes.copy()
        for spritesheet in spritesheets:
            self.add_spritesheet(spritesheet)

    def add_spritesheet(self, spritesheet):
        for name_pair in spritesheet.emotes:
            assert name_pair not in self.emotes
        self.emotes.update(spritesheet.emotes)

    @classmethod
    def load(cls, data):
        meta = data.pop("Meta")
        name = meta.pop("Name")
        display_name = meta.pop("DisplayName")

        emotes = data.pop("Emotes")
        customs = {}
        for custom_data in emotes.pop("Custom"):
            emote = bplib.emote.CustomEmote.load(custom_data)
            customs[emote.name_pair] = emote

        spritesheets = convert_spritesheet_map(emotes.pop("Spritesheets"))
        return cls(name, display_name, customs, spritesheets)

    def dump(self):
        return {
            "Meta": {"Name": self.name, "DisplayName": self.display_name},
            "Emotes": {
                "Custom": [emote.dump() for emote in _sort_emotes(self.custom_emotes.values())],
                "Spritesheets": {ss.image_url: ss.dump() for ss in self.spritesheets}
                }
            }

    def __repr__(self):
        return "EmoteFile(%r)" % (self.name)

class Spritesheet:
    def __init__(self, image_url, emotes):
        self.image_url = image_url
        self.emotes = emotes

    @classmethod
    def load(cls, image_url, data):
        emotes = {}
        for emote_data in data:
            emote = bplib.emote.NormalEmote.load(image_url, emote_data)
            emotes[emote.name_pair] = emote
        return cls(image_url, emotes)

    def dump(self):
        return [emote.dump() for emote in _sort_emotes(self.emotes.values())]

    def __repr__(self):
        return "Spritesheet(%r)" % (self.image_url)
