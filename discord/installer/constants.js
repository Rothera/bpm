"use strict";
module.exports = {
    bpmVersion: '^0.0.1',
    requireStatement: 'var bpm = require(\'dc-bpm\');',
    injectStatement: 'var bpmInstance = new bpm(mainWindow);\nbpmInstance.init();'
};

