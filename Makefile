default: packages

packages: betterponymotes.xpi betterponymotes.crx betterponymotes.oex

emote-classes.css nsfw-emote-classes.css emote-map.js: bin/bpgen.py emotes/*.yaml
	bin/bpgen.py emotes/*.yaml

betterponymotes.xpi: emote-classes.css nsfw-emote-classes.css emote-map.js firefox/data/* firefox/package.json firefox/lib/main.js
	cfx xpi --update-url=http://rainbow.mlas1.us/betterponymotes.update.rdf --pkgdir=firefox

unpack-xpi:
	mkdir xpi
	unzip betterponymotes.xpi -d xpi

pack-xpi:
	cd xpi && zip -r ../betterponymotes.xpi * && cd ..
	rm -r xpi
	cp betterponymotes.xpi betterponymotes_`bin/version.py get`.xpi
	uhura -k betterponymotes.pem betterponymotes_`bin/version.py get`.xpi http://rainbow.mlas1.us/betterponymotes_`bin/version.py get`.xpi > betterponymotes.update.rdf

betterponymotes.crx: emote-classes.css nsfw-emote-classes.css emote-map.js chrome/*
	google-chrome --pack-extension=chrome --pack-extension-key=betterponymotes.pem
	mv chrome.crx betterponymotes.crx
	cp betterponymotes.crx betterponymotes_`bin/version.py get`.crx

betterponymotes.oex: emote-classes.css nsfw-emote-classes.css emote-map.js opera/includes/betterponymotes.js opera/includes/* opera/*
	cd opera && zip -r ../betterponymotes.oex * && cd ..
	cp betterponymotes.oex betterponymotes_`bin/version.py get`.oex

opera/includes/betterponymotes.js: bin/make_opera_script.py opera/includes/betterponymotes.js.in emote-map.js
	bin/make_opera_script.py
