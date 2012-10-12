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
import bplib.objects
import bpgen

files = {}      # subreddit -> Subreddit
all_tags = []   # sorted set
css_cache = {}  # subreddit -> str

def filter_file(file):
    file.se = {}
    for (name, emote) in file.emotes.items():
        # Simple hack to essentially just remove +drop emotes, since all of
        # r/mlp's are
        if subreddit != "mylittlepony" and name in files["mylittlepony"].emotes:
            continue

        if hasattr(emote, "image_url"):
            info = (emote.image_url, emote.offset[1], emote.offset[0], emote.size[0], emote.size[1])
        else:
            info = (-1, -1, -1, -1)
        file.se.setdefault(info, []).append(emote)
    if subreddit != "mylittlepony":
        for name in files["mylittlepony"].emotes:
            if name in file.emotes:
                del file.emotes[name]
    return file

def make_tag_list():
    global all_tags
    tmp = set()
    for (subreddit, file) in files.items():
        for (name, emote) in file.emotes.items():
            tmp |= emote.tags
    all_tags = sorted(tmp)

print("Loading emotes...")
config = bplib.load_yaml_file(open("data/rules.yaml"))
files = {}
loader = bplib.objects.SubredditLoader()
files["mylittlepony"] = loader.load_subreddit("mylittlepony")
for subreddit in config["Subreddits"]:
    if subreddit == "mylittlepony":
        continue
    file = loader.load_subreddit(subreddit)
    if file is None:
        continue
    filter_file(file)
    files[subreddit] = file
make_tag_list()
print("Done.")

def sync_tags(subreddit):
    assert subreddit in files
    path = "tags/%s.yaml" % (subreddit)
    file = open(path, "w")
    yaml.dump(files[subreddit].dump_tags(), file)

def get_css(subreddit):
    if subreddit not in css_cache:
        css_rules = bpgen.build_css(files[subreddit].emotes)
        stream = StringIO.StringIO()
        bpgen.dump_css(stream, css_rules)
        css_cache[subreddit] = stream.getvalue()
    return css_cache[subreddit]

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

@app.route("/")
def index():
    return flask.render_template("index.html", subreddits=files.keys(), all_tags=all_tags)

@app.route("/r/<subreddit>/tag")
def tag(subreddit):
    subreddit = str(subreddit)
    # Used in template
    flask.g.sorted = sorted
    flask.g.repr = repr
    tags = {name: emote.tags for (name, emote) in files[subreddit].emotes.items()}
    return flask.render_template("tag.html", subreddit=subreddit, file=files[subreddit], tags=tags)

@app.route("/r/<subreddit>/write", methods=["POST"])
def write(subreddit):
    subreddit = str(subreddit)
    data = json.loads(request.form["tags"])
    file = files[subreddit]
    for (name, tags) in data.items():
        assert isinstance(name, unicode)
        assert isinstance(tags, list) and all([isinstance(r, unicode) for r in tags])
        file.emotes[str(name)].tags = set(map(str, tags))
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
    for (subreddit, file) in files.items():
        data[subreddit] = []
        for (name, emote) in file.emotes.items():
            if tag in emote.tags:
                data[subreddit].append(emote)
        if not data[subreddit]:
            del data[subreddit]
    flask.g.sorted = sorted
    return flask.render_template("taginfo.html", tag=tag, data=data)

@app.route("/tag/<tag>/rename", methods=["POST"])
@requires_auth
def rename_tag(tag):
    tag = str(tag)
    to = str(request.form["to"])
    if not to.startswith("+"):
        to = "+" + to
    for (subreddit, file) in files.items():
        dirty = False
        for (name, emote) in file.emotes.items():
            if tag in emote.tags:
                emote.tags.remove(tag)
                emote.tags.add(to)
                dirty = True
        if dirty:
            sync_tags(subreddit)
    all_tags.remove(tag)
    if to not in all_tags:
        all_tags.append(to)
        all_tags.sort()
    return flask.redirect(flask.url_for("taginfo", tag=to))

@app.route("/tag/<tag>/delete", methods=["POST"])
@requires_auth
def delete_tag(tag):
    tag = str(tag)
    if not tag.startswith("+"):
        tag = "+" + tag
    for (subreddit, file) in files.items():
        dirty = False
        for (name, emote) in file.emotes.items():
            if tag in emote.tags:
                emote.tags.remove(tag)
                dirty = True
        if dirty:
            sync_tags(subreddit)
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
