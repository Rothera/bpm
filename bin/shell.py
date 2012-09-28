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

import lxml.html

UA = "BetterPonymotes stylesheet update checker (1req/2.5secs; pm Typhos)"

def cmd_help(args):
    parser = argparse.ArgumentParser(description="Print help text", prog="help")
    args = parser.parse_args(args)

    print(" ".join(sorted(Commands)))

def cmd_list(args):
    parser = argparse.ArgumentParser(description="List updated files", prog="list")
    args = parser.parse_args(args)

    print("Stylesheet updates:")
    subprocess.call(["git", "status", "-s", "minified-css", "source-css"])
    print("Emote updates:")
    subprocess.call(["git", "status", "-s", "emotes"])

def download_url(num, total, url):
    print("[%s/%s]: %s" % (num+1, total, url))
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req) as stream:
            data = stream.read()
        data = data.decode("utf8")
    except urllib.error.HTTPError as error:
        print("ERROR: Could not download:", error)
        return None
    except UnicodeDecodeError as error:
        print("ERROR: Data is not valid UTF8:", error)
        return None

    return data

def update_css(num, total, subreddit):
    # .css tricks Reddit's over18 code into permitting download on such
    # subreddits (it's not html), but there's nothing we can do about private
    # subreddits- and there's also nothing we can do to get around over18
    # restrictions on /about/stylesheet.
    minified_url = "http://reddit.com/r/%s/stylesheet.css" % (subreddit)
    source_url = "http://reddit.com/r/%s/about/stylesheet" % (subreddit)

    try:
        old_minified_css = open("minified-css/%s.css" % (subreddit), "r").read()
    except IOError:
        # Assume file doesn't exist; new subreddit
        print("NOTICE: minified-css/%s.css does not exist; new subreddit?" % (subreddit))
        old_minified_css = ""

    new_minified_css = download_url(num, total, minified_url)
    if new_minified_css is None:
        # Error- probably a private subreddit, or it doesn't exist
        return None

    if old_minified_css == new_minified_css:
        # No changes. Don't bother fetching the source
        return None

    print("NOTICE: Stylesheet changed in r/%s" % (subreddit))
    with open("minified-css/%s.css" % (subreddit), "w") as file:
        file.write(new_minified_css)

    time.sleep(2.5) # Respect rate limiting
    html = download_url(num, total, source_url)
    if html is None:
        # Error here probably means a private subreddit
        return subreddit

    root = lxml.html.fromstring(html)
    code_elements = root.find_class("language-css")
    if len(code_elements) != 1:
        # Probably an over18 subreddit
        print("ERROR: CSS source page has an invalid number of .language-css elements")
        return subreddit

    source = code_elements[0].text_content()

    with open("source-css/%s.css" % (subreddit), "w") as file:
        file.write(source)

    return subreddit

def cmd_update(args):
    parser = argparse.ArgumentParser(description="Update stylesheet cache", prog="update")
    parser.add_argument("-s", "--start", help="Subreddit to start from")
    parser.add_argument("subreddits", nargs="*")
    args = parser.parse_args(args)

    if not args.subreddits:
        filenames = [fn for fn in sorted(os.listdir("minified-css")) if fn.endswith(".css")]
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
    # be nice, but we'd have to ask git what files were modified somehow.

    for (i, sr) in enumerate(args.subreddits):
        print("[%s/%s]: %s" % (i+1, len(args.subreddits), sr))
        # TODO: Don't hardcode relative paths...
        subprocess.call(["./bpextract.py", "minified-css/%s.css" % (sr), "emotes/%s.yaml" % (sr)])

def cmd_extractall(args):
    parser = argparse.ArgumentParser(description="Re-extract all emotes", prog="extractall")
    args = parser.parse_args(args)

    filenames = [fn for fn in sorted(os.listdir("minified-css")) if fn.endswith(".css")]
    filenames.sort()
    subreddits = [fn.split(".")[0] for fn in filenames]

    for (i, sr) in enumerate(subreddits):
        print("[%s/%s]: %s" % (i+1, len(subreddits), sr))
        # TODO: Don't hardcode relative paths...
        subprocess.call(["./bpextract.py", "minified-css/%s.css" % (sr), "emotes/%s.yaml" % (sr)])

def cmd_diffcss(args):
    parser = argparse.ArgumentParser(description="Run diff program on CSS cache", prog="diffcss")
    args = parser.parse_args(args)

    p1 = subprocess.Popen(["git", "diff", "-U10", "minified-css", "source-css"], stdout=subprocess.PIPE)
    p2 = subprocess.Popen(["kompare", "-"], stdin=p1.stdout)

def cmd_diffemotes(args):
    parser = argparse.ArgumentParser(description="Run diff program on emotes", prog="diffemotes")
    args = parser.parse_args(args)

    p1 = subprocess.Popen(["git", "diff", "-U10", "emotes"], stdout=subprocess.PIPE)
    p2 = subprocess.Popen(["kompare", "-"], stdin=p1.stdout)

def cmd_commit(args):
    parser = argparse.ArgumentParser(description="Commit CSS and emote cache", prog="commit")
    args = parser.parse_args(args)

    subprocess.call(["git", "commit", "emotes", "source-css", "minified-css", "-m", time.strftime("Stylesheet/emote updates %Y-%m-%d")])

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
