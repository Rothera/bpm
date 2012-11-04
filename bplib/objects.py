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
import bplib.json

class Context(object):
    def __init__(self):
        self.config = None
        self.tag_config = None
        self.sources = {}
        self.drops = {}
        self.next_source_id = 0

    def load_config(self):
        self.config = bplib.load_yaml_file(open("data/rules.yaml"))
        self.tag_config = bplib.load_yaml_file(open("data/tags.yaml"))

    def load_sources(self):
        for sr_key in self.config["Subreddits"]:
            self.load_subreddit(sr_key)

    def load_subreddit(self, sr_key):
        emotes_filename = "emotes/" + sr_key + ".json"
        tag_filename = "tags/" + sr_key + ".json"

        try:
            emote_data = bplib.json.load(open(emotes_filename))
        except IOError:
            return None # Doesn't exist or has no emotes

        try:
            tag_data = bplib.json.load(open(tag_filename))
        except IOError:
            tag_data = {} # No tags is fine

        source_name = "r/" + sr_key
        sr = Source.load(source_name, emote_data, tag_data, context=self)
        sr.source_id = self.next_source_id
        self.next_source_id += 1
        self.sources[source_name] = sr
        return sr

class Source(object):
    def __init__(self, name, emotes, context=None):
        self.name = name
        self.emotes = emotes
        self.context = context

        self.variant_matches = None
        self.emote_groups = None
        self._tag_data = {} # For checktags

    def merge(self, emote_data, tag_data):
        for (name, data) in emote_data.items():
            tags = set(tag_data.get(name, []))
            self.emotes[name] = Emote.load(name, data, tags, source=self, context=self.context)

            if self.context:
                if "+drop" in tags:
                    if name in self.context.drops:
                        print("Source.load_from_data(): ERROR: %s in %s is marked as +drop, but %s has already claimed the name" %
                                (name, self.name, self.context.drops[name].name))
                    self.context.drops[name] = self
        self._tag_data.update(tag_data)

    @classmethod
    def load(cls, name, emote_data, tag_data, context=None):
        source = cls(name, {}, context=context)
        source.merge(emote_data, tag_data)
        return source

    def dump(self):
        return {name: emote.dump() for (name, emote) in self.emotes.items()}

    def dump_tags(self):
        data = {}
        for (name, emote) in self.emotes.items():
            if emote.tags:
                data[name] = sorted(emote.tags)
        return data

    def dropped_emotes(self):
        # Returns emotes with +drop
        for emote in self.emotes.values():
            if emote.ignore:
                continue
            owner = self.context.drops.get(emote.name, None)
            if owner is not None and owner is not self:
                yield emote

    def undropped_emotes(self):
        # Returns emotes that don't have a +drop applied to them
        for emote in self.emotes.values():
            if emote.ignore:
                continue
            owner = self.context.drops.get(emote.name, None)
            if owner is None or owner is self:
                yield emote

    def is_ignored(self, emote):
        if emote.ignore:
            return True
        if "+remove" in emote.all_tags(self.context):
            return True
        owner = self.context.drops.get(emote.name, None)
        if owner is not None and owner is not self:
            return True
        return False

    def unignored_emotes(self):
        # Returns emotes that actually matter (not removed and not dropped)
        for emote in self.emotes.values():
            if self.is_ignored(emote):
                continue
            yield emote

    def group_emotes(self):
        groups = {}
        for emote in self.unignored_emotes():
            base = emote.base_variant()
            if emote.name[:2].lower() == "/r":
                # Try to follow reversed emotes back to the unreversed name
                r_emote = self.emotes.get("/" + emote.name[2:])
                if r_emote is not None and not self.is_ignored(r_emote):
                    base = r_emote.base_variant()
            if hasattr(base, "info_set"):
                info = base.info_set()
            else:
                info = None # Custom emote
            groups.setdefault(info, []).append(emote)
        self.emote_groups = groups

    def match_variants(self):
        core_emotes, variants = {}, []
        matches, errors = {}, []

        # Locate core emotes. Ignore all variants but the base one.
        for emote in self.unignored_emotes():
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
                if unreversed_emote is not None and not self.is_ignored(unreversed_emote):
                    unreversed_base = unreversed_emote.base_variant()
                    if hasattr(unreversed_base, "info_set"):
                        info = unreversed_base.info_set()
                        if info in core_emotes:
                            # Perfect match
                            base = core_emotes[info]
            # Can't find it. Is there an explicit rule?
            match_config = self.context.config["RootVariantEmotes"].get(self.name, {})
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

