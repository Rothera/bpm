#!/usr/bin/env python3
# -*- coding: utf-8 -*-
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
import bz2
import glob
import itertools
import json
import os
import os.path
import shutil
import subprocess
import zipfile

import lxml.etree

def log(fmt, *args):
    print(fmt % args)

fmt = "/*{{%s}}*/"
def expand_vars(data):
    triggers = {fmt%k: v for (k, v) in data.items()}
    unexpanded = set(data)

    while unexpanded:
        for key in list(unexpanded):
            text = data[key]
            # A key is safe if it contains no references to other vars
            if not any(k in text for k in triggers):
                unexpanded.remove(key)
                break
            # Or if it only references safe vars (expand it)
            if not any(fmt%k in text for k in unexpanded):
                for (k, v) in triggers.items():
                    text = text.replace(k, v)
                data[key] = text
                unexpanded.remove(key)
                break
        else:
            # Couldn't find any new safe variables
            raise ValueError("Recursive variable instantiation?!")

def expand_all(vars, text):
    for (key, value) in vars.items():
        text = text.replace(fmt % (key), value)
    return text

def glob_all(g):
    return list(itertools.chain(*map(glob.glob, g)))

def newer(src, out):
    # No output files means we're forced to run; no way to know for sure
    if not out:
        return True
    # Missing output files- have to run to build them
    if any(not os.path.exists(f) for f in out):
        return True
    # The newest src file >= the oldest output file
    input_times = max(map(os.path.getmtime, src))
    output_times = min(map(os.path.getmtime, out))
    return input_times >= output_times

class Context:
    def __init__(self, config_fn, vars):
        self.config_fn = config_fn
        self.vars = vars
        self.cwds = {}

    def cd(self, **kwargs):
        class _context:
            def __enter__(self_):
                for (what, dir) in kwargs.items():
                    self.cwds[what] = self.path(what, dir)
            def __exit__(self_, exc_type, exc_val, exc_tb):
                # Good enough?
                for (what, dir) in kwargs.items():
                    self.cwds[what] = os.path.normpath(self.cwds[what][:-len(dir)])
        return _context()

    def path(self, what, path):
        return os.path.normpath(os.path.join(self.cwds.get(what, "."), path))

    def _cat(self, inputs):
        text = ""
        for fn in inputs:
            with open(fn) as file:
                text += file.read()
        return text

    def copy(self, src, dest="."):
        src = self.path("src", src)
        dest = self.path("dest", dest)
        if os.path.isdir(dest):
            dest = os.path.join(dest, os.path.basename(src))
        if newer([src], [dest]):
            print("copy: %s -> %s" % (src, dest))
            shutil.copyfile(src, dest)

    def remove(self, *paths):
        for p in paths:
            for g in glob.glob(p):
                print("delete: %s" % g)
                os.remove(g)

    def mkdir(self, *dirs):
        for d in dirs:
            try:
                os.makedirs(d)
                print("mkdir: %s" % d)
            except OSError:
                pass

    def filter(self, *inputs, dest=None, extravars=None):
        inputs = [self.path("src", p) for p in inputs]

        vars = self.vars.copy()
        if extravars:
            vars.update(extravars)

        text = self._cat(inputs)
        text = expand_all(vars, text)
        if dest:
            dest = self.path("dest", dest)
            if newer(inputs + [self.config_fn], [dest]):
                print("filter: %s -> %s" % (" ".join(inputs), dest))
                with open(dest, "w") as file:
                    file.write(text)
        else:
            return text

    def run(self, *args, deps=[], out=[], **kwargs):
        srcs = list(deps)
        if os.path.exists(args[0]):
            srcs.append(args[0])
        if newer(srcs, out):
            print("run: %s" % " ".join(args))
            subprocess.call(args, **kwargs)

    def zip(self, zipfn, root, prefix=None):
        zip = zipfile.ZipFile(zipfn, "w")
        print("zip: making %s from %s" % (zipfn, root))
        if not prefix:
            prefix = root
        for path, dirs, files in os.walk(root):
            for name in files:
                src = os.path.normpath(os.path.join(path, name))
                assert src.startswith(prefix)
                name = src[len(prefix):]
                zip.write(src, name)
        return zip

    def bzip2(self, src, dest=None):
        if not dest:
            dest = src + ".bz2"
        if newer([src], [dest]):
            print("bz2: %s -> %s" % (src, dest))
            with bz2.BZ2File(dest, "w") as out:
                with open(src, "rb") as file:
                    out.write(file.read())

Targets = {}
def target(*names):
    def decorator(func):
        for name in names:
            Targets[name] = func
        return func
    return decorator

@target("default")
def default(ctx):
    fx_package(ctx)
    cr_package(ctx)
    o_package(ctx)
    gen_userscript(ctx)
    gen_update_manifests(ctx)
    gen_exports(ctx)
    update_www(ctx)

