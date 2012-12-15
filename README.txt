================
SUMMARY OF ADDON
================

BetterPonymotes is an emote addon to serve the pony subreddits. It supports
three browsers natively, and has a userscript variant for Safari and potentially
others.

Its data is maintained as a set of files by the addon maintainer, and compiled
into compact representations for use by the addon at build time in the form of
a large, executable JS file. Its code is split between maintainance tools on
the backend (mostly Python) and JS that runs in the browser.

=============
PREREQUISITES
=============

First off, there are some files and directories that aren't in the git repo but
need to exist.

    animotes/
    build/
    betterponymotes.pem
    chrome/key.pem (same file)

The PEM file is a private, unencrypted RSA key. It looks like this:

    -----BEGIN PRIVATE KEY-----
    [lots of base64 stuff]
    -----END PRIVATE KEY-----

In the repo it's a symlink to ../secret/betterponymotes.pem. It doesn't have to
be, but whatever you do, **NEVER** expose it and **NEVER** lose it. Update
security depends on it.

You'll need some tools:

    The Firefox Addon SDK. It comes in a zip file with a bin/activate shell
    script. Source it to add its bin/ to your $PATH, because you need the cfx
    tool.

    uhura. It's a little perl script used to sign the Firefox XPI's. It needs
    to be on $PATH. I'm not sure exactly where I got it, and installing it is
    a pain, since it depends on some CPAN modules. I forget which.

    apng2gif

====================
REPOSITORY STRUCTURE
====================

    # Animote support
    animotes/               Converted GIF cache (not kept in repo due to size)
    dlanimotes.py           Script to maintain animotes/ and build/gif-animotes.css

    # Scripts and code
    bin/                    Support scripts and tools
        encodeicon.py       Random little tool to encode a PNG file to a data: URI.
        gen_update_files.py Regenerates the Opera and Firefox update manifests.
                            Part of this is invoking Uhura to generate the
                            signature in the update file.
        inject_xpi_key.py   Part of signing the XPI. Pokes the public key part of
                            the PEM file into the XPI, which Firefox uses to
                            verify updates.
        make_userscript.py  Generates the userscript file, by editing the
                            @require headers at the top of the script. They
                            can't point to rainbow.mlas1.us directly because
                            Opera also uses them, and expects relative paths.
        rewrite-chaos.py    Some random script. I forget.
        shell.py            All-around emote update tool. Handles downloading
                            new stylesheets.
        sync.sh             Updates www/ from build/ and uploads it.
        version.py          Little tool to modify the version number in a couple
                            places where it's duplicated.
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
                            emotes/ + tags/ + data/ -> build/bpm-data.js

    # Build process
    build/                  Build directory (not in repo)
    Makefile                Pretty much the whole build process. Its main target
                            rebuilds all data files and addons.
    betterponymotes.pem     Used to sign the Firefox XPI.
    www/                    A complete copy of the site. Synced to rainbow.mlas1.us.
        betterponymotes.update.rdf
                            Firefox update manifest file.
        opera-updates.xml   Opera update manifest file.

        index.html          Main page.
        changelog.html      Changelog.
        *.xpi, *.oex        Hosted addon files.
        chrome-update.html  Useless page from when the Chrome addon relocated.
        chrome-updates.xml  Also useless.

    # Addon directories
    chrome/                 Chrome addon. This gets zipped up into the CRX file
        background.html     Background page. Holds prefs and things for the addon.
        background.js       Background code.
        manifest.json       Manifest file.
    firefox/                Firefox addon. Built into the XPI by cfx.
        lib/main.js         Backend script.
        package.json        Addon manifest.
    opera/                  Opera extension directory
        background.js       Backend script.
        config.xml          Addon manifest.
        index.html          Backend page.

    # Data files
    data/                   Misc data files you need to maintain.
        rules.yaml          Main controlling data file for the addon.
        tags.yaml           Tag rules.
        betterponymotes.js  Main script.
        pref-setup.js       All-around utility and framework for backend scripts.
                            Does a lot more than just preferences.
        bpmotes.css         Misc CSS used by the addon, and some things that can't
                            be put anywhere else.
        combiners-nsfw.css  NSFW components of r/mylittlecombiners that aren't emotes.
        extracss-moz.css        <
        extracss-o.css          < Chaos script. Most fancy emote flags are here.
        extracss-pure.css       < This CSS is not compatible between browsers
        extracss-pure-opera.css < and so comes in a few different forms.
        extracss-webkit.css     <
        icons.svg           Original SVG for the icons BPM has. Encoded into CSS manually.
        options.html        Options page.
        options.js          Options page code.
        options.css         Options page CSS.
        bootstrap.css       Bootstrap. Used on the options page.
        jquery-1.8.2.js     JQuery, for the options page.

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

