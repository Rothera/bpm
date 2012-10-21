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

import bplib

class DataManager:
    def __init__(self):
        self.config = bplib.load_yaml_file(open("data/rules.yaml"))
        self.tag_config = bplib.load_yaml_file(open("data/tags.yaml"))
        self.sources = {}
        self.drops = {}

        self.next_source_id = 0

    def load_subreddit(self, sr_key):
        emotes_filename = "emotes/" + sr_key + ".yaml"
        tag_filename = "tags/" + sr_key + ".yaml"

        try:
            emote_data = bplib.load_yaml_file(open(emotes_filename))
        except IOError:
            return None # Doesn't exist or has no emotes

        try:
            tag_data = bplib.load_yaml_file(open(tag_filename))
        except IOError:
            tag_data = {} # No tags is fine

        source_name = "r/" + sr_key
        sr = Source.load_from_data(self, source_name, emote_data, tag_data)
        sr.source_id = self.next_source_id
        self.next_source_id += 1
        self.sources[source_name] = sr
        return sr

    def load_all_sources(self):
        for sr_key in self.config["Subreddits"]:
            self.load_subreddit(sr_key)

class Source:
    def __init__(self, name, emotes):
        self.name = name
        self.emotes = emotes
        self.variant_matches = None

    @classmethod
    def load_from_data(cls, data_manager, source_name, emote_data, tag_data):
        sr = cls(source_name, {})
        sr._tag_data = tag_data # Used in checktags
        sr.load_data(data_manager, emote_data, tag_data)
        return sr

    def load_data(self, data_manager, emote_data, tag_data):
        for (name, variants) in emote_data.items():
            tags = set(tag_data.get(name, []))
            if "+drop" in tags:
                if name in data_manager.drops:
                    print("Source.load_from_data(): ERROR: %s in %s is marked as +drop, but %s has already claimed the name" %
                            (name, source_name, data_manager.drops[name].name))
                data_manager.drops[name] = self
            self.emotes[name] = Emote.load_from_data(name, variants, tags)

    def dump_emote_data(self):
        return {name: emote.dump_data() for (name, emote) in self.emotes.items()}

    def dump_tag_data(self, data_manager):
        return {emote.name: sorted(emote.tags) for emote in self.undropped_emotes(data_manager)}

    def dropped_emotes(self, data_manager):
        # Returns emotes with +drop
        for emote in self.emotes.values():
            if emote.ignore:
                continue
            owner = data_manager.drops.get(emote.name, None)
            if owner is not None and owner is not self:
                yield emote

    def undropped_emotes(self, data_manager):
        # Returns emotes that don't have a +drop applied to them
        for emote in self.emotes.values():
            if emote.ignore:
                continue
            owner = data_manager.drops.get(emote.name, None)
            if owner is None or owner is self:
                yield emote

    def unignored_emotes(self, data_manager):
        # Returns emotes that actually matter (not removed and not dropped)
        for emote in self.emotes.values():
            if emote.ignore:
                continue
            if "+remove" in emote.all_tags(data_manager):
                continue
            owner = data_manager.drops.get(emote.name, None)
            if owner is None or owner is self:
                yield emote

    def match_variants(self, data_manager):
        core_emotes, variants = {}, []
        matches, errors = {}, []

        # Locate core emotes. Ignore all variants but the base one.
        for emote in self.unignored_emotes(data_manager):
            is_core = "+v" not in emote.tags
            if is_core:
                # An emote always matches itself.
                matches[emote] = emote
            base_variant = emote.base_variant()
            if hasattr(base_variant, "info_set"):
                # Uniquely identifying sprite data
                info = base_variant.info_set()
                if is_core:
                    if info in core_emotes:
                        # Only one core emote per sprite, please. Common
                        # exception: hovermotes.
                        if len(emote.variants) == len(core_emotes[info].variants):
                            errors.append("Multiple non-variant emotes (prev %s, new %s)" % (core_emotes[info].name, emote.name))
                    core_emotes[info] = emote
                else:
                    variants.append((emote, info))
            elif not is_core:
                # Custom +v emotes are not permitted
                errors.append("Variant custom emote %s" % (emote.name))
                matches[emote] = emote

        # Match everything up.
        for (emote, info) in variants:
            base_variant = emote.base_variant()
            base = None
            # Easy match- another identical emote exists.
            if info in core_emotes:
                base = core_emotes[info]
            elif emote.name[:2].lower() == "/r":
                # Try non-reversed name?
                unreversed_emote = self.emotes.get("/" + emote.name[2:])
                if unreversed_emote is not None:
                    unreversed_base = unreversed_emote.base_variant()
                    if hasattr(unreversed_base, "info_set"):
                        info = unreversed_base.info_set()
                        if info in core_emotes:
                            # Perfect match
                            base = core_emotes[info]
            # Can't find it. Is there an explicit rule?
            match_config = data_manager.config["RootVariantEmotes"].get(self.name, {})
            if emote.name in match_config:
                if base is None:
                    base = self.emotes[match_config[emote.name]]
                else:
                    # Would be nice to know
                    errors.append("Extraneous match config for %s" % (emote.name))
            elif base is None:
                errors.append("Cannot locate root emote for %s" % (emote.name))
            matches[emote] = base # Even if None

        self.variant_matches = matches
        return errors

    def __repr__(self):
        return "<Source %s>" % (self.name)