XpiKey = """
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCZnk8XNNC6+pmDqxY/5CzREJXj
BUY2JzvtcIMBH9gvyq7ZoOdCHIxm2rew7jZ76zdJfKlsUXI2tEdvR5C5PI4NBCw7
PGm6yzGLSn8/cG7tG9XvpnyxGAX8TfQyV602NhAucqJXYGvCNePalZGU7FJbeJc1
5JjoU+fv8mFBK/QTAwIDAQAB
"""

def inject_xpi_key(ifn, ofn):
    print("xpi: injecting key into", ofn)
    xpi_in = zipfile.ZipFile(ifn, "r")
    xpi_out = zipfile.ZipFile(ofn, "w")

    for item in xpi_in.infolist():
        data = xpi_in.read(item.filename)

        if item.filename == "install.rdf":
            item = "install.rdf"

            manifest = lxml.etree.fromstring(data)
            update_key = lxml.etree.Element("{http://www.mozilla.org/2004/em-rdf#}updateKey")
            update_key.text = XpiKey
            manifest[0].append(update_key)
            data = lxml.etree.tostring(manifest, encoding=str, pretty_print=True)

        xpi_out.writestr(item, data)

    xpi_in.close()
    xpi_out.close()

@target("fx-package", "build/betterponymotes.xpi")
def fx_package(ctx):
    ctx.mkdir("build/firefox/lib", "build/firefox/data")
    build_script(ctx)
    build_data(ctx)

    with ctx.cd(dest="build/firefox"):
        ctx.filter("addon/fx-package.json", dest="package.json")
        ctx.copy("addon/fx-main.js", "lib/main.js")

        ctx.copy("build/betterponymotes.js", "data")
        ctx.copy("build/bpm-resources.js", "data")
        ctx.copy("build/bpm-resources.js", "lib")
        ctx.copy("build/emote-classes.css", "data")

        ctx.copy("addon/pref-setup.js", "lib")
        ctx.copy("addon/bpmotes.css", "data")
        ctx.copy("addon/combiners-nsfw.css", "data")
        ctx.copy("addon/extracss-pure.css", "data")
        ctx.copy("addon/extracss-moz.css", "data")
        ctx.copy("addon/options.html", "data")
        ctx.copy("addon/options.css", "data")
        ctx.copy("addon/options.js", "data")
        ctx.copy("addon/bootstrap.css", "data")
        ctx.copy("addon/jquery-1.8.2.js", "data")

    if newer(glob_all(["build/firefox/*", "build/firefox/data/*", "build/firefox/lib/*"]),
                 ["build/betterponymotes.xpi"]):
        ctx.remove("build/*.xpi")
        ctx.run("cfx", "xpi", "--update-url=http://rainbow.mlas1.us/betterponymotes.update.rdf", "--pkgdir=build/firefox")
        inject_xpi_key("betterponymotes.xpi", "build/betterponymotes.xpi")
        ctx.remove("betterponymotes.xpi")

KeyFile = "../secret/betterponymotes.pem"

@target("cr-package", "build/chrome.zip")
def cr_package(ctx):
    ctx.mkdir("build/chrome")
    build_script(ctx)
    build_data(ctx)

    with ctx.cd(dest="build/chrome"):
        ctx.filter("addon/cr-manifest.json", dest="manifest.json")
        ctx.copy("addon/cr-background.html", "background.html")
        ctx.copy("addon/cr-background.js", "background.js")

        ctx.copy("build/betterponymotes.js")
        ctx.copy("build/bpm-resources.js")
        ctx.copy("build/emote-classes.css")
        ctx.copy("build/gif-animotes.css")

        ctx.copy("addon/pref-setup.js")
        ctx.copy("addon/bpmotes.css")
        ctx.copy("addon/combiners-nsfw.css")
        ctx.copy("addon/extracss-pure.css")
        ctx.copy("addon/extracss-webkit.css")
        ctx.copy("addon/options.html")
        ctx.copy("addon/options.css")
        ctx.copy("addon/options.js")
        ctx.copy("addon/bootstrap.css")
        ctx.copy("addon/jquery-1.8.2.js")

    if newer(glob.glob("build/chrome/*"), ["build/chrome.zip"]):
        zip = ctx.zip("build/chrome.zip", "build/chrome/")
        zip.write(KeyFile, "key.pem")

@target("o-package", "build/betterponymotes.oex")
def o_package(ctx):
    ctx.mkdir("build/opera/includes")
    build_script(ctx)
    build_data(ctx)

    with ctx.cd(dest="build/opera"):
        ctx.filter("addon/o-config.xml", dest="confg.xml")
        ctx.copy("addon/o-index.html", "index.html")
        ctx.copy("addon/o-background.js", "background.js")

        ctx.copy("build/betterponymotes.js", "includes")
        ctx.copy("build/bpm-resources.js", "includes")
        ctx.copy("build/bpm-resources.js")
        ctx.copy("build/emote-classes.css")

        ctx.copy("addon/pref-setup.js")
        ctx.copy("addon/bpmotes.css")
        ctx.copy("addon/combiners-nsfw.css")
        ctx.copy("addon/extracss-pure-opera.css", "extracss-pure.css")
        ctx.copy("addon/extracss-o.css")
        ctx.copy("addon/options.html")
        ctx.copy("addon/options.css")
        ctx.copy("addon/options.js")
        ctx.copy("addon/bootstrap.css")
        ctx.copy("addon/jquery-1.8.2.js")

    if newer(glob_all(["build/opera/*", "build/opera/includes/*"]),
                 ["build/betterponymotes.oex"]):
        ctx.remove("build/*.oex")
        ctx.zip("build/betterponymotes.oex", "build/opera/")