=======================
BROWSER ADDON STRUCTURE
=======================

Most addon API's have the same basic structure- there's a background script that
runs on its own, and content scripts that run in the pages. The former must
obviously be written to the specific browser, but the latter is largely
independent except where it has to communicate with the backend.

Firefox's background script is firefox/lib/main.js. Chrome has
chrome/background.html and opera has opera/index.html. As these scripts share
a large amount of functionality, most of that is now held in data/pref-setup.js.

The backend is chiefly responsible for storing and managing preferences,
applying the necessary files to pages (JS and CSS), and maintaining the custom
CSS cache. Custom CSS is easily the most complex thing it does.

About 250 lines of betterponymotes.js is dedicated to abstracting over the
differences between browser API's and communication, under the bpm_browser
object.

UserScripts are significantly different as they are essentially a lone content
script. The options page and all associated data files (CSS and JS) must be
hosted externally.

===================
DEVELOPMENT PROCESS
===================

Most of the addon proper in the content script in data/betterponymotes.js. Most
new features can be implemented here without touching anything else.

Changing BPM_DEV_MODE at the top enables a bunch of extra logging, which may
help if you're getting crashes or strange behavior. Remember to disable it
before release.

Changes to preferences require editing data/pref-setup.py and the options page.

Changes involving the data backend are too complicated to go over here.

========================================
STYLESHEETS, EMOTE DATA, AND COMPILATION
========================================

Stylesheets are stored and cached in two forms- source and minified. The reason
is that Reddit, by default, serves up only the minified form, and while this is
enough to extract emote data, it's very difficult to read, which is very often
necessary when maintaining the emote cache. The source CSS, however, has no
image URLs. Since those can change freely, the only way to reliably know when
emotes change is to reparse the minified CSS.

The bin/shell.py tool is responsible for updating stylesheet files. Its chief
commands are:

    - update: redownloads all stylesheets
    - extract/extractall: runs the emote extraction tool on particular subreddits
    - diff: runs "git diff | kompare" for convenient visual browsing.
    - commit: runs "git commit -m [...]" with a standard message.

Emote data is stored in JSON form under emotes/, one line per emote. This makes
it quite conveniently diffable and greppable.

The bpgen.py tool (run by make automatically) reads the data/rules.yaml file
for instructions, loads all emote and tag data, and compiles it into a set of
JS data files (build/bpm-data.js) and CSS (build/emote-classes.css). These are
used by the addon directly.

==============
TAGGING EMOTES
==============

After updating the emote cache, any new or changed emotes need to be tagged
appropriately. The ./tagapp.py script starts a web server on localhost:5000,
running a webapp for this purpose. It's not too difficult to figure out how to
use, but tag data has a specific structure that should be respected.

[Small warning: the tagapp is one of the few Python scripts in the project that
runs under Python 2 (the rest is Python 3). It uses bplib/ code, however, and
there are some lingering unicode/json incompatibilities and bugs as a result.
In a nutshell, running the script seems to work fine on its own, but not from a
shell that has been "activated" with the Addon SDK. It seems to change the
Python environment.]

