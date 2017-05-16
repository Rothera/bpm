# BetterPonymotes

BetterPonymotes is an emote addon to serve the pony subreddits. It currently
supports Chrome (including other browsers that support Chrome extensions, like
Opera, Chromium, and Vivaldi), Firefox, Firefox Mobile, and Safari.

Its data is maintained as a set of files by the addon maintainer, and compiled
into compact representations for use by the addon at build time in the form of
a large, executable JS file. Its code is split between maintenance tools on
the backend (mostly Python) and JS that runs in the browser.


## Prerequisites

First off, there are some files and directories that aren't in the git repo but
need to exist.

    animotes/
    betterponymotes.pem

The PEM file is a private, unencrypted RSA key. It looks like this:

    -----BEGIN PRIVATE KEY-----
    [lots of base64 stuff]
    -----END PRIVATE KEY-----

The Makefile expects it to be available in the root of the project directory,
but you can edit it if you like. The only thing that matters is that you
**NEVER** expose it and **NEVER** lose it. Update security depends on it.

BPM assumes a POSIX environment, with standard utilities like `cp`, `rm`,
`make`, `sed`, etc. available on your PATH. This means that developing on Windows
is not currently supported. (But feel free to try to get the build working on
Windows if you want.)

You'll also need the following tools:

- Python 3. Most of the scripts used for building and maintaining BPM are
  written in python. You'll need python installed and on your PATH with the name
  `python3` in order to build BPM. (Many Linux distributions already have this
  by default.)

- Python 2. The script BPM uses to tag emotes still requires Python 2, so you'll
  need Python 2 installed and on your PATH with the name `python2` in order to
  tag emotes in BPM. (Many Linux distributions already have this by default.)

- `zip`, a command line utility for creating zip-formatted archives. Needs to be
  on your PATH. If you don't already have it, it can probably be installed using
  your system's package manager. (E.g. `sudo apt-get install zip` on Ubuntu)

- The Firefox Addon SDK. It comes in a zip file with a `bin/activate` shell
  script. Source it to add its `bin/` to your `$PATH`, because you need the
  `cfx` tool.

- `uhura`. It's a little perl script used to sign the Firefox XPI's. It needs
  to be on $PATH. I'm not sure exactly where I got it, and installing it is
  a pain, since it depends on some CPAN modules. I forget which.

- `apng2gif`. A tool to convert APNG files to GIF format. Needs to be on your
  PATH in order to build BPM.