class Emote(object):
    def __init__(self, name, variants, tags, ignore, source=None):
        self.name = name
        self.variants = variants
        self.tags = tags
        self.ignore = ignore
        self.source = source

        # Caches
        self._implied_tags = None
        self._all_tags = None

    @classmethod
    def load(cls, name, data, tags, source=None, context=None):
        variants = {}
        for (suffix, vdata) in data["Emotes"].items():
            type = vdata.pop("Type", "Normal")
            class_ = {"Normal": NormalVariant, "Custom": CustomVariant}[type]
            variant = class_.load(name, suffix, vdata)
            variants[suffix] = variant
        ignore = data.pop("Ignore", False)
        return cls(name, variants, tags, ignore, source=source)

    def dump(self):
        data = {"Emotes": {suffix: variant.dump() for (suffix, variant) in self.variants.items()}}
        if self.ignore:
            data["Ignore"] = self.ignore
        return data

    def base_variant(self):
        if "" in self.variants:
            return self.variants[""]
        elif len(self.variants) == 1:
            key = next(iter(self.variants.keys()))
            ## Should probably suffice
            #if key not in (":after", ":before"):
            #    print("WARNING: Unknown primary base suffix %r" % (key))
            return self.variants[key]
        raise ValueError("Cannot locate base emote for %r" % (self.name))

    def implied_tags(self, context):
        if self._implied_tags is None:
            self._implied_tags = set()
            for tag in self.tags:
                self._implied_tags |= set(context.tag_config["TagImplications"].get(tag, []))
        return self._implied_tags

    def all_tags(self, context):
        if self._all_tags is None:
            self._all_tags = self.implied_tags(context) | self.tags
        return self._all_tags

    def __repr__(self):
        return "<Emote %s>" % (self.name)

class EmoteCSSBlock(object):
    def __init__(self, name, suffix, css, ignore):
        self.name = name
        self.suffix = suffix
        self.css = css
        self.ignore = ignore

class _Variant(object):
    def selector(self):
        name = self.name[1:].replace("!", "_excl_").replace(":", "_colon_").replace("#", "_hash_").replace("/", "_slash_")
        return ".bpmote-" + bplib.combine_name_pair(name, self.suffix).lower()

class CustomVariant(_Variant):
    def __init__(self, name, suffix, css):
        self.name = name
        self.suffix = suffix
        self.css = css

    @classmethod
    def load(cls, name, suffix, data, emote=None):
        return cls(name, suffix, data["CSS"])

    def dump(self):
        return {"Type": "Custom", "CSS": self.css}

    def to_css(self):
        return self.css.copy()

    def __repr__(self):
        if self.suffix:
            return "<CustomVariant %s %s>" % (self.name, self.suffix)
        else:
            return "<CustomVariant %s>" % (self.name)

class NormalVariant(_Variant):
    def __init__(self, name, suffix, image_url, size, offset, css):
        self.name = name
        self.suffix = suffix
        self.image_url = image_url
        self.size = size
        self.offset = offset
        self.css = css

    @classmethod
    def load(cls, name, suffix, data):
        return cls(name, suffix, data["Image"], tuple(data["Size"]), tuple(data.get("Offset", (0, 0))), data.get("CSS", {}))

    def dump(self):
        data = {"Image": self.image_url, "Size": self.size}
        if self.offset != (0, 0):
            data["Offset"] = self.offset
        if self.css:
            data["CSS"] = self.css
        return data

    def info_set(self):
        return (self.image_url, self.size[0], self.size[1], self.offset[0], self.offset[1])

    def to_css(self):
        css = {
            "display": "block",
            "float": "left",
            "background-image": "url(%s)" % (self.image_url),
            "width": "%spx" % (self.size[0]),
            "height": "%spx" % (self.size[1]),
            }
        if self.offset != (0, 0) or self.suffix:
            css["background-position"] = "%spx %spx" % (self.offset[0], self.offset[1])
        css.update(self.css)
        return css

    def __repr__(self):
        if self.suffix:
            return "<NormalEmote %s %s>" % (self.name, self.suffix)
        else:
            return "<NormalEmote %s>" % (self.name)
