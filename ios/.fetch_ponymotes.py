#!/usr/bin/env python3

import sqlite3
import os
import logging
import argparse
import sys
import configparser

import coloredlogs
import requests

__version__ = "1.0.2"

# Should auto set itself up on first run.

l = logging.getLogger(__name__)
coloredlogs.install(show_hostname=False)

# Some silly globals
remote_host = "http://dinsfire.com"
db_file = "emote_db.db"
last_modify_prefix = ".lastmodify_"
config_dir_path = os.path.expanduser("~/.ios_ponymotes")
config_file = "config.ini"
session = requests.Session()
user_agent = "jibodeah.desktop_ponymotes"
# Also config, which is created by main.

_debug_levels = {
    "critical" : logging.CRITICAL,
    "error" : logging.ERROR,
    "warning" : logging.WARNING,
    "info" : logging.INFO,
    "debug" : logging.DEBUG,
}

_CONFIG_SECTION_BASIC = "Basic Config"
_CONFIG_SECTION_FILTERS = "Basic Filters"
_CONFIG_SECTION_EMOTES = "Emote Blacklist"
_CONFIG_SECTION_TAGS = "Tag Blacklist"
_CONFIG_SECTION_SUBREDDITS = "Subreddit Blacklist"

_config_file_default = r"""# BPM Updater config
# If you delete this it'll be regenerated with default values.

[{}]
# Directory to save to.
# '~' be used as a shortcut to your home directory on posix systems
# ...and tends to point to C:\users\yourusername on Windows.
# Must point to an existing directory.
# Recommended: Use the default, and link to it wherever you want.
emote_dir = ~/.ios_ponymotes/emotes/
# Values to change blacklists into whitelists, if you want to be really
# exclusive for whatever reason.
emote_blacklist_is_whitelist = false
tag_blacklist_is_whitelist = false
subreddit_blacklist_is_whitelist = false

[{}]
# Basic emote filters.
# Also contains shortcuts for filtering of the most likely tags.
allow_nsfw = false
# Blacklists the 'questionable' tag
allow_questionable = true
# Blacklists the 'nonpony' tag
allow_nonpony = true

[{}]
# Case sensitive names of emotes to blacklist, one per line
# Note that you'll want to blacklist all name variants aswell!
# A leading + or - is permitted, but unnecessary.
# Examples: (But without the preceeding # and space)
# somedumbemote
# twisquint

[{}]
# Case insensitive names of tags to blacklist.
# Same format as the Emote Blacklist.
# 'Cept variant tags are not needed.

[{}]
# Case insensitive names of subreddits for blacklist.
# A leading /r/ is permitted, but unnecessary.
# Example: (If you hate bananas)
# mylittlenanners
# (Although in that case you'd be better off blacklisting the 'banana' tag)
""".format(_CONFIG_SECTION_BASIC, _CONFIG_SECTION_FILTERS, _CONFIG_SECTION_EMOTES,
           _CONFIG_SECTION_TAGS, _CONFIG_SECTION_SUBREDDITS)

def first_run_setup():
    os.mkdir(config_dir_path)
    os.chdir(config_dir_path)
    os.mkdir("emotes") # This serves only as the default emote save location
    os.mkdir("emotes/archive") # Deleted emotes are moved here
    with open("emotes/archive/readme.txt", "w") as f:
        f.write("Emotes removed from BPM go here.\n")
    make_default_config()

def make_default_config():
    with open(config_file, "w") as f:
        f.write(_config_file_default)

def get_remote_file(path, local_filename, force=False, save_last_modified=True):
    """Fetches a remote file from dinsfire.com

    path: Path to remote file, relative to dinsfire.com.
        Ex.: for dinsfire.com/emoteCache/emote.png, pass /emoteCache/emote.png
    local_filename: The local filename to save to.
    force: Do not skip download if file not modified. (Default: False)
    save_last_modified: Save a file containing the date the remote file
        was last modified. To use when fetching the same file again.
        (Default: True)
    """
    h = {"user-agent" : user_agent + "/{}".format(__version__)}
    timestamp_filename = ''.join([os.path.dirname(local_filename), last_modify_prefix,
                                  os.path.basename(local_filename)])
    if os.path.isfile(timestamp_filename) and not force:
        with open(timestamp_filename, "r") as f:
            h["If-Modified-Since"] = f.read().strip()
    l.debug("Downloading remote: {}".format(path))
    r = session.get("{}{}".format(remote_host, path), headers=h, stream=True)
    if r.status_code == 304:
        return r.status_code
    elif r.status_code == 404:
        l.warning("Got 404 for {}!".format(path))
        return r.status_code
    elif not r.ok:
        l.error("Error fetching remote: {}".format(path))
        r.raise_for_status()
        raise RuntimeError("Response not ok!") # Should never get here.
    with open(local_filename, "wb") as f:
        for chunk in r.iter_content(1024):
            f.write(chunk)
    if "Last-Modified" in r.headers.keys() and save_last_modified:
        with open(timestamp_filename, "w") as f:
            f.write(r.headers['Last-Modified'] + "\n") # Gotta have that newline at end of file.
    return r.status_code