## Repository Structure

    # Animote support
    animotes/               Converted GIF cache (not kept in repo due to size)
    dlanimotes.py           Script to maintain animotes/ and build/gif-animotes.css

    # Scripts and code
    shell.py                All-around emote update tool. Handles downloading
                            new stylesheets.
    bplib/                  Python support library
        condense.py         CSS compressor
        css.py              CSS parsing
        extract.py          Emote extraction
        json.py             A JSON dumper with better output formatting
        objects.py          In-memory representation of all the emote data, as
                            well as code to load/save it all.
        resolve.py          "Emote resolution", that is, resolves conflicts and
                            does the majority of the work in dumping data.
    bpexport.py             Tool to exports all emote data to JSON. DinsFire64
                            uses this data to maintain his Reddit News emote pack.
    bpextract.py            Extracts emote data from minified CSS files.
                            minified-css/ -> emotes/
    bpgen.py                Builds the addon data files.
                            emotes/ + tags/ + data/ -> build/bpm-resources.js

    # Build process
    build/                  Build directory (not in repo)
    Makefile                Pretty much the whole build process. Its main target
                            rebuilds all data files and addons.
    web/                    Most actual site files.
        index.html          Main page.
    www/                    A complete copy of the site. Synced to ponymotes.net
        betterponymotes.update.rdf
                            Firefox update manifest file.
        *.xpi               Hosted addon files.

    # Addon directories
    addon/                  All common code and static data files (CSS).
        bpm-*.js            Main script.
        pref-setup.js       All-around utility and framework for backend scripts.
                            Does a lot more than just preferences.
        bpmotes.css         Misc CSS used by the addon, and some things that can't
                            be put anywhere else.
        combiners-nsfw.css  NSFW components of r/mylittlecombiners that aren't emotes.
        extracss-pure.css   Chaos script. Most fancy emote flags are here.
        extracss-webkit.css This CSS is specific to WebKit/Blink and not
                            compatible between browsers.
        options.html        Options page.
        options.js          Options page code.
        options.css         Options page CSS.
        bootstrap.css       Bootstrap. Used on the options page.
        cr-background.html  Chrome background page. Holds prefs and things for the addon.
        cr-background.js    Chrome background code.
        cr-manifest.json    Chrome addon manifest.
        fx-main.js          Firefox backend script.
        fx-package.json     Firefox addon manifest.

    # Data files
    data/                   Misc data files you need to maintain.
        rules.yaml          Main controlling data file for the addon.
        tags.yaml           Tag rules.
        icons.svg           Original SVG for the icons BPM has. Encoded into CSS manually.

    # Cached data
    emotes/                 Extracted emote cache. All of these can be regenerated.
    minified-css/           The minified CSS that Reddit serves up. These are what get parsed for emotes.
    source-css/             Unminified CSS, pulled from /about/stylesheet. Useful for reading.
                            Note that the script can't pull down files in NSFW
                            subreddits, so those are missing.

    # Tag maintainence
    tags/                   Tag data.
    tagapp.py               A small Flask-based webapp used to tag emotes.
    checktags.py            Verifies the tag data for most kinds of inconsistencies. Run this after editing, always.
    tagapp-static/          Static data for the emote tagging webapp.
        css/tagapp.css      CSS
        js/tagger.js        JavaScript for the UI
    templates/              Templates for the emote tagger.

All of this will be explained in detail further on.


## Browser Addon Structure

Most addon API's have the same basic structure- there's a background script that
runs on its own, and content scripts that run in the pages. The former must
obviously be written to the specific browser, but the latter is largely
independent except where it has to communicate with the backend.

Firefox's background script is `addon/fx-main.js`. Chrome has
`addon/cr-background.html`, and Safari has `addon/sf-background.html`. As these
scripts share a large amount of functionality, most of that is now held in
`addon/pref-setup.js`.

The backend is chiefly responsible for storing and managing preferences,
applying the necessary files to pages (JS and CSS), and maintaining the custom
CSS cache. Custom CSS is easily the most complex thing it does.

`bpm-browser.js` is dedicated to abstracting over the differences between
browser API's and communication.


## Development Process

Most of the addon proper in the content script split up between the
`addon/bpm-*.js` files. Most new features can be implemented here without
touching anything else.

Changing `DEV_MODE` in `bpm-header.js` enables a bunch of extra logging, which
may help if you're getting crashes or strange behavior. Remember to disable it
before release.

Changes to preferences require editing `addon/pref-setup.js` and the options
page.

Changes involving the data backend are too complicated to go over here.


## Stylesheets, Emote Data, and Compilation

Stylesheets are stored and cached in two forms - source and minified. The reason
is that Reddit, by default, serves up only the minified form, and while this is
enough to extract emote data, it's very difficult to read, which is very often
necessary when maintaining the emote cache. The source CSS, however, has no
image URLs. Since those can change freely, the only way to reliably know when
emotes change is to reparse the minified CSS.

The `shell.py` tool is responsible for updating stylesheet files. Its chief
commands are:

- `update`: redownloads all stylesheets
- `extract/extractall`: runs the emote extraction tool on particular subreddits
- `diff`: runs `git diff | kompare` for convenient visual browsing.
- `commit`: runs `git commit -m [...]` with a standard message.

Emote data is stored in JSON form under `emotes/`, one line per emote. This
makes it quite conveniently diffable and greppable.

