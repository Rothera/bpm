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

import fnmatch
import os
import random
import readline
import shutil
import subprocess
import sys
import time
import urllib.request

def cmd_help(args):
    if args:
        print("Usage: help")
    else:
        print(" ".join(Commands))

def cmd_quit(args):
    sys.exit(0)

def cmd_list(args):
    print(", ".join(os.listdir("stylesheet-updates")))

def cmd_diff_css(args):
    if len(args) != 1:
        print("Usage: diffcss <subreddit>")
    else:
        subprocess.Popen(["kompare", "stylesheet-cache/%s.css" % (args[0]), "stylesheet-updates/%s.css" % (args[0])])

def cmd_edit(args):
    if not len(args):
        print("Usage: edit <files...>")
    else:
        subprocess.Popen(["kate", "-n"] + args)

def cmd_resolve_css(args):
    if len(args) != 1:
        print("Usage: resolvecss <subreddit>")
    else:
        shutil.move("stylesheet-updates/%s.css" % (args[0]), "stylesheet-cache/%s.css" % (args[0]))

UA = "BetterPonymotes stylesheet update checker (1req/2.5secs; pm Typhos)"
SESS = "reddit_session=9958622%2C2012-06-14T22%3A56%3A05%2C432b711c2f42ca0748d224c12c54ec2ed514cd7d"

def update_css(num, total, subreddit):
    url = "http://reddit.com/r/%s/stylesheet?nocache=%s" % (subreddit, random.randrange(1000000))

    old_ss = open("stylesheet-cache/%s.css" % (subreddit), "rb").read()

    print("%s/%s: %s" % (num+1, total, url))
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Cookie": SESS})
    with urllib.request.urlopen(req) as stream:
        new_ss = stream.read()

    if old_ss != new_ss:
        print("NOTICE: Stylesheet changed in r/%s" % (subreddit))
        with open("stylesheet-updates/%s.css" % (subreddit), "wb") as file:
            file.write(new_ss)

def cmd_update(args):
    if not args:
        filenames = [fn for fn in os.listdir("stylesheet-updates") if fn.endswith(".css")]
        subreddits = [fn.split(".")[0] for fn in filenames]
    else:
        subreddits = args

    for (i, sr) in enumerate(subreddits[:-1]):
        update_css(i, len(subreddits), sr)
        time.sleep(2.5)
    update_css(len(subreddits) - 1, len(subreddits), subreddits[-1])

def cmd_extract(args):
    if not args:
        filenames = [fn for fn in os.listdir("stylesheet-updates") if fn.endswith(".css")]
        subreddits = [fn.split(".")[0] for fn in filenames]
    else:
        subreddits = args

    for sr in subreddits:
        print(sr)
        subprocess.call(["./bpextract.py", "stylesheet-updates/%s.css" % (sr), "emote-updates/%s.yaml" % (sr)])

def cmd_diff_emotes(args):
    if len(args) != 1:
        print("Usage: diffemotes <subreddit>")
    else:
        subprocess.call(["./diff.py", "emotes/%s.yaml" % (args[0]), "emote-updates/%s.yaml" % (args[0])])

def cmd_resolve_emotes(args):
    if len(args) != 1:
        print("Usage: resolveemotes <subreddit>")
    else:
        shutil.move("emote-updates/%s.yaml" % (args[0]), "emotes/%s.yaml" % (args[0]))

Commands = {
    "help": cmd_help,
    "quit": cmd_quit,
    "list": cmd_list,
    "diffcss": cmd_diff_css,
    "edit": cmd_edit,
    "resolvecss": cmd_resolve_css,
    "update": cmd_update,
    "extract": cmd_extract,
    "diffemotes": cmd_diff_emotes,
    "resolveemotes": cmd_resolve_emotes
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
        run_command(args)

def main():
    if len(sys.argv) > 1:
        run_command(sys.argv[1:])
    else:
        run_interactive()

if __name__ == "__main__":
    main()
