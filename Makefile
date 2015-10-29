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
# $ git ci -m "Bump version to x.y"
# $ git push github master
# - Test
# - Make thread

VERSION = 66.232

CONTENT_SCRIPT := \
    addon/header.js addon/utils.js addon/browser.js \
    addon/store.js addon/search.js addon/inject.js \
    addon/searchbox.js addon/frames.js addon/alttext.js \
    addon/post.js addon/reddit.js addon/global.js addon/main.js

EMOTE_DATA = emotes/*.json tags/*.json data/rules.yaml data/tags.yaml

ADDON_DATA = \
    build/gif-animotes.css build/bpm-resources.js build/emote-classes.css build/betterponymotes.js \
    addon/content/bpmotes.css addon/content/combiners-nsfw.css addon/content/extracss-pure.css addon/content/extracss-webkit.css \
    addon/content/bootstrap.css addon/content/options.html addon/content/options.css addon/content/options.js \
    addon/common/pref-setup.js

default: build/betterponymotes.xpi build/chrome.zip build/BPM.safariextension build/export.json.bz2

clean:
	rm -fr build

www: web/* build/betterponymotes-*.mozsucks-*.xpi build/betterponymotes.update.rdf
	cp web/firefox-logo.png www
	cp web/chrome-logo.png www
	cp web/safari-logo.png www
	cp web/relay-logo.png www
	cp web/ponymotes-logo.png www
	sed "s/\/\*{{version}}\*\//$(VERSION)/" < web/index.html > www/index.html

	rm -f www/*.xpi
	cp build/betterponymotes-*.mozsucks-*.xpi www/betterponymotes.xpi
	cp build/betterponymotes-*.mozsucks-*.xpi www/betterponymotes_$(VERSION).xpi

sync:
	rsync -e "ssh -p 40719" -zvLr --delete animotes/ lyra@ponymotes.net:/var/www/ponymotes.net/animotes
	rsync -e "ssh -p 40719" -zvLr --delete www/ lyra@ponymotes.net:/var/www/ponymotes.net/bpm

build/betterponymotes.js: $(CONTENT_SCRIPT)
	mkdir -p build
	cat $(CONTENT_SCRIPT) > build/betterponymotes.js

build/gif-animotes.css: $(EMOTE_DATA)
	mkdir -p build
	./dlanimotes.py

build/bpm-resources.js build/emote-classes.css: $(EMOTE_DATA) bpgen.py
	mkdir -p build
	./bpgen.py

build/export.json.bz2: build/export.json
	bzip2 < build/export.json > build/export.json.bz2

build/export.json: $(EMOTE_DATA)
	./bpexport.py --json build/export.json

build/betterponymotes.xpi: $(ADDON_DATA) addon/firefox/main.js
	mkdir -p build/firefox/lib build/firefox/data

	sed "s/\/\*{{version}}\*\//$(VERSION)/" < addon/firefox/package.json > build/firefox/package.json

	cp addon/firefox/main.js build/firefox/lib

	cp build/betterponymotes.js build/firefox/data
	cp build/bpm-resources.js build/firefox/lib
	cp build/emote-classes.css build/firefox/data

	cp addon/content/bootstrap.css build/firefox/data
	cp addon/content/bpmotes.css build/firefox/data
	cp addon/content/combiners-nsfw.css build/firefox/data
	cp addon/content/extracss-pure.css build/firefox/data
	cp addon/content/options.css build/firefox/data
	cp addon/content/options.html build/firefox/data
	cp addon/content/options.js build/firefox/data
	cp addon/common/pref-setup.js build/firefox/lib

	cfx xpi --update-url=https://ponymotes.net/bpm/betterponymotes.update.rdf --pkgdir=build/firefox --force-mobile
	./mungexpi.py betterponymotes.xpi build/betterponymotes.xpi
	rm betterponymotes.xpi

build/betterponymotes.update.rdf: build/betterponymotes-*.mozsucks-*.xpi
	uhura -k betterponymotes.pem build/betterponymotes-*.mozsucks-*.xpi https://ponymotes.net/bpm/betterponymotes_$(VERSION).xpi > build/betterponymotes.update.rdf

build/chrome.zip: $(ADDON_DATA) addon/chrome/background.html addon/chrome/background.js
	mkdir -p build/chrome

	sed "s/\/\*{{version}}\*\//$(VERSION)/" < addon/chrome/manifest.json > build/chrome/manifest.json

	cp addon/chrome/background.html build/chrome
	cp addon/chrome/background.js build/chrome

	cp build/betterponymotes.js build/chrome
	cp build/bpm-resources.js build/chrome
	cp build/emote-classes.css build/chrome
	cp build/gif-animotes.css build/chrome

	cp addon/content/bootstrap.css build/chrome
	cp addon/content/bpmotes.css build/chrome
	cp addon/content/combiners-nsfw.css build/chrome
	cp addon/content/extracss-pure.css build/chrome
	cp addon/content/extracss-webkit.css build/chrome
	cp addon/content/options.css build/chrome
	cp addon/content/options.html build/chrome
	cp addon/content/options.js build/chrome
	cp addon/common/pref-setup.js build/chrome

	cp betterponymotes.pem build/chrome/key.pem
	cd build/chrome && zip -0 ../chrome.zip *

build/BPM.safariextension: $(ADDON_DATA) addon/safari/Settings.plist addon/safari/background.html addon/safari/background.js
	mkdir -p build/BPM.safariextension

	sed "s/\/\*{{version}}\*\//$(VERSION)/" < addon/safari/Info.plist > build/BPM.safariextension/Info.plist

	cp addon/safari/Icon-128.png build/BPM.safariextension
	cp addon/safari/Icon-64.png build/BPM.safariextension
	cp addon/safari/background.html build/BPM.safariextension
	cp addon/safari/background.js build/BPM.safariextension
	cp addon/safari/Settings.plist build/BPM.safariextension

	cp build/betterponymotes.js build/BPM.safariextension
	cp build/bpm-resources.js build/BPM.safariextension
	cp build/emote-classes.css build/BPM.safariextension
	cp build/gif-animotes.css build/BPM.safariextension

	cp addon/content/bootstrap.css build/BPM.safariextension
	cp addon/content/bpmotes.css build/BPM.safariextension
	cp addon/content/combiners-nsfw.css build/BPM.safariextension
	cp addon/content/extracss-pure.css build/BPM.safariextension
	cp addon/content/extracss-webkit.css build/BPM.safariextension
	cp addon/content/options.css build/BPM.safariextension
	cp addon/content/options.html build/BPM.safariextension
	cp addon/content/options.js build/BPM.safariextension
	cp addon/common/pref-setup.js build/BPM.safariextension

	cd build/BPM.safariextension && zip ../BPM.safariextension.zip *
