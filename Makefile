default: data/betterponymotes.css

data/betterponymotes.css: data/emote_classes.css data/flags.css
	cat data/emote_classes.css data/flags.css > data/betterponymotes.css

data/emote_classes.css: emotes/*.yaml
	./bpgen3.py emotes/*.yaml
