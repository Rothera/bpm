/*******************************************************************************
**
** Copyright (C) 2012 Typhos
**
** This Source Code Form is subject to the terms of the Mozilla Public
** License, v. 2.0. If a copy of the MPL was not distributed with this
** file, You can obtain one at http://mozilla.org/MPL/2.0/.
**
*******************************************************************************/

(function(global) {
    "use strict";

    var _doc_loaded = false;
    var prefs = null;

    function prefs_updated() {
        self.port.emit("setPrefs", prefs);
    }

    function run() {
        // Cache elements
        var enableNSFW = document.getElementById("enableNSFW");
        var enableExtraCSS = document.getElementById("enableExtraCSS");

        // Initialize values
        enableNSFW.checked = prefs.enableNSFW;
        enableExtraCSS.checked = prefs.enableExtraCSS;

        // Listen for edits to the checkboxes
        function checkbox_pref(element, pref_name) {
            element.addEventListener("change", function() {
                prefs[pref_name] = this.checked;
                prefs_updated();
            }, false);
        }

        checkbox_pref(enableNSFW, "enableNSFW");
        checkbox_pref(enableExtraCSS, "enableExtraCSS");
    }

    window.addEventListener("DOMContentLoaded", function() {
        _doc_loaded = true;
        if(_doc_loaded && prefs !== null) {
            run();
        }
    }, false);

    self.port.on("prefs", function(_prefs) {
        prefs = _prefs;
        if(_doc_loaded && prefs !== null) {
            run();
        }
    });

    self.port.emit("getPrefs");
})(this);
