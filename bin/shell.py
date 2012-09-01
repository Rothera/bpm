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
import urllib.request

STYLESHEET_CACHE_DIR = "../stylesheet-cache"
UA = "BetterPonymotes stylesheet update checker (1req/2.5secs; pm Typhos)"
SESS = "reddit_session=9958622%2C2012-06-14T22%3A56%3A05%2C432b711c2f42ca0748d224c12c54ec2ed514cd7d"

def ss_cache(path):
    return os.path.join(STYLESHEET_CACHE_DIR, path)

def cmd_help(args):
    parser = argparse.ArgumentParser(description="Print help text", prog="help")
    args = parser.parse_args(args)

    print(" ".join(sorted(Commands)))

def cmd_list(args):
    parser = argparse.ArgumentParser(description="List updated files", prog="list")
    args = parser.parse_args(args)

    print("Stylesheet updates:")
    subprocess.call(["bzr", "status", STYLESHEET_CACHE_DIR])
    print("Emote updates:")
    subprocess.call(["bzr", "status", "emotes"])

def update_css(num, total, subreddit):
    url = "http://reddit.com/r/%s/stylesheet?nocache=%s" % (subreddit, random.randrange(1000000))

    try:
        old_ss = open(ss_cache(subreddit + ".css"), "rb").read()
    except IOError:
        # Assume file doesn't exist; new subreddit
        print("NOTICE: %s does not exist; new subreddit?" % (ss_cache(subreddit + ".css")))
        old_ss = ""

    print("[%s/%s]: %s" % (num+1, total, url))
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Cookie": SESS})
    with urllib.request.urlopen(req) as stream:
        new_ss = stream.read()

    if old_ss != new_ss:
        print("NOTICE: Stylesheet changed in r/%s" % (subreddit))
        with open(ss_cache(subreddit + ".css"), "wb") as file:
            file.write(new_ss)
        return subreddit

def cmd_update(args):
    parser = argparse.ArgumentParser(description="Update stylesheet cache", prog="update")
    parser.add_argument("subreddits", nargs="*")
    args = parser.parse_args(args)

    if not args.subreddits:
        filenames = [fn for fn in sorted(os.listdir(STYLESHEET_CACHE_DIR)) if fn.endswith(".css")]
        filenames.sort()
        subreddits = [fn.split(".")[0] for fn in filenames]
    else:
        subreddits = args.subreddits

    updates = []
    for (i, sr) in enumerate(subreddits[:-1]):
        updates.append(update_css(i, len(subreddits), sr))
        time.sleep(2.5)
    updates.append(update_css(len(subreddits) - 1, len(subreddits), subreddits[-1]))

    updates = filter(None, updates)
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
        subprocess.call(["./bpextract.py", ss_cache(sr + ".css"), "emotes/%s.yaml" % (sr)])

def cmd_diffcss(args):
    parser = argparse.ArgumentParser(description="Run diff program on CSS cache", prog="diffcss")
    args = parser.parse_args(args)

    p1 = subprocess.Popen(["bzr", "diff", STYLESHEET_CACHE_DIR], stdout=subprocess.PIPE)
    p2 = subprocess.Popen(["kompare", "-"], stdin=p1.stdout)

def cmd_diffemotes(args):
    parser = argparse.ArgumentParser(description="Run diff program on emotes", prog="diffemotes")
    args = parser.parse_args(args)

    p1 = subprocess.Popen(["bzr", "diff", "emotes"], stdout=subprocess.PIPE)
    p2 = subprocess.Popen(["kompare", "-"], stdin=p1.stdout)

def cmd_commitcss(args):
    parser = argparse.ArgumentParser(description="Commit CSS cache", prog="commitcss")
    args = parser.parse_args(args)

    subprocess.call(["bzr", "commit", STYLESHEET_CACHE_DIR, "-m", time.strftime("Stylesheet updates %Y-%m-%d")])

Commands = {
    "help": cmd_help,
    "list": cmd_list,
    "update": cmd_update,
    "extract": cmd_extract,
    "diffcss": cmd_diffcss,
    "diffemotes": cmd_diffemotes,
    "commitcss": cmd_commitcss,
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
