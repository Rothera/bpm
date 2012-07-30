default: packages

packages: betterponymotes.xpi betterponymotes.crx

betterponymotes.xpi: emote-classes.css data/* package.json lib/main.js
	cfx xpi

betterponymotes.crx: emote-classes.css chrome/*
	google-chrome --pack-extension=chrome --pack-extension-key=betterponymotes.pem
	mv chrome.crx betterponymotes.crx

emote-classes.css nsfw-emote-classes.css emote-map.js: bpgen.py emotes/*.yaml
	./bpgen.py emotes/*.yaml
