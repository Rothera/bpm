KEYFILE = ../secret/betterponymotes.pem
VERSION = $(shell bin/version.py get)

COMPILED_SCRIPT = build/betterponymotes.js
COMMON_SOURCES = addon/common/* $(COMPILED_SCRIPT)
FIREFOX_SOURCES = addon/firefox/* $(COMMON_SOURCES)
CHROME_SOURCES = addon/chrome/* $(COMMON_SOURCES)
OPERA_SOURCES = addon/opera/* $(COMMON_SOURCES)

FIREFOX_PACKAGES = build/betterponymotes.xpi #build/betterponymotes_$(VERSION).xpi
CHROME_PACKAGES = build/chrome.zip
OPERA_PACKAGES = build/betterponymotes.oex #build/betterponymotes_$(VERSION).oex
USERSCRIPT = build/betterponymotes.user.js

EMOTE_DATA = emotes/*.json tags/*.json data/rules.yaml data/tags.yaml
ADDON_DATA = build/bpm-data.js build/emote-classes.css build/gif-animotes.css
EXPORT_FILES = build/export.json build/export.json.bz2
UPDATE_MANIFESTS = build/betterponymotes.update.rdf build/opera-updates.xml

default: $(FIREFOX_PACKAGES) $(CHROME_PACKAGES) $(OPERA_PACKAGES) $(USERSCRIPT) $(UPDATE_MANIFESTS) $(EXPORT_FILES)

$(ADDON_DATA): bpgen.py dlanimotes.py $(EMOTE_DATA)
	mkdir -p build
	./dlanimotes.py
	./bpgen.py

$(EXPORT_FILES): bpexport.py $(EMOTE_DATA)
	mkdir -p build
	./bpexport.py --json build/export.json
	bzip2 -kf build/export.json

$(FIREFOX_PACKAGES): firefox-files bin/inject_xpi_key.py
	cfx xpi --update-url=http://rainbow.mlas1.us/betterponymotes.update.rdf --pkgdir=build/firefox
	bin/inject_xpi_key.py betterponymotes.xpi build/betterponymotes.xpi
	rm betterponymotes.xpi
	cp build/betterponymotes.xpi build/betterponymotes_$(VERSION).xpi

$(CHROME_PACKAGES): chrome-files
	rm -f build/chrome.zip
	cd build/chrome && cp ../../$(KEYFILE) key.pem && zip -r -0 -q ../chrome.zip * && rm key.pem

$(OPERA_PACKAGES): opera-files
	cd build/opera && zip -r -q ../betterponymotes.oex *
	cp build/betterponymotes.oex build/betterponymotes_$(VERSION).oex

$(USERSCRIPT): addon/common/betterponymotes.js bin/make_userscript.py
	mkdir -p build
	bin/make_userscript.py $(COMPILED_SCRIPT) $(USERSCRIPT) http://rainbow.mlas1.us

$(UPDATE_MANIFESTS): $(FIREFOX_PACKAGES) $(OPERA_PACKAGES)
	bin/gen_update_files.py $(VERSION) $(KEYFILE)

$(COMPILED_SCRIPT): addon/common/betterponymotes.js #addon/common/bpm-*.js
	cp addon/common/betterponymotes.js $(COMPILED_SCRIPT)

firefox-files: $(FIREFOX_SOURCES) $(ADDON_DATA)
	mkdir -p build/firefox build/firefox/lib build/firefox/data
	# / - package metadata
	cp addon/firefox/package.json       build/firefox
	# /lib - backend
	cp addon/firefox/main.js            build/firefox/lib
	cp addon/common/pref-setup.js       build/firefox/lib
	cp build/bpm-data.js                build/firefox/lib
	# /data - content script
	cp $(COMPILED_SCRIPT)               build/firefox/data
	cp addon/common/bpmotes.css         build/firefox/data
	cp addon/common/combiners-nsfw.css  build/firefox/data
	cp addon/common/extracss-pure.css   build/firefox/data
	cp addon/common/extracss-moz.css    build/firefox/data
	# /data - options page
	cp addon/common/options.html        build/firefox/data
	cp addon/common/options.css         build/firefox/data
	cp addon/common/options.js          build/firefox/data
	cp addon/common/bootstrap.css       build/firefox/data
	cp addon/common/jquery-1.8.2.js     build/firefox/data
	# /data - data files
	cp build/bpm-data.js                build/firefox/data
	cp build/emote-classes.css          build/firefox/data

chrome-files: $(CHROME_SOURCES) $(ADDON_DATA)
	mkdir -p build/chrome
	# / - package metadata
	cp addon/chrome/manifest.json        build/chrome
	# / - backend
	cp addon/chrome/background.html      build/chrome
	cp addon/chrome/background.js        build/chrome
	cp addon/common/pref-setup.js        build/chrome
	# / - content script
	cp $(COMPILED_SCRIPT)                build/chrome
	cp addon/common/bpmotes.css          build/chrome
	cp addon/common/combiners-nsfw.css   build/chrome
	cp addon/common/extracss-pure.css    build/chrome
	cp addon/common/extracss-webkit.css  build/chrome
	# / - options page
	cp addon/common/options.html         build/chrome
	cp addon/common/options.css          build/chrome
	cp addon/common/options.js           build/chrome
	cp addon/common/bootstrap.css        build/chrome
	cp addon/common/jquery-1.8.2.js      build/chrome
	# / - data files
	cp build/bpm-data.js                 build/chrome
	cp build/emote-classes.css           build/chrome
	cp build/gif-animotes.css            build/chrome

opera-files: $(OPERA_SOURCES) $(ADDON_DATA)
	mkdir -p build/opera build/opera/includes
	# / - package metadata
	cp addon/opera/config.xml     build/opera
	# / - backend
	cp addon/opera/index.html     build/opera
	cp addon/opera/background.js  build/opera
	cp addon/common/pref-setup.js build/opera
	# / and /includes - content script
	cp $(COMPILED_SCRIPT)                    build/opera/includes
	cp addon/common/bpmotes.css              build/opera
	cp addon/common/combiners-nsfw.css       build/opera
	cp addon/common/extracss-pure-opera.css  build/opera/extracss-pure.css
	cp addon/common/extracss-o.css           build/opera
	# / - options page
	cp addon/common/options.html             build/opera
	cp addon/common/options.css              build/opera
	cp addon/common/options.js               build/opera
	cp addon/common/bootstrap.css            build/opera
	cp addon/common/jquery-1.8.2.js          build/opera
	# / and /includes - data files
	cp build/bpm-data.js                     build/opera/includes
	cp build/emote-classes.css               build/opera
