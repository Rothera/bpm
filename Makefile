################################################################################
##
## This file is part of BetterPonymotes.
## Copyright (c) 2015 Typhos.
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

# Release process:
# - Bump version
# $ make
# - Upload Chrome addon
# - Sign XPI
# $ make www
# $ make sync
# - chmod 644
# $ git ci -m "Bump version to x.y"
# $ git push github master
# - Test
# - Make thread

# Read version from package.json
VERSION = $(shell npm ls --depth=-1 | grep betterponymotes | cut -d' ' -f1 | cut -d'@' -f2)

CONTENT_SCRIPT := \
    addon/bpm-header.js addon/bpm-utils.js addon/bpm-browser.js \
    addon/bpm-store.js addon/bpm-search.js addon/bpm-inject.js \
    addon/bpm-searchbox.js addon/bpm-frames.js addon/bpm-alttext.js \
    addon/bpm-post.js addon/bpm-reddit.js addon/bpm-global.js addon/bpm-main.js

EMOTE_DATA = emotes/*.json tags/*.json data/rules.yaml data/tags.yaml

ADDON_DATA = \
    build/gif-animotes.css build/bpm-resources.js build/emote-classes.css build/betterponymotes.js \
    addon/bpmotes.css addon/combiners-nsfw.css addon/extracss-pure.css addon/extracss-webkit.css \
    addon/bootstrap.css addon/options.html addon/options.css addon/options.js \
    addon/pref-setup.js

.PHONY: default
default: build/betterponymotes.xpi build/chrome.zip build/BPM.safariextension.zip build/export.json.bz2

.PHONY: clean
clean:
	rm -fr build

.PHONY: www
www: web/* build/betterponymotes.xpi build/betterponymotes.update.rdf
	cp web/firefox-logo.png www
	cp web/chrome-logo.png www
	cp web/safari-logo.png www
	cp web/relay-logo.png www
	cp web/ponymotes-logo.png www
	sed "s/\/\*{{version}}\*\//$(VERSION)/" < web/index.html > www/index.html

	rm -f www/*.xpi
	cp build/betterponymotes.xpi www/betterponymotes.xpi
	cp build/betterponymotes.xpi www/betterponymotes_$(VERSION).xpi

.PHONY: sync
sync:
	rsync -e "ssh -p 40719" -zvLr --delete animotes/ lyra@ponymotes.net:/var/www/ponymotes.net/animotes
	rsync -e "ssh -p 40719" -zvLr --delete www/ lyra@ponymotes.net:/var/www/ponymotes.net/bpm

node_modules/jpm/bin/jpm: package.json
	npm install
	touch node_modules/jpm/bin/jpm

build/betterponymotes.js: $(CONTENT_SCRIPT)
	mkdir -p build
	cat $(CONTENT_SCRIPT) > build/betterponymotes.js

build/gif-animotes.css: $(EMOTE_DATA)
	mkdir -p build
	./dlanimotes.py

build/bpm-resources.js build/emote-classes.css: $(EMOTE_DATA)
	mkdir -p build
	./bpgen.py

build/export.json.bz2: build/export.json
	bzip2 < build/export.json > build/export.json.bz2

build/export.json: $(EMOTE_DATA)
	./bpexport.py --json build/export.json

GENERATED_XPI = build/firefox/jid1-tHrhDJXsKvsiCw@jetpack-$(VERSION).xpi
GENERATED_UPDATE_MANIFEST = build/firefox/jid1-tHrhDJXsKvsiCw@jetpack-$(VERSION).update.rdf
FIREFOX_UPDATE_FILES = $(GENERATED_XPI) $(GENERATED_UPDATE_MANIFEST)

FIREFOX_ADDON_FILES = addon/fx-main.js addon/fx-package.json addon/fx-jpmignore

$(FIREFOX_UPDATE_FILES): $(ADDON_DATA) $(FIREFOX_ADDON_FILES) node_modules/jpm/bin/jpm
	mkdir -p build/firefox/lib build/firefox/data

	sed "s/\/\*{{version}}\*\//$(VERSION)/" < addon/fx-package.json > build/firefox/package.json

	cp addon/fx-main.js build/firefox/lib/main.js
	cp addon/fx-jpmignore build/firefox/lib/.jpmignore

	cp build/betterponymotes.js build/firefox/data
	cp build/bpm-resources.js build/firefox/data
	cp build/bpm-resources.js build/firefox/lib
	cp build/emote-classes.css build/firefox/data

	cp addon/bootstrap.css build/firefox/data
	cp addon/bpmotes.css build/firefox/data
	cp addon/combiners-nsfw.css build/firefox/data
	cp addon/extracss-pure.css build/firefox/data
	cp addon/options.css build/firefox/data
	cp addon/options.html build/firefox/data
	cp addon/options.js build/firefox/data
	cp addon/pref-setup.js build/firefox/lib

	cd build/firefox && ../../node_modules/jpm/bin/jpm xpi

build/betterponymotes.xpi: $(GENERATED_XPI)
	venv/bin/python ./mungexpi.py $(GENERATED_XPI) build/betterponymotes.xpi

build/betterponymotes.update.rdf: $(GENERATED_UPDATE_MANIFEST)
	cp $(GENERATED_UPDATE_MANIFEST) build/betterponymotes.update.rdf

build/chrome.zip: $(ADDON_DATA) addon/cr-background.html addon/cr-background.js
	mkdir -p build/chrome

	sed "s/\/\*{{version}}\*\//$(VERSION)/" < addon/cr-manifest.json > build/chrome/manifest.json

	cp addon/cr-background.html build/chrome/background.html
	cp addon/cr-background.js build/chrome/background.js

	cp build/betterponymotes.js build/chrome
	cp build/bpm-resources.js build/chrome
	cp build/emote-classes.css build/chrome
	cp build/gif-animotes.css build/chrome

	cp addon/bootstrap.css build/chrome
	cp addon/bpmotes.css build/chrome
	cp addon/combiners-nsfw.css build/chrome
	cp addon/extracss-pure.css build/chrome
	cp addon/extracss-webkit.css build/chrome
	cp addon/options.css build/chrome
	cp addon/options.html build/chrome
	cp addon/options.js build/chrome
	cp addon/pref-setup.js build/chrome

	cp betterponymotes.pem build/chrome/key.pem
	# Uncompressed due to prior difficulties with the webstore
	cd build/chrome && zip -0 ../chrome.zip *

build/BPM.safariextension.zip: $(ADDON_DATA) addon/sf-Settings.plist addon/sf-background.html addon/sf-background.js
	mkdir -p build/BPM.safariextension

	sed "s/\/\*{{version}}\*\//$(VERSION)/" < addon/sf-Info.plist > build/BPM.safariextension/Info.plist

	cp addon/icons/sf-Icon-128.png build/BPM.safariextension/Icon-128.png
	cp addon/icons/sf-Icon-64.png build/BPM.safariextension/Icon-64.png
	cp addon/sf-background.html build/BPM.safariextension/background.html
	cp addon/sf-background.js build/BPM.safariextension/background.js
	cp addon/sf-Settings.plist build/BPM.safariextension/Settings.plist

	cp build/betterponymotes.js build/BPM.safariextension
	cp build/bpm-resources.js build/BPM.safariextension
	cp build/emote-classes.css build/BPM.safariextension
	cp build/gif-animotes.css build/BPM.safariextension

	cp addon/bootstrap.css build/BPM.safariextension
	cp addon/bpmotes.css build/BPM.safariextension
	cp addon/combiners-nsfw.css build/BPM.safariextension
	cp addon/extracss-pure.css build/BPM.safariextension
	cp addon/extracss-webkit.css build/BPM.safariextension
	cp addon/options.css build/BPM.safariextension
	cp addon/options.html build/BPM.safariextension
	cp addon/options.js build/BPM.safariextension
	cp addon/pref-setup.js build/BPM.safariextension

	cd build/BPM.safariextension && zip ../BPM.safariextension.zip *
