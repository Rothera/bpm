/**
 * Main object for integrating Typhos' BetterPonymotes with Discord
 * (c) 2015 ByzantineFailure
 *
 * Many much thanks to BetterDiscord, from which a lot of ideas
 * are cribbed.
 * https://github.com/Jiiks/BetterDiscordApp
 **/
module.exports = BPM;

var path = require('path');
var fs = require('fs');

var self;
var bpmDir = getDataDir();

function getDataDir() {
    switch(process.platform) {
        case 'win32':
            return path.join(process.env.APPDATA, 'discord', 'bpm');
        case 'darwin':
            return path.join(process.env.HOME, 'Library', 'Preferences', 'discord', 'bpm');
        default:
            return path.join('var', 'local', 'bpm');
    }
}

function BPM(mainWindow) {
    self = this;
    self.mainWindow = mainWindow;
}

BPM.prototype.init = function() {
    self.mainWindow.webContents.openDevTools();
    //addCss(self.mainWindow);
    addScripts(self.mainWindow);
};

function readContent(name) {
    return fs.readFileSync(path.join(bpmDir, name), 'utf-8');
}
/*
function addCss(mainWindow) {
    var webkitExtras = readContent('extracss-webkit.css');
    var emoteClasses = readContent('emote-classes.css');
    var bpmotes = readContent('bpmotes.css');
    
    addCss(mainWindow, webkitExtras);
    addCss(mainWindow, emoteClasses);
    addCss(mainWindow, bpmotes);
}
*/
function addScripts(mainWindow) {
    var resourceScript = readContent('bpm-resources.js');
    var prefsScript = readContent('pref-setup.js'); 
    var backgroundScript = readContent('background.js');
    var bpmScript = readContent('betterponymotes.js');

    mainWindow.webContents.executeJavaScript(resourceScript);
    mainWindow.webContents.executeJavaScript(prefsScript);
    mainWindow.webContents.executeJavaScript(backgroundScript);
    mainWindow.webContents.executeJavaScript(bpmScript);
}