def update_database(force=False):
    l.info("Forcing database update!" if force else "Updating database...")
    if os.path.isfile(db_file):
        old_db_exists = True
        l.debug("Database already exists, renaming to .old")
        os.rename(db_file, db_file + '.old')
    try:
        i = get_remote_file("/emoteCache/mobileDatabase.db", db_file, force)
    except Exception as e:
        if old_db_exists:
            os.rename(db_file + '.old', db_file)
        raise e
    if i == 304:
        l.info("Database already up to date!")
        if old_db_exists:
            os.rename(db_file + '.old', db_file)
        return False
    elif i == 200:
        l.info("Database updated!")
        return True

def get_emotes(db, old_db=None, skip_already_downloaded=False):
    """Return a list of emote names that pass the filter.

    db: A sqlite3.connection to the emote database.
    old_db: A sqlite3.connection to the old version of the database.
        When supplied, the function will return only updated emotes.
        (Default: None)
    skip_already_downloaded: If true, emotes that have already been downloaded
        will not be returned.
        NOTE: This means that updated emotes will not get updated locally
    """
    q = "SELECT emoteName, dateModified FROM mobileEmotes" # Base query
    w = [] # WHERE causes, with params replaced with `?`
    p = [] # list corresponding to param variables (Cast to tuple later)

    if not config[_CONFIG_SECTION_FILTERS].getboolean('allow_nsfw'):
        w.append("isNSFW = ?")
        p.append(0)
    if not config[_CONFIG_SECTION_FILTERS].getboolean('allow_nonpony'):
        w.append("tags NOT LIKE ?")
        p.append("%nonpony %")
    if not config[_CONFIG_SECTION_FILTERS].getboolean('allow_questionable'):
        w.append("tags NOT LIKE ?")
        p.append("%questionable %")
    for key in config[_CONFIG_SECTION_EMOTES]:
        w.append("emoteName {} ?".format("=" if config[_CONFIG_SECTION_BASIC].getboolean(
            "emote_blacklist_is_whitelist") else "!="))
        p.append(key)
    for key in config[_CONFIG_SECTION_TAGS]:
        w.append("tags{} LIKE ?".format("" if config[_CONFIG_SECTION_BASIC].getboolean(
            "tag_blacklist_is_whitelist") else " NOT"))
        if key.startswith("+") or key.startswith("-"):
            key = key[1:]
        p.append("%{} %".format(key.lower()))
    for key in config[_CONFIG_SECTION_SUBREDDITS]:
        w.append("source {} ?".format("=" if config[_CONFIG_SECTION_BASIC].getboolean(
            "subreddit_blacklist_is_whitelist") else "!="))
        key = key.lower()
        if key.startswith("/r/"):
            key = key[3:]
        elif key.startswith("r/"):
            key = key[2:]
        p.append(key)
    if w: # Not empty
        q += " WHERE {}".format(' AND '.join(w))
    q += " ORDER BY emoteName"
    l.debug("SQL Query: {}".format(q))
    l.debug("SQL Params: {}".format(p))
    c = db.cursor()
    c.execute(q, tuple(p))
    ret = c.fetchall()
    if skip_already_downloaded:
        for e in ret[:]:
            if os.path.isfile(''.join([config[_CONFIG_SECTION_BASIC]['emote_dir'], e[0], '.png'])):
                ret.remove(e)
    if old_db is not None:
        old_c = old_db.cursor()
        # Remove non-updated emotes.
        for e in ret[:]:
            old_c.execute("SELECT dateModified FROM mobileEmotes WHERE emoteName = ?", (e[0], ))
            old_e = old_c.fetchone()
            if old_e is not None and e[1] <= old_e[0]:
                ret.remove(e)
    return ret

def get_removed_emotes(emotes):
    ret = []
    for f in os.listdir(config[_CONFIG_SECTION_BASIC]['emote_dir']):
        if not f.endswith(".png"):
            l.debug("get_removed_emotes: '{}' not an image!".format(f))
            continue
        f = f[:-4] # strip the .png
        if f not in emotes:
            ret.append(f)
    return ret

