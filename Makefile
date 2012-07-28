default: data/betterponymotes.css

data/betterponymotes.css: emote_classes.css custom_css/*.css
	cat emote_classes.css custom_css/* > data/betterponymotes.css

emote_classes.css: emotes/*.yaml
	./bpgen.py emotes/*.yaml
