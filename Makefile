default: packages update-files

packages: build/betterponymotes.xpi build/betterponymotes.crx build/chrome.zip build/betterponymotes.oex

update-files: www/betterponymotes.update.rdf www/opera-updates.xml

www/betterponymotes.update.rdf: build/betterponymotes.xpi
www/opera-updates.xml: build/betterponymotes.oex

www/betterponymotes.update.rdf www/opera-updates.xml:
	bin/gen_update_files.py `bin/version.py get`

build/emote-classes.css build/emote-map.js build/sr-data.js: bpgen.py emotes/*.yaml data/bpmotes-extras.yaml
	./bpgen.py emotes/*.yaml data/bpmotes-extras.yaml

build/betterponymotes.xpi: build/emote-classes.css build/emote-map.js build/sr-data.js firefox/data/* firefox/package.json firefox/lib/main.js
	rm -f build/*.xpi
	cfx xpi --update-url=http://rainbow.mlas1.us/betterponymotes.update.rdf --pkgdir=firefox
	bin/inject_xpi_key.py betterponymotes.xpi build/betterponymotes.xpi
	rm betterponymotes.xpi
	cp build/betterponymotes.xpi build/betterponymotes_`bin/version.py get`.xpi

build/betterponymotes.crx: build/emote-classes.css build/emote-map.js build/sr-data.js chrome/*
	rm -f build/*.crx
	google-chrome --pack-extension=chrome --pack-extension-key=betterponymotes.pem
	mv chrome.crx build/betterponymotes.crx
	cp build/betterponymotes.crx build/betterponymotes_`bin/version.py get`.crx

build/chrome.zip: build/emote-classes.css build/emote-map.js build/sr-data.js chrome/*
	rm -f build/chrome.zip
	cd chrome && zip -r -0 ../build/chrome.zip * && cd ..

build/betterponymotes.oex: build/emote-classes.css build/emote-map.js build/sr-data.js opera/includes/betterponymotes.js opera/includes/* opera/*
	rm -f build/*.oex
	cd opera && zip -r ../build/betterponymotes.oex * -x includes/betterponymotes.js.in && cd ..
	cp build/betterponymotes.oex build/betterponymotes_`bin/version.py get`.oex

opera/includes/betterponymotes.js: bin/make_opera_script.py data/betterponymotes.js build/emote-map.js
	bin/make_opera_script.py opera/includes/betterponymotes.js