if __name__ == "__main__":
    argument_parser = argparse.ArgumentParser()
    argument_parser.add_argument("--log-level", help="Logging level to use.",
                                choices=_debug_levels.keys(), default='info')
    argument_parser.add_argument("--force", "-f", help="Force fresh download of all emotes.",
                                 action="store_true")
    argument_parser.add_argument("--skip-already-downloaded",
                                 help="Skip emotes that already exist on disk.\
                                 (This is useful if you accidentally deleted an emote or two)",
                                 action="store_true")
    args = argument_parser.parse_args()

    coloredlogs.set_level(_debug_levels[args.log_level])
    l.info("Desktop PonyMotes {} running!".format(__version__))
    if not os.path.isdir(config_dir_path):
        l.warning("Config directory missing, performing first time setup...")
        first_run_setup()
        print("Just performed some first time setup!")
        print("Look in {} and edit the config to your heart's desire...".format(
            os.path.abspath(config_dir_path)))
        print("Then run this again!")
        sys.exit(0)
    os.chdir(config_dir_path)
    global config
    config = configparser.ConfigParser(allow_no_value=True, empty_lines_in_values=False)
    if not config.read(config_file): # Returns [] on failure
        l.warning("Config file not found! Remaking from default...")
        make_default_config()
        if not config.read(config_file):
            l.critical("Error remaking and reading config file!")
            raise RuntimeError("Could not load nor remake and read config.")
    try:
        config.items(_CONFIG_SECTION_BASIC)
        config.items(_CONFIG_SECTION_FILTERS)
        config.items(_CONFIG_SECTION_EMOTES)
        config.items(_CONFIG_SECTION_TAGS)
        config.items(_CONFIG_SECTION_SUBREDDITS)
    except configparser.Error as e:
        l.critical("Config file appears to be corrupt!")
        l.exception("Information:")
        l.critical("You could delete it to refresh it to defaults.")
        sys.exit(-1)
    # Config sanity checking:
    if not os.path.isdir(os.path.expanduser(config[_CONFIG_SECTION_BASIC]['emote_dir'])):
        l.critical("Error parsing config: {} is not a directory!".format(
            config[_CONFIG_SECTION_BASIC]['emote_dir']))
        sys.exit(-1)
    emote_dir = config[_CONFIG_SECTION_BASIC]['emote_dir']
    if not emote_dir.endswith("/") and not emote_dir.endswith("\\"):
        config[_CONFIG_SECTION_BASIC]['emote_dir'] += "/"
    config[_CONFIG_SECTION_BASIC]['emote_dir'] = os.path.expanduser(
        config[_CONFIG_SECTION_BASIC]['emote_dir'])
    # Check archive directory exists.
    if not os.path.isdir(config[_CONFIG_SECTION_BASIC]['emote_dir'] + 'archive/'):
        l.warning("archive directory does not exist, creating...")
        os.mkdir(config[_CONFIG_SECTION_BASIC]['emote_dir'] + 'archive/')
    if update_database(force=args.force):
        db = sqlite3.connect(db_file)
        old_db = sqlite3.connect(db_file + '.old') if os.path.isfile(db_file + '.old') else None
    else:
        l.info("No updates available.")
        sys.exit(0)
    try:
        emotes = get_emotes(sqlite3.connect(db_file),
                            old_db=None if args.force else old_db,
                            skip_already_downloaded=args.skip_already_downloaded)
        l.info("Found {} new/updated emotes!".format(len(emotes)))
        for i, e in enumerate(emotes):
            total_emotes = len(emotes)
            l.info("Downloading {}.png ({}/{})".format(e[0], i + 1, total_emotes))
            get_remote_file("/emoteCache/{}.png".format(e[0]),
                            ''.join([config[_CONFIG_SECTION_BASIC]['emote_dir'] , e[0], '.png']),
                            save_last_modified=False)
    finally:
        if os.path.isfile(db_file + '.old'):
            os.remove(db_file + '.old')
    removed = get_removed_emotes(list(e[0] for e in get_emotes(db)))
    if removed: # Not empty
        for e in removed:
            os.rename("{}{}.png".format(config[_CONFIG_SECTION_BASIC]['emote_dir'], e),
                  "{}archive/{}.png".format(config[_CONFIG_SECTION_BASIC]['emote_dir'], e))
        l.info("{} {} moved to archive.".format(len(removed),
            'emote' if len(removed) == 1 else 'emotes'))
    l.info("All done!")