class Emote:
    def __init__(self, name, variants, tags, ignore):
        self.name = name
        self.variants = variants
        self.tags = tags
        self.ignore = ignore
        # Caches
        self._implied_tags = None
        self._all_tags = None

    @classmethod
    def load_from_data(cls, name, variant_data, tags):
        variants = {}
        ignore = variant_data.pop("Ignore", False)
        for (suffix, data) in variant_data.items():
            type = data.pop("Type", "Normal")
            if type == "Normal":
                emote = NormalEmote.load_from_data(name, suffix, data)
            elif type == "Custom":
                emote = CustomEmote.load_from_data(name, suffix, data)
            else:
                raise ValueError("Unknown emote type %r (under %r)" % (type, name))
            variants[suffix] = emote
        return cls(name, variants, tags, ignore)

    def dump_data(self):
        data = {suffix: variant.dump_data() for (suffix, variant) in self.variants.items()}
        if self.ignore:
            data["Ignore"] = self.ignore
        return data

    def base_variant(self):
        if None in self.variants:
            return self.variants[None]
        elif len(self.variants) == 1:
            key = next(iter(self.variants.keys()))
            ## Should probably suffice
            #if key not in (":after", ":before"):
            #    print("WARNING: Unknown primary base suffix %r" % (key))
            return self.variants[key]
        raise ValueError("Cannot locate base emote for %r" % (name))

    def implied_tags(self, data_manager):
        if self._implied_tags is None:
            self._implied_tags = set()
            for tag in self.tags:
                self._implied_tags |= set(data_manager.tag_config["TagImplications"].get(tag, []))
        return self._implied_tags

    def all_tags(self, data_manager):
        if self._all_tags is None:
            self._all_tags = self.implied_tags(data_manager) | self.tags
        return self._all_tags

    def __repr__(self):
        return "<Emote %s>" % (self.name)

class _EmoteBase:
    def __init__(self, name, suffix, css):
        self.name = name
        self.suffix = suffix
        self.css = css

class EmoteCSSBlock(_EmoteBase):
    def __init__(self, name, suffix, css, ignore):
        _EmoteBase.__init__(self, name, suffix, css)
        self.ignore = ignore

class _Emote(_EmoteBase):
    def __init__(self, name, suffix, css):
        _EmoteBase.__init__(self, name, suffix, css)

    def selector(self):
        name = self.name[1:].replace("!", "_excl_").replace(":", "_colon_").replace("#", "_hash_").replace("/", "_slash_")
        return ".bpmote-" + bplib.combine_name_pair(name, self.suffix).lower()

class CustomEmote(_Emote):
    @classmethod
    def load_from_data(cls, name, suffix, data):
        css = data.pop("CSS", {})
        return cls(name, suffix, css)

    def dump_data(self):
        data = {
            "CSS": self.css,
            "Type": "Custom"
            }

        return data

    def to_css(self):
        return self.css.copy()

    def __repr__(self):
        if self.suffix:
            return "<CustomEmote %s %s>" % (self.name, self.suffix)
        else:
            return "<CustomEmote %s>" % (self.name)

class NormalEmote(_Emote):
    def __init__(self, name, suffix, css, image_url, size, offset):
        _Emote.__init__(self, name, suffix, css)
        self.image_url = image_url
        self.size = size
        self.offset = offset

    def info_set(self):
        return (self.image_url, self.size[0], self.size[1], self.offset[0], self.offset[1])

    @classmethod
    def load_from_data(cls, name, suffix, data):
        css = data.pop("CSS", {})
        image_url = data.pop("Image")
        size = data.pop("Size")
        offset = data.pop("Offset", [0, 0])
        return cls(name, suffix, css, image_url, size, offset)

    def dump_data(self):
        data = {
            "Image": self.image_url,
            "Size": list(self.size)
            }

        if self.css:
            data["CSS"] = self.css
        if list(self.offset) != [0, 0]:
            data["Offset"] = list(self.offset)

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

    def __repr__(self):
        if self.suffix:
            return "<NormalEmote %s %s>" % (self.name, self.suffix)
        else:
            return "<NormalEmote %s>" % (self.name)
