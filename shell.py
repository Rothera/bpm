#!/usr/bin/env python3
# -*- coding: utf8 -*-
################################################################################
##
## This file is part of BetterPonymotes.
## Copyright (c) 2012-2015 Typhos.
##
## This program is free software: you can redistribute it and/or modify it
## under the terms of the GNU Affero General Public License as published by
## the Free Software Foundation, either version 3 of the License, or (at your
## option) any later version.
##
## This program is distributed in the hope that it will be useful, but WITHOUT
## ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
## FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public License
## for more details.
##
## You should have received a copy of the GNU Affero General Public License
## along with this program.  If not, see <http://www.gnu.org/licenses/>.
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

def download_url(num, total, url):
    print("[%s/%s]: %s" % (num+1, total, url))
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Cookie": "over18=1"})
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
    minified_url = "https://old.reddit.com/r/%s/stylesheet.css?nocache=%s" % (subreddit, random.randrange(10000))
    source_url = "https://old.reddit.com/r/%s/about/stylesheet?nocache=%s" % (subreddit, random.randrange(10000))

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
        subprocess.call(["./bpextract.py", "minified-css/%s.css" % (sr), "emotes/%s.json" % (sr)])

def cmd_extractall(args):
    parser = argparse.ArgumentParser(description="Re-extract all emotes", prog="extractall")
    args = parser.parse_args(args)

    filenames = [fn for fn in sorted(os.listdir("minified-css")) if fn.endswith(".css")]
    filenames.sort()
    subreddits = [fn.split(".")[0] for fn in filenames]

    for (i, sr) in enumerate(subreddits):
        print("[%s/%s]: %s" % (i+1, len(subreddits), sr))
        sys.stdout.flush() # So the output doesn't get out of order
        # TODO: Don't hardcode relative paths...
        subprocess.call(["./bpextract.py", "minified-css/%s.css" % (sr), "emotes/%s.json" % (sr)])

def cmd_diff(args):
    parser = argparse.ArgumentParser(description="Run diff program on stylesheets, emotes, and tags", prog="diff")
    args = parser.parse_args(args)

    p1 = subprocess.Popen(["git", "diff", "-U1", "minified-css", "source-css", "emotes", "tags"], stdout=subprocess.PIPE)
    p2 = subprocess.Popen(["kompare", "-"], stdin=p1.stdout, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def cmd_commit(args):
    parser = argparse.ArgumentParser(description="Commit CSS and emote cache", prog="commit")
    args = parser.parse_args(args)

    subprocess.call(["git", "commit", "-v", "emotes", "source-css", "minified-css", "tags", "-m", time.strftime("Stylesheet/emote/tag updates %Y-%m-%d")])

Commands = {
    "update": cmd_update,
    "extract": cmd_extract,
    "extractall": cmd_extractall,
    "diff": cmd_diff,
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
