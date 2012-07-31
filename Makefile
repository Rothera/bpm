default: packages

packages: betterponymotes.xpi betterponymotes.crx

betterponymotes.xpi: emote-classes.css data/* package.json lib/main.js
	cfx xpi
	cp betterponymotes.xpi betterponymotes_`./version.py get`.xpi

betterponymotes.crx: emote-classes.css chrome/*
	google-chrome --pack-extension=chrome --pack-extension-key=betterponymotes.pem
	mv chrome.crx betterponymotes.crx
	cp betterponymotes.crx betterponymotes_`./version.py get`.crx

emote-classes.css nsfw-emote-classes.css emote-map.js: bpgen.py emotes/*.yaml
	./bpgen.py emotes/*.yaml
