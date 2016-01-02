/**
 * Main object for integrating Typhos' BetterPonymotes with Discord
 * (c) 2015 ByzantineFailure
 *
 * Many much thanks to BetterDiscord, from which a lot of ideas
 * are cribbed.
 * https://github.com/Jiiks/BetterDiscordApp
 *
 * Injects our scripts and styles then triggers any submodule code
 * (e.g. settings)
 **/
module.exports = BPM;

var path = require('path');
var fs = require('fs');
var settings = require('./bpm-settings');
var search = require('./bpm-search');

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
    //self.mainWindow.webContents.openDevTools();
    search.addSearch(self.mainWindow, getDataDir());
    settings.addSettings(self.mainWindow, getDataDir());
    addStyleListener(self.mainWindow);
    addScripts(self.mainWindow);
};

function readContent(name) {
    return fs.readFileSync(path.join(bpmDir, name), 'utf-8');
}

function generateCssLoadCase(filename) {
    var file = fs.readFileSync(path.join(bpmDir, filename), 'utf-8');
    var cssText = file.replace(/\n/g, ' ');
    cssText = cssText.replace(/'/g, "\\'");
    var statement =
    "   case '" + filename + "':\n" +
    "       var node = document.createElement('style');\n" +
    "       node.type = 'text/css';\n" +
    "       node.appendChild(document.createTextNode('" + cssText +"'));\n" +
    "       respondWithTag(node);\n" +
    "       document.head.appendChild(node);\n" +
    "       break;\n";
    return statement;
}

function addStyleListener(mainWindow) {
    var code =
    "window.addEventListener('bpm_backend_message', function(event) {\n" +
    "   function respondWithTag(element) {\n" +
    "       var response = new CustomEvent('bpm_backend_message');\n" +
    "       response.data = { method: 'css_tag_response', tag: element };\n" +
    "       window.dispatchEvent(response);\n" +
    "   }\n" +
    "   if(event.data.method != 'insert_css') return;\n" +
    "   switch(event.data.file) {\n" +
        generateCssLoadCase('/emote-classes.css') +
        generateCssLoadCase('/gif-animotes.css') +
        generateCssLoadCase('/bootstrap.css') +
        generateCssLoadCase('/bpmotes.css') +
        generateCssLoadCase('/combiners-nsfw.css') +
        generateCssLoadCase('/extracss-pure.css') +
        generateCssLoadCase('/extracss-webkit.css') +
    "   default:\n" +
    "       console.log('Received unknown CSS file: ' + event.data.file);\n" +
    "       break;\n" +
    "   }\n" +
    "});";
    mainWindow.webContents.executeJavaScript(code);
}

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

