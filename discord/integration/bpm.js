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
var settings = require('./bpm-settings');

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
    settings.addSettings(self.mainWindow, getDataDir());
    addScripts(self.mainWindow);
};

function readContent(name) {
    return fs.readFileSync(path.join(bpmDir, name), 'utf-8');
}

function addScripts(mainWindow) {
    var resourceScript = readContent('bpm-resources.js');
    var prefsScript = readContent('pref-setup.js'); 
    var backgroundScript = readContent('background.js');
    var bpmScript = readContent('betterponymotes.js');
    var settingsScript = readContent('settings.js');

    mainWindow.webContents.executeJavaScript(resourceScript);
    mainWindow.webContents.executeJavaScript(prefsScript);
    mainWindow.webContents.executeJavaScript(backgroundScript);
    mainWindow.webContents.executeJavaScript(bpmScript);
    mainWindow.webContents.executeJavaScript(settingsScript);
}

