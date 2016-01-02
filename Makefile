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

VERSION = 66.236

DISCORD_VERSION = v0.4.0-alpha

#Set via environment variable
#DC_BPM_ARCHIVE_PASSWORD= 

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

DISCORD_ADDITONAL_DATA := \
	addon/discord/background.js addon/discord/settings.js addon/discord/settings.css \
	addon/discord/emote-settings.html addon/discord/general-settings.html addon/discord/search-settings.html \
	addon/discord/settings-wrapper.html addon/discord/subreddit-settings.html addon/discord/about.html \
	addon/discord/updates.html

DISCORD_SETTINGS_SCRIPT := \
	addon/discord/utils.js addon/discord/emote-settings.js addon/discord/general-settings.js \
	addon/discord/subreddit-settings.js addon/discord/updates.js addon/discord/settings.js

DISCORD_INSTALLER := \
    discord/installer/constants.js discord/installer/index.js discord/installer/package.json \
    discord/installer/install_mac.sh discord/installer/install_windows.bat

DISCORD_INTEGRATION := \
	discord/integration/package.json discord/integration/bpm.js discord/integration/bpm-settings.js

GENERATED_CSS := \
    build/gif-animotes.css build/emote-classes.css addon/bpmotes.css addon/combiners-nsfw.css \
    addon/bootstrap.css addon/options.css

default: build/betterponymotes.xpi build/chrome.zip build/BPM.safariextension build/export.json.bz2 build/discord

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

build/bpm-resources.js build/emote-classes.css: $(EMOTE_DATA)
	mkdir -p build
	./bpgen.py

build/export.json.bz2: build/export.json
	bzip2 < build/export.json > build/export.json.bz2

build/export.json: $(EMOTE_DATA)
	./bpexport.py --json build/export.json

build/betterponymotes.xpi: $(ADDON_DATA) addon/fx-main.js
	mkdir -p build/firefox/lib build/firefox/data

	sed "s/\/\*{{version}}\*\//$(VERSION)/" < addon/fx-package.json > build/firefox/package.json

	cp addon/fx-main.js build/firefox/lib/main.js

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

	cfx xpi --update-url=https://ponymotes.net/bpm/betterponymotes.update.rdf --pkgdir=build/firefox --force-mobile
	./mungexpi.py betterponymotes.xpi build/betterponymotes.xpi
	rm betterponymotes.xpi

build/betterponymotes.update.rdf: build/betterponymotes-*.mozsucks-*.xpi
	uhura -k betterponymotes.pem build/betterponymotes-*.mozsucks-*.xpi https://ponymotes.net/bpm/betterponymotes_$(VERSION).xpi > build/betterponymotes.update.rdf

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

build/BPM.safariextension: $(ADDON_DATA) addon/sf-Settings.plist addon/sf-background.html addon/sf-background.js
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

# Note, requires node, globally installed asar (npm install asar -g)
build/discord/installer: $(DISCORD_INSTALLER)
	mkdir -p build/discord
		
	cp discord/installer/index.js build/discord/index.js
	cp discord/installer/package.json build/discord/package.json
	cp discord/installer/constants.js build/discord/constants.js
	
	cd build/discord && npm install

build/discord/integration.asar: $(DISCORD_INTEGRATION)
	mkdir -p build/discord
	asar pack discord/integration/ build/discord/integration.asar

build/discord/bpm.asar: $(ADDON_DATA) $(DISCORD_ADDITONAL_DATA) $(DISCORD_SETTINGS_SCRIPT)
	mkdir -p build/discord
	mkdir -p build/discord/addon
	
	cat $(DISCORD_SETTINGS_SCRIPT) > build/discord/addon/settings.js
	cp addon/discord/background.js build/discord/addon/background.js
	cp addon/discord/settings-wrapper.html build/discord/addon/settings-wrapper.html
	cp addon/discord/general-settings.html build/discord/addon/general-settings.html
	cp addon/discord/emote-settings.html build/discord/addon/emote-settings.html
	cp addon/discord/subreddit-settings.html build/discord/addon/subreddit-settings.html
	cp addon/discord/search-settings.html build/discord/addon/search-settings.html
	cp addon/discord/about.html build/discord/addon/about.html
	cp addon/discord/updates.html build/discord/addon/updates.html
	
	cp addon/discord/settings.css build/discord/addon/settings.css
	
	sed -i "s/<\!-- REPLACE-WITH-DC-VERSION -->/$(DISCORD_VERSION)/g" build/discord/addon/about.html
	sed -i "s/<\!-- REPLACE-WITH-BPM-VERSION -->/$(VERSION)/g" build/discord/addon/about.html
	sed -i "s/\/\* REPLACE-WITH-DC-VERSION \*\//'$(DISCORD_VERSION)'/g" build/discord/addon/settings.js

	cp build/betterponymotes.js build/discord/addon
	cp build/bpm-resources.js build/discord/addon
	cp build/emote-classes.css build/discord/addon
	cp build/gif-animotes.css build/discord/addon
	
	cp addon/bootstrap.css build/discord/addon
	cp addon/bpmotes.css build/discord/addon
	cp addon/combiners-nsfw.css build/discord/addon
	cp addon/extracss-pure.css build/discord/addon
	cp addon/extracss-webkit.css build/discord/addon
	cp addon/options.css build/discord/addon
	cp addon/options.html build/discord/addon
	cp addon/options.js build/discord/addon
	cp addon/pref-setup.js build/discord/addon
	
	asar pack build/discord/addon/ build/discord/bpm.asar
	rm -rf build/discord/addon

build/discord: build/discord/installer build/discord/bpm.asar build/discord/integration.asar

#Ideally we'd also upload the 7z to the release, but that's notably more difficult than it would seem 
release/discord: build/discord
	git status 
	git log -1 
	read -r -p "Tag with above commit as $(DISCORD_VERSION) (y/n)? " DC_RELEASE_CONFIRM;\
	if [ "$$DC_RELEASE_CONFIRM" != "y" ] && [ "$$DC_RELEASE_CONFIRM" != "Y" ]; then \
		exit 1; \
	fi
	#git tag -a "$(DISCORD_VERSION)" -m "Release of discord version $(DISCORD_VERSION)" 
	#git push origin $(DISCORD_VERSION) 
	
	#Mac doesn't have a good 7z client that handles password protected so we create a zip.
	rm -rf ./build/BPM\ for\ Discord\ $(DISCORD_VERSION)\ MAC.zip
	cd ./build/discord && zip -r --password $(DC_BPM_ARCHIVE_PASSWORD) ../BPM\ for\ Discord\ $(DISCORD_VERSION)\ MAC.zip . 
	
	#Windows actually can't extract a zipped version because the built in tools don't support the long directory paths
	#that node's module tree creates.  So, we use 7z for Windows.  In other news, what the fuck, MS.
	rm -rf ./build/BPM\ for\ Discord\ $(DISCORD_VERSION)\ WINDOWS.7z
	7z a ./build/BPM\ for\ Discord\ $(DISCORD_VERSION)\ WINDOWS.7z -r ./build/discord/* -p$(DC_BPM_ARCHIVE_PASSWORD) -mhe 

