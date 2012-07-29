default: packages

packages: betterponymotes.xpi betterponymotes.crx

betterponymotes.xpi: emote-classes.css nsfw-emote-classes.css combiners.css misc.css emote-map.js betterponymotes.js data/extracss-firefox.css package.json lib/main.js
	cfx xpi

betterponymotes.crx: emote-classes.css nsfw-emote-classes.css combiners.css misc.css emote-map.js betterponymotes.js chrome/extracss-chrome.css chrome/manifest.json
	google-chrome --pack-extension=chrome --pack-extension-key=betterponymotes.pem
	mv chrome.crx betterponymotes.crx

emote-classes.css nsfw-emote-classes.css emote-map.js: bpgen.py emotes/*.yaml
	./bpgen.py emotes/*.yaml