Generally, most tags fall under others in a loose, informal heirarchy. These can
be reviewed in data/tags.yaml.

Every emote must fall under at least one RootTag. ExclusiveTags can never be
used with any other tags (except as mentioned). HiddenTags are removed from
the data set before building the addon files. TagAliases generate additional
records in the data files, so that searching on those tags will work properly.
TagImplications essentially makes a given tag also apply several others- this
is how the hierarchy is built. Note that this is *not* recursive.

Every emote has exactly one primary name with all of its tags. Other names for
the same emote must be tagged as +v (for "variant"). bpgen.py will match them
up automatically, copy tags around, and the tag search code in the addon uses
this information to hide variants (in actuality, replacing them with their base
name).

The formatting (colors and fonts) psuedo-emotes are tagged +formatting. Emotes
that don't work right are tagged +broken, any emotes that should be removed from
the final product are tagged +remove. +nsfw is obvious and +q (short for
+questionable) is slightly less so.

Run ./checktags.py after editing tags to guard against typos and certain classes
of mistakes. Some warnings are known oddities that the script isn't capable of
recognizing; ignore those.

======================
APNG -> GIF CONVERSION
======================

Assuming all animotes are tagged with +animote, run ./dlanimotes.py to download
and convert all of them. This process requires apng2gif to be on $PATH, and it
will spit out GIFs to animotes/, which must be uploaded to the host site. It
also generates build/gif-animotes.css, which is the override sheet used by
Chrome. make doesn't currently call dlanimotes.py, despite depending on this
file to be present, so make sure to run it before building packages.

===========================
UPDATES AND VERSION NUMBERS
===========================

After updating the CSS and tags, run "bin/shell.py commit" to record it all,
and either run bpgen.py manually or "make" to regenerate the emote data files.
This process is heavily controlled by data/rules.yaml, which lists:

    - The subreddits currently in the addon (note that shell.py update doesn't
      actually respect this)
    - Subreddits to disregard PONYSCRIPT-IGNORE on (needed when they incorrectly
      put custom emotes in this block)
    - Custom tweaks to the emote set (as emotes/ is never modified directly)
    - Conflict resolution rules, by subreddit (e.g. r/aaaa > r/bbbb) and by
      individual emote.
    - Explicit matchups for +v emotes that the code can't autodetect.

The version number is encoded in many places, only some of which can be updated
automatically. Running:

    bin/version.py set -v xx.yy

Will update the package manifest files (firefox/package.json, chrome/manifest.json,
and opera/config.xml) and no others.

betterponymotes.js encodes the version in three places, in the header.

    // @require bpm-data.js?p=2&dver=82
    // @require pref-setup.js?p=2&cver=53

    // @version 53.82

    var BPM_CODE_VERSION = "53";
    var BPM_DATA_VERSION = "82";

Where CODE_VER is the major version, and DATA_VER is the minor, in the form the
project uses. The first two lines are used by Opera to reference its data files,
and all of them by userscript engines. The two @require lines are rewritten to
point at http://rainbow.mlas1.us/ at build time for the userscript variant,
which then uses the variables further down to link to the CSS files.

www/index.html also contains a copy of the current version number.

When everything is updated, running "make" is sufficient to rebuild all packages.

A note on Chrome: though the .zip to be uploaded to the webstore must contain
a copy of the private key.pem file, Chrome will not permit you to load the
extension directory in development mode. It also refuses to load it if it
contains symlinks. To get around this, build/chrome/ is updated with make to be
a copy of chrome/ sans links and key file. build/chrome.zip is what gets
uploaded. It's completely uncompressed due to prior difficulties with the
webstore.

===============
RELEASE PROCESS
===============

In a nutshell: $ make && bin/sync.sh

Rebuild all packages and upload the XPI, OEX, animotes, userscript files, etc.
to the site. The chrome.zip file must be uploaded to the Chrome webstore
manually.
