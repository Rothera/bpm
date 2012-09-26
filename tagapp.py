#!/usr/bin/python
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

import argparse
import functools
import json
import os
import os.path
import random
import string
import StringIO

import flask
from flask import request
import yaml

import bplib
import bplib.file
import bpgen

app = flask.Flask(__name__, static_folder="tagapp-static", static_url_path="/static")

secret_key = "".join(random.choice(string.letters) for _ in range(32))
print("SECRET KEY: %s" % (secret_key))

def check_auth(username, password):
    return str(username) == "admin" and str(password) == secret_key

def requires_auth(f):
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        auth = request.authorization
        if not auth or not check_auth(auth.username, auth.password):
            return flask.Response("Access denied", 401, {"WWW-Authenticate": "Basic realm=\"Login Required\""})
        return f(*args, **kwargs)
    return decorated

files = {}      # subreddit -> EmoteFile
css_cache = {}  # subreddit -> str
tags = {}       # subreddit -> {emote: [tags...]}
all_tags = []   # sorted set

def sync_tags(subreddit):
    assert subreddit in tags
    data = tags[subreddit]
    subreddit = subreddit.translate(None, "./\\") # Paranoia
    path = "tags/%s.yaml" % (subreddit)
    if data:
        file = open(path, "w")
        yaml.dump(tags[subreddit], file)
    else:
        try:
            # My god... this comes from the site...
            os.remove(path)
        except OSError:
            pass

def make_tag_list():
    global all_tags
    tmp = set()
    for (sr, es) in tags.items():
        for (e, t) in es.items():
            tmp |= set(t)
    all_tags = sorted(tmp)

def get_css(sr):
    if sr not in css_cache:
        css_rules = bpgen.build_css(files[sr].emotes)
        stream = StringIO.StringIO()
        bpgen.dump_css(stream, css_rules)
        css_cache[sr] = stream.getvalue()
    return css_cache[sr]

def load_file(sr):
    data = bplib.load_yaml_file(open("emotes/%s.yaml" % (sr)))
    file = bplib.file.EmoteFile.load(data)
    file.se = {}
    for (n, e) in file.emotes.items():
        if sr != "mylittlepony" and n in files["mylittlepony"].emotes:
            continue

        if hasattr(e, "image_url"):
            sz = (e.image_url, e.offset[1], e.offset[0], e.size[0], e.size[1])
        else:
            sz = (-1, -1, -1, -1)
        file.se.setdefault(sz, []).append(e)
    if sr != "mylittlepony":
        for k in files["mylittlepony"].emotes:
            if k in file.emotes:
                del file.emotes[k]
    files[sr] = file
    try:
        tags[sr] = bplib.load_yaml_file(open("tags/%s.yaml" % (sr)))
    except IOError:
        tags[sr] = {}

print("Loading emotes...")

subreddits = [os.path.splitext(f)[0] for f in os.listdir("emotes")]
subreddits.remove("mylittlepony")
subreddits.insert(0, "mylittlepony")

for sr in subreddits:
    load_file(sr)
make_tag_list()

subreddits.sort()
print("Done.")

@app.route("/")
def index():
    return flask.render_template("index.html", subreddits=subreddits, all_tags=all_tags)

@app.route("/r/<subreddit>/tag")
def tag(subreddit):
    subreddit = str(subreddit)
    # Used in template
    flask.g.sorted = sorted
    flask.g.repr = repr
    return flask.render_template("tag.html", subreddit=subreddit, file=files[subreddit], tags=tags.get(subreddit, {}))

@app.route("/r/<subreddit>/write", methods=["POST"])
def write(subreddit):
    subreddit = str(subreddit)
    data = json.loads(request.form["tags"])
    target = tags.setdefault(subreddit, {})
    for (k, t) in data.items():
        assert isinstance(k, unicode)
        assert isinstance(t, list) and all([isinstance(r, unicode) for r in t])
        k = str(k)
        t = map(str, t)
        if t:
            target[k] = sorted(t)
        elif k in target:
            del target[k]
    sync_tags(subreddit)
    make_tag_list()
    return flask.redirect(flask.url_for("index"))

@app.route("/r/<subreddit>/css")
def css(subreddit):
    subreddit = str(subreddit)
    return flask.Response(get_css(subreddit), mimetype="text/css")

@app.route("/tag/<tag>")
def taginfo(tag):
    tag = str(tag)
    data = {}
    for (sr, emotes) in tags.items():
        data[sr] = []
        for (name, t) in emotes.items():
            if tag in t:
                data[sr].append((files[sr].emotes[(name, None)], tags[sr][name]))
        if not data[sr]:
            del data[sr]
    return flask.render_template("taginfo.html", tag=tag, data=data)

@app.route("/tag/<tag>/rename", methods=["POST"])
@requires_auth
def rename_tag(tag):
    tag = str(tag)
    to = str(request.form["to"])
    for (sr, emotes) in tags.items():
        dirty = False
        for (name, t) in emotes.items():
            if tag in t:
                t.remove(tag)
                if to not in t:
                    t.append(to)
                dirty = True
        if dirty:
            sync_tags(sr)
    all_tags.remove(tag)
    if to not in all_tags:
        all_tags.append(to)
        all_tags.sort()
    return flask.redirect(flask.url_for("taginfo", tag=to))

@app.route("/tag/<tag>/delete", methods=["POST"])
@requires_auth
def delete_tag(tag):
    tag = str(tag)
    for (sr, emotes) in tags.items():
        dirty = False
        for (name, t) in emotes.items():
            if tag in t:
                t.remove(tag)
                dirty = True
        if dirty:
            sync_tags(sr)
    all_tags.remove(tag)
    return flask.redirect(flask.url_for("index"))

def main():
    parser = argparse.ArgumentParser(description="Emote tagger webapp")
    parser.add_argument("-d", "--debug", help="Enable debug mode", default=False, action="store_true")
    args = parser.parse_args()

    app.debug = args.debug

    app.run()

if __name__ == "__main__":
    main()
