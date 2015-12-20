
var DEV_MODE = false;

// Domain names on which the global emote converter will refuse to run,
// typically due to bad behavior. A common problem is JS attempting to
// dynamically manipulate page stylesheets, which will fail when it hits ours
// (as reading links back to chrome addresses are generally forbidden).
var DOMAIN_BLACKLIST = [
    "read.amazon.com", // Reads document.styleSheets and crashes
    "outlook.com", // Reported conflict; cause unknown
    "panelbase.net", // Reported conflict; cause unknown
    "fimfiction.net",
    "starnetb.lcc.edu" // Reported conflict
];