UserscriptResourcePrefix = "http://rainbow.mlas1.us/"

@target("userscript", "build/betterponymotes.user.js")
def gen_userscript(ctx):
    make_script(ctx, "build/betterponymotes.user.js", extravars={"require_prefix": UserscriptResourcePrefix})

@target("update-manifests", "build/betterponymotes.update.rdf", "build/opera-updates.xmls")
def gen_update_manifests(ctx):
    if newer(["build/betterponymotes.xpi"], ["build/betterponymotes.update.rdf"]):
        # Have to check deps ourselves due to open() call
        ctx.run("uhura", "-k", KeyFile, "build/betterponymotes.xpi",
                "http://rainbow.mlas1.us/betterponymotes_%s.xpi" % (ctx.vars["version"]),
                stdout=open("build/betterponymotes.update.rdf", "w"))
    if newer(["build/betterponymotes.oex"], ["build/opera-updates.xml"]):
        version = ctx.vars["version"]
        open("build/opera-updates.xml", "w").write(
            '<update-info xmlns="http://www.w3.org/ns/widgets" ' +
            'src="http://rainbow.mlas1.us/betterponymotes_%s.oex" version="%s"/>\n' % (version, version))

@target("exports", "build/export.json")
def gen_exports(ctx):
    ctx.mkdir("build")

    ctx.run("./bpexport.py", "--json", "build/export.json",
            deps=SourceEmoteData, out=["build/export.json"])
    ctx.bzip2("build/export.json")

@target("update-www", "www")
def update_www(ctx):
    ctx.copy("web/changelog.html", "www")
    ctx.copy("web/firefox-logo.png", "www")
    ctx.copy("web/chrome-logo.png", "www")
    ctx.copy("web/opera-logo.png", "www")
    ctx.filter("web/index.html", dest="www/index.html")
    if newer(["build/betterponymotes.xpi", "build/betterponymotes.oex"],
                 ["www/betterponymotes.xpi", "www/betterponymotes.oex"]):
        ctx.remove("www/*.xpi", "www/*.oex")
        ctx.copy("build/betterponymotes.xpi", "www")
        ctx.copy("build/betterponymotes.xpi", "www/betterponymotes_%s.xpi" % (ctx.vars["version"]))
        ctx.copy("build/betterponymotes.oex", "www")
        ctx.copy("build/betterponymotes.oex", "www/betterponymotes_%s.oex" % (ctx.vars["version"]))

@target("sync")
def sync(ctx):
    fx_package(ctx)
    cr_package(ctx)
    o_package(ctx)
    gen_userscript(ctx)
    update_www(ctx)

    os.chdir("www")
    ctx.run("rsync", "-vvLr", "--delete", "./", "ref@mlas1.us:www")
    os.chdir("..")

ScriptFiles = [
    "addon/bpm-header.js",
    "addon/bpm-utils.js",
    "addon/bpm-data.js",
    "addon/bpm-browser.js",
    "addon/bpm-prefs.js",
    "addon/bpm-reddit.js",
    "addon/bpm-search.js",
    "addon/bpm-global.js",
    "addon/bpm-main.js"
    ]

@target("build/betterponymotes.js")
def build_script(ctx):
    ctx.mkdir("build")
    ctx.filter(*ScriptFiles, dest="build/betterponymotes.js")

def make_script(ctx, output, extravars=None):
    ctx.filter(*ScriptFiles, dest=output, extravars=extravars)

SourceEmoteData = glob_all([
    "emotes/*.json",
    "tags/*.json",
    "data/rules.yaml",
    "data/tags.yaml"
    ])

@target("addon-data")
def build_data(ctx):
    ctx.mkdir("build")
    ctx.run("./dlanimotes.py", deps=SourceEmoteData, out=["build/gif-animotes.css"])
    ctx.run("./bpgen.py", deps=SourceEmoteData, out=["build/bpm-resources.js", "build/emote-classes.css"])

def run_target(ctx, target):
    func = Targets[target]
    print("---", target)
    func(ctx)

def main():
    parser = argparse.ArgumentParser(description="BPM Build Tool")
    parser.add_argument("-c", default="data/config.json", metavar="config", help="Config file")
    parser.add_argument("targets", nargs="*", help="Targets to build", default=["default"])
    args = parser.parse_args()

    with open(args.c) as file:
        vars = json.load(file)
    expand_vars(vars)
    ctx = Context(args.c, vars)

    for t in args.targets:
        run_target(ctx, t)

if __name__ == "__main__":
    main()
