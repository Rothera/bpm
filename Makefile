default: data/betterponymotes.css

data/betterponymotes.css: emote_classes.css flags.css misc.css
	cat emote_classes.css flags.css misc.css > data/betterponymotes.css

emote_classes.css: emotes/*.yaml
	./bpgen.py emotes/*.yaml
