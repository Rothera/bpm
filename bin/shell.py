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

import os
import random
import readline
import shutil
import subprocess
import sys
import time
import urllib.request

context = None

def get_opt_arg(args, usage):
    global context
    if not len(args):
        if context:
            return context
        else:
            print(usage)
    elif len(args) == 1:
        context = args[0]
        return context
    else:
        print(usage)

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
    subreddit = get_opt_arg(args, "Usage: diffcss <subreddit>")
    if subreddit:
        subprocess.Popen(["kompare", "stylesheet-cache/%s.css" % (subreddit), "stylesheet-updates/%s.css" % (subreddit)])

def cmd_edit(args):
    if not len(args):
        print("Usage: edit <files...>")
    else:
        subprocess.Popen(["kate", "-n"] + args)

def cmd_resolve_css(args):
    subreddit = get_opt_arg(args, "Usage: resolvecss <subreddit>")
    if subreddit:
        shutil.move("stylesheet-updates/%s.css" % (subreddit), "stylesheet-cache/%s.css" % (subreddit))

UA = "BetterPonymotes stylesheet update checker (1req/2.5secs; pm Typhos)"
SESS = "reddit_session=9958622%2C2012-06-14T22%3A56%3A05%2C432b711c2f42ca0748d224c12c54ec2ed514cd7d"

def update_css(num, total, subreddit):
    url = "http://reddit.com/r/%s/stylesheet?nocache=%s" % (subreddit, random.randrange(1000000))

    try:
        old_ss = open("stylesheet-cache/%s.css" % (subreddit), "rb").read()
    except IOError:
        # Assume file doesn't exist; new subreddit
        print("NOTICE: stylesheet-cache/%s.css does not exist; new subreddit?" % (subreddit))
        old_ss = ""

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
        # TODO: Don't hardcode relative paths...
        subprocess.call(["bin/bpextract.py", "stylesheet-updates/%s.css" % (sr), "emote-updates/%s.yaml" % (sr)])

def cmd_extract_all(args):
    if args:
        print("Usage: extractall")
        return

    filenames = [fn for fn in os.listdir("stylesheet-cache") if fn.endswith(".css")]
    subreddits = [fn.split(".")[0] for fn in filenames]

    for sr in subreddits:
        print(sr)
        # TODO: Don't hardcode relative paths...
        subprocess.call(["bin/bpextract.py", "stylesheet-cache/%s.css" % (sr), "emotes/%s.yaml" % (sr)])

def cmd_diff_emotes(args):
    subreddit = get_opt_arg(args, "Usage: diffemotes <subreddit>")
    if subreddit:
        subprocess.Popen(["kompare", "emotes/%s.yaml" % (subreddit), "emote-updates/%s.yaml" % (subreddit)])

def cmd_resolve_emotes(args):
    subreddit = get_opt_arg(args, "Usage: resolveemotes <subreddit>")
    if subreddit:
        shutil.move("emote-updates/%s.yaml" % (subreddit), "emotes/%s.yaml" % (subreddit))

Commands = {
    "help": cmd_help,
    "quit": cmd_quit,
    "list": cmd_list,
    "diffcss": cmd_diff_css, "dc": cmd_diff_css,
    "edit": cmd_edit,
    "resolvecss": cmd_resolve_css, "rc": cmd_resolve_css,
    "update": cmd_update,
    "extract": cmd_extract,
    "extractall": cmd_extract_all,
    "diffemotes": cmd_diff_emotes, "de": cmd_diff_emotes,
    "resolveemotes": cmd_resolve_emotes, "re": cmd_resolve_emotes,
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
