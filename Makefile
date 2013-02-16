KEYFILE = ../secret/betterponymotes.pem
VERSION = $(shell bin/filter.py data/config.json -v version)

COMPILED_SCRIPT = build/betterponymotes.js
ADDON_SOURCES = addon/* $(COMPILED_SCRIPT)

FIREFOX_PACKAGES = build/betterponymotes.xpi #build/betterponymotes_$(VERSION).xpi
CHROME_PACKAGES = build/chrome.zip
OPERA_PACKAGES = build/betterponymotes.oex #build/betterponymotes_$(VERSION).oex
USERSCRIPT = build/betterponymotes.user.js

SOURCE_EMOTE_DATA = emotes/*.json tags/*.json data/rules.yaml data/tags.yaml
ADDON_DATA = build/bpm-resources.js build/emote-classes.css build/gif-animotes.css
EXPORT_FILES = build/export.json build/export.json.bz2
UPDATE_MANIFESTS = build/betterponymotes.update.rdf build/opera-updates.xml

default: $(FIREFOX_PACKAGES) $(CHROME_PACKAGES) $(OPERA_PACKAGES) $(USERSCRIPT) $(UPDATE_MANIFESTS) $(EXPORT_FILES)

sync: update-www
	cd www && rsync -vvLr --delete ./ ref@mlas1.us:www
	echo "Remember to upload the CRX to the Chrome Webstore!"

update-www: $(FIREFOX_PACKAGES) $(OPERA_PACKAGES) $(USERSCRIPT) bin/filter.py data/config.json web/*
	cp web/changelog.html web/chrome-update.html web/*.png www
	bin/filter.py data/config.json < web/index.html > www/index.html
	rm -fv www/*.xpi www/*.oex
	cp -v build/*.xpi build/*.oex www

$(ADDON_DATA): bpgen.py dlanimotes.py $(SOURCE_EMOTE_DATA)
	mkdir -p build
	./dlanimotes.py
	./bpgen.py

$(EXPORT_FILES): bpexport.py $(SOURCE_EMOTE_DATA)
	mkdir -p build
	./bpexport.py --json build/export.json
	bzip2 -kf build/export.json

$(FIREFOX_PACKAGES): firefox-files bin/inject_xpi_key.py
	rm -fv build/*.xpi # Remove stale packages
	cfx xpi --update-url=http://rainbow.mlas1.us/betterponymotes.update.rdf --pkgdir=build/firefox
	bin/inject_xpi_key.py betterponymotes.xpi build/betterponymotes.xpi
	rm betterponymotes.xpi
	cp build/betterponymotes.xpi build/betterponymotes_$(VERSION).xpi

$(CHROME_PACKAGES): chrome-files
	rm -f build/chrome.zip
	cd build/chrome && cp ../../$(KEYFILE) key.pem && zip -r -0 -q ../chrome.zip * && rm key.pem

$(OPERA_PACKAGES): opera-files
	rm -fv build/*.oex # Remove stale packages
	cd build/opera && zip -r -q ../betterponymotes.oex *
	cp build/betterponymotes.oex build/betterponymotes_$(VERSION).oex

$(USERSCRIPT): $(COMPILED_SCRIPT) bin/make_userscript.py
	mkdir -p build
	bin/make_userscript.py $(COMPILED_SCRIPT) $(USERSCRIPT) http://rainbow.mlas1.us

$(UPDATE_MANIFESTS): $(FIREFOX_PACKAGES) $(OPERA_PACKAGES)
	bin/gen_update_files.py $(VERSION) $(KEYFILE)

$(COMPILED_SCRIPT): bin/filter.py data/config.json addon/bpm-*.js
	cat addon/bpm-header.js \
	    addon/bpm-utils.js \
	    addon/bpm-data.js \
	    addon/bpm-browser.js \
	    addon/bpm-prefs.js \
	    addon/bpm-reddit.js \
	    addon/bpm-search.js \
	    addon/bpm-global.js \
	    addon/bpm-main.js \
	    | bin/filter.py data/config.json \
	    > $(COMPILED_SCRIPT)

firefox-files: $(ADDON_SOURCES) $(ADDON_DATA) bin/filter.py data/config.json
	mkdir -p build/firefox build/firefox/lib build/firefox/data
	# / - package metadata
	bin/filter.py data/config.json < addon/fx-package.json > build/firefox/package.json
	# /lib - backend
	cp addon/fx-main.js          build/firefox/lib/main.js
	cp addon/pref-setup.js       build/firefox/lib
	cp build/bpm-resources.js    build/firefox/lib
	# /data - content script
	cp $(COMPILED_SCRIPT)        build/firefox/data
	cp addon/bpmotes.css         build/firefox/data
	cp addon/combiners-nsfw.css  build/firefox/data
	cp addon/extracss-pure.css   build/firefox/data
	cp addon/extracss-moz.css    build/firefox/data
	# /data - options page
	cp addon/options.html        build/firefox/data
	cp addon/options.css         build/firefox/data
	cp addon/options.js          build/firefox/data
	cp addon/bootstrap.css       build/firefox/data
	cp addon/jquery-1.8.2.js     build/firefox/data
	# /data - data files
	cp build/bpm-resources.js    build/firefox/data
	cp build/emote-classes.css   build/firefox/data

chrome-files: $(ADDON_SOURCES) $(ADDON_DATA) bin/filter.py data/config.json
	mkdir -p build/chrome
	# / - package metadata
	bin/filter.py data/config.json < addon/cr-manifest.json > build/chrome/manifest.json
	# / - backend
	cp addon/cr-background.html   build/chrome/background.html
	cp addon/cr-background.js     build/chrome/background.js
	cp addon/pref-setup.js        build/chrome
	# / - content script
	cp $(COMPILED_SCRIPT)         build/chrome
	cp addon/bpmotes.css          build/chrome
	cp addon/combiners-nsfw.css   build/chrome
	cp addon/extracss-pure.css    build/chrome
	cp addon/extracss-webkit.css  build/chrome
	# / - options page
	cp addon/options.html         build/chrome
	cp addon/options.css          build/chrome
	cp addon/options.js           build/chrome
	cp addon/bootstrap.css        build/chrome
	cp addon/jquery-1.8.2.js      build/chrome
	# / - data files
	cp build/bpm-resources.js     build/chrome
	cp build/emote-classes.css    build/chrome
	cp build/gif-animotes.css     build/chrome

opera-files: $(ADDON_SOURCES) $(ADDON_DATA) bin/filter.py data/config.json
	mkdir -p build/opera build/opera/includes
	# / - package metadata
	bin/filter.py data/config.json < addon/o-config.xml > build/opera/config.xml
	# / - backend
	cp addon/o-index.html     build/opera/index.html
	cp addon/o-background.js  build/opera/background.js
	cp addon/pref-setup.js    build/opera
	# / and /includes - content script
	cp $(COMPILED_SCRIPT)             build/opera/includes
	cp addon/bpmotes.css              build/opera
	cp addon/combiners-nsfw.css       build/opera
	cp addon/extracss-pure-opera.css  build/opera/extracss-pure.css
	cp addon/extracss-o.css           build/opera
	# / - options page
	cp addon/options.html             build/opera
	cp addon/options.css              build/opera
	cp addon/options.js               build/opera
	cp addon/bootstrap.css            build/opera
	cp addon/jquery-1.8.2.js          build/opera
	# / and /includes - data files
	cp build/bpm-resources.js         build/opera/includes
	cp build/bpm-resources.js 	  build/opera
	cp build/emote-classes.css        build/opera