The `bpgen.py` tool (run by `make` automatically) reads the `data/rules.yaml`
file for instructions, loads all emote and tag data, and compiles it into a set
of JS data files (`build/bpm-resources.js`) and CSS (`build/emote-classes.css`).
These are used by the addon directly.


## Tagging Emotes

After updating the emote cache, any new or changed emotes need to be tagged
appropriately. The `./tagapp.py` script starts a web server on `localhost:5000`,
running a webapp for this purpose. It's not too difficult to figure out how to
use, but tag data has a specific structure that should be respected.

[Small warning: the tagapp is one of the few Python scripts in the project that
runs under Python 2 (the rest is Python 3). It uses `bplib/` code, however, and
there are some lingering `unicode/json` incompatibilities and bugs as a result.
In a nutshell, running the script seems to work fine on its own, but not from a
shell that has been "activated" with the Addon SDK. It seems to change the
Python environment.]

Generally, most tags fall under others in a loose, informal hierarchy. These can
be reviewed in [`data/tags.yaml`](data/tags.html).

Every emote must fall under at least one `RootTag`. `ExclusiveTags` can never be
used with any other tags (except as mentioned). `HiddenTags` are removed from
the data set before building the addon files. `TagAliases` generate additional
records in the data files, so that searching on those tags will work properly.
`TagImplications` essentially makes a given tag also apply several others - this
is how the hierarchy is built. Note that this is *not* recursive.

Every emote has exactly one primary name with all of its tags. Other names for
the same emote must be tagged as `+v` (for "variant"). `bpgen.py` will match
them up automatically, copy tags around, and the tag search code in the addon
uses this information to hide variants (in actuality, replacing them with their
base name).

The formatting (colors and fonts) psuedo-emotes are tagged `+formatting`. Emotes
that don't work right are tagged `+broken`, any emotes that should be removed
from the final product are tagged `+remove`. `+nsfw` is obvious and `+q` (short
for `+questionable`) is slightly less so.

Run `./checktags.py` after editing tags to guard against typos and certain
classes of mistakes. Some warnings are known oddities that the script isn't
capable of recognizing; ignore those.


## APNG -> GIF Conversion

Assuming all animotes are tagged with +animote, run `./dlanimotes.py` to
download and convert all of them. This process requires `apng2gif` to be on
`$PATH`, and it will spit out GIFs to `animotes/`, which must be uploaded to the
host site. It also generates `build/gif-animotes.css`, which is the override
sheet used by Chrome.


## Updates and Version Numbers

After updating the CSS and tags, run `shell.py commit` to record it all, and
either run `bpgen.py` manually or `make` to regenerate the emote data files.
This process is heavily controlled by `data/rules.yaml`, which lists:

- The subreddits currently in the addon (note that `shell.py` update doesn't
  actually respect this)
- Subreddits to disregard `PONYSCRIPT-IGNORE` on (needed when they incorrectly
  put custom emotes in this block)
- Custom tweaks to the emote set (as `emotes/` is never modified directly)
- Conflict resolution rules, by subreddit (e.g. r/aaaa > r/bbbb) and by
  individual emote.
- Explicit matchups for +v emotes that the code can't autodetect.

The version number is at the top of the Makefile, and is used by `make` to
automatically update the version numbers every browser addon that BPM supports.

When everything is updated, running `make` is sufficient to rebuild all packages.


## Release Process

To release BPM:

1. Run `make` to rebuild all packages.
2. Upload `build/chrome.zip` to the Chrome webstore.
3. Upload `build/betterponymotes.xpi` to addons.mozilla.org for package signing.
   Download the output file to `build/`.
4. Run `make www` to rebuild the website.
5. Run `make sync` to synchronize with `ponymotes.net`, including the Firefox
   package.
6. Make update threads, message
   [/u/TwilightShadow1](https://www.reddit.com/u/TwilightShadow1),
   [/u/DinsFire64](https://www.reddit.com/u/DinsFire64),
   [/u/Chalcedon](https://www.reddit.com/user/Chalcedon/), 
   and other interested
   third parties.
