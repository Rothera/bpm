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

import argparse
import os
import os.path
import random
import readline
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.request

UA = "BetterPonymotes stylesheet update checker (1req/2.5secs; pm Typhos)"

def cmd_help(args):
    parser = argparse.ArgumentParser(description="Print help text", prog="help")
    args = parser.parse_args(args)

    print(" ".join(sorted(Commands)))

def cmd_list(args):
    parser = argparse.ArgumentParser(description="List updated files", prog="list")
    args = parser.parse_args(args)

    print("Stylesheet updates:")
    subprocess.call(["bzr", "status", "stylesheets"])
    print("Emote updates:")
    subprocess.call(["bzr", "status", "emotes"])

def update_css(num, total, subreddit):
    url = "http://reddit.com/r/%s/stylesheet.css?nocache=%s" % (subreddit, random.randrange(1000000))

    try:
        old_ss = open("stylesheets/%s.css" % (subreddit), "rb").read()
    except IOError:
        # Assume file doesn't exist; new subreddit
        print("NOTICE: stylesheets/%s.css does not exist; new subreddit?" % (subreddit))
        old_ss = ""

    print("[%s/%s]: %s" % (num+1, total, url))
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req) as stream:
            new_ss = stream.read()
    except urllib.error.HTTPError as error:
        print("ERROR:", error)
        return None

    if old_ss != new_ss:
        print("NOTICE: Stylesheet changed in r/%s" % (subreddit))
        with open("stylesheets/%s.css" % (subreddit), "wb") as file:
            file.write(new_ss)
        return subreddit

def cmd_update(args):
    parser = argparse.ArgumentParser(description="Update stylesheet cache", prog="update")
    parser.add_argument("-s", "--start", help="Subreddit to start from")
    parser.add_argument("subreddits", nargs="*")
    args = parser.parse_args(args)

    if not args.subreddits:
        filenames = [fn for fn in sorted(os.listdir("stylesheets")) if fn.endswith(".css")]
        filenames.sort()
        subreddits = [fn.split(".")[0] for fn in filenames]
    else:
        subreddits = args.subreddits

    if args.start is not None:
        subreddits = subreddits[subreddits.index(args.start):]

    updates = []
    for (i, sr) in enumerate(subreddits[:-1]):
        updates.append(update_css(i, len(subreddits), sr))
        time.sleep(2.5)
    updates.append(update_css(len(subreddits) - 1, len(subreddits), subreddits[-1]))

    updates = list(filter(None, updates))
    if updates:
        print(len(updates), "updates:", *updates)
    else:
        print("0 updates")

def cmd_extract(args):
    parser = argparse.ArgumentParser(description="Extract emotes", prog="extract")
    parser.add_argument("subreddits", nargs="+")
    args = parser.parse_args(args)

    # TODO: Supporting nargs="*" and extracting every updated subreddit would
    # be nice, but we'd have to call into bzrlib to check what files were
    # modified/added or something.

    for (i, sr) in enumerate(args.subreddits):
        print("[%s/%s]: %s" % (i+1, len(args.subreddits), sr))
        # TODO: Don't hardcode relative paths...
        subprocess.call(["./bpextract.py", "stylesheets/%s.css" % (sr), "emotes/%s.yaml" % (sr)])

def cmd_extractall(args):
    parser = argparse.ArgumentParser(description="Re-extract all emotes", prog="extractall")
    args = parser.parse_args(args)

    filenames = [fn for fn in sorted(os.listdir("stylesheets")) if fn.endswith(".css")]
    filenames.sort()
    subreddits = [fn.split(".")[0] for fn in filenames]

    for (i, sr) in enumerate(subreddits):
        print("[%s/%s]: %s" % (i+1, len(subreddits), sr))
        # TODO: Don't hardcode relative paths...
        subprocess.call(["./bpextract.py", "stylesheets/%s.css" % (sr), "emotes/%s.yaml" % (sr)])

def cmd_diffcss(args):
    parser = argparse.ArgumentParser(description="Run diff program on CSS cache", prog="diffcss")
    args = parser.parse_args(args)

    # Lots of context is important when reading css diffs, but unfortunately
    # bzr doesn't have an option to specify how many lines to output.
    p1 = subprocess.Popen(["bzr", "diff", "stylesheets", "--diff-options=-U 10"], stdout=subprocess.PIPE)
    p2 = subprocess.Popen(["kompare", "-"], stdin=p1.stdout)

def cmd_diffemotes(args):
    parser = argparse.ArgumentParser(description="Run diff program on emotes", prog="diffemotes")
    args = parser.parse_args(args)

    p1 = subprocess.Popen(["bzr", "diff", "emotes", "--diff-options=-U 10"], stdout=subprocess.PIPE)
    p2 = subprocess.Popen(["kompare", "-"], stdin=p1.stdout)

def cmd_commit(args):
    parser = argparse.ArgumentParser(description="Commit CSS and emote cache", prog="commit")
    args = parser.parse_args(args)

    subprocess.call(["bzr", "commit", "stylesheets", "-m", time.strftime("Stylesheet updates %Y-%m-%d")])
    subprocess.call(["bzr", "commit", "emotes", "-m", time.strftime("Emote updates %Y-%m-%d")])

Commands = {
    "help": cmd_help,
    "list": cmd_list,
    "update": cmd_update,
    "extract": cmd_extract,
    "extractall": cmd_extractall,
    "diffcss": cmd_diffcss,
    "diffemotes": cmd_diffemotes,
    "commit": cmd_commit,
    }

def run_command(args):
    cmd = args.pop(0).lower()

    if cmd not in Commands:
        print("Error: unknown command")
    else:
        Commands[cmd](args)

def run_interactive():
    while True:
        try:
            line = input("> ").strip()
        except (KeyboardInterrupt, EOFError):
            break

        if not line:
            continue

        args = line.split()
        try:
            run_command(args)
        except SystemExit:
            # Pesky argparse can't be made to stop doing this
            pass

def main():
    if len(sys.argv) > 1:
        run_command(sys.argv[1:])
    else:
        run_interactive()

if __name__ == "__main__":
    main()
