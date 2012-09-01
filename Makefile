default: packages

packages: build/betterponymotes.xpi build/betterponymotes.crx build/betterponymotes.oex

build/emote-classes.css build/emote-map.js build/sr-data.js: bpgen.py emotes/*.yaml data/bpmotes-extras.yaml
	./bpgen.py emotes/*.yaml data/bpmotes-extras.yaml

build/betterponymotes.xpi: build/emote-classes.css build/emote-map.js build/sr-data.js firefox/data/* firefox/package.json firefox/lib/main.js
	cfx xpi --update-url=http://rainbow.mlas1.us/betterponymotes.update.rdf --pkgdir=firefox
	bin/inject_xpi_key.py betterponymotes.xpi build/betterponymotes.xpi
	rm betterponymotes.xpi
	cp build/betterponymotes.xpi build/betterponymotes_`bin/version.py get`.xpi
	uhura -k betterponymotes.pem build/betterponymotes.xpi http://rainbow.mlas1.us/betterponymotes_`bin/version.py get`.xpi > data/betterponymotes.update.rdf

build/betterponymotes.crx: build/emote-classes.css build/emote-map.js build/sr-data.js chrome/*
	google-chrome --pack-extension=chrome --pack-extension-key=betterponymotes.pem
	mv chrome.crx build/betterponymotes.crx
	cp build/betterponymotes.crx build/betterponymotes_`bin/version.py get`.crx

build/betterponymotes.oex: build/emote-classes.css build/emote-map.js build/sr-data.js opera/includes/betterponymotes.js opera/includes/* opera/*
	cd opera && zip -r ../build/betterponymotes.oex * && cd ..
	cp build/betterponymotes.oex build/betterponymotes_`bin/version.py get`.oex

opera/includes/betterponymotes.js: bin/make_opera_script.py data/betterponymotes.js build/emote-map.js
	bin/make_opera_script.py
