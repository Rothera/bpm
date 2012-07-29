default: packages

packages: betterponymotes.xpi betterponymotes.crx

betterponymotes.xpi: lib/main.js betterponymotes.css betterponymotes.js emote_map.js data/extracss-firefox.css package.json
	cfx xpi

betterponymotes.crx: betterponymotes.css betterponymotes.js emote_map.js chrome/extracss-chrome.css chrome/manifest.json
	google-chrome --pack-extension=chrome --pack-extension-key=betterponymotes.pem
	mv chrome.crx betterponymotes.crx

betterponymotes.css: emote_classes.css combiners.css misc.css
	cat misc.css combiners.css emote_classes.css > data/betterponymotes.css

emote_classes.css emote_map.js: bpgen.py emotes/*.yaml
	./bpgen.py emotes/*.yaml
