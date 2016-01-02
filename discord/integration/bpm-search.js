/**
 * Emote seasrch integration for Typhos' BetterPonymotes for Discord
 * (c) 2015-2016 ByzantineFailure
 *
 * Sets up our injected HTML and CSS
 **/
var path = require('path');
var fs = require('fs');

module.exports = {
    addSearch:  addSearch
}

function getCssLoadCode(css) {
    var code =
    "var node = document.createElement('style');\n" + 
    "node.type = 'text/css';\n" + 
    "node.appendChild(document.createTextNode('" + css + "'));\n" +
    "document.head.appendChild(node);\n";
    return code;
}

function addSearch(mainWindow, contentLocation) {
    var css = fs.readFileSync(path.join(contentLocation, 'search.css'), 'utf-8');
    css = css.replace(/\n/g, ' ');
    css = css.replace(/'/g, '\\\'');

    var buttonCode = fs.readFileSync(path.join(contentLocation, 'search-button.js'), 'utf-8');

    mainWindow.webContents.executeJavaScript(getCssLoadCode(css));
    mainWindow.webContents.executeJavaScript(buttonCode);
}

