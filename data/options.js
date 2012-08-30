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

    function current_platform() {
        if(typeof(self.on) !== "undefined") {
            return "firefox";
        } else if(typeof(chrome) !== "undefined") {
            return "chrome";
        } else if(typeof(opera) !== "undefined") {
            return "opera";
        } else {
            return "unknown";
        }
    }
    var platform = current_platform();

    var _doc_loaded = false;
    var prefs = null;

    var browser;
    switch(platform) {
        case "firefox":
            browser = {
                prefs_updated: function() {
                    self.port.emit("setPrefs", prefs);
                }
            };
            break;

        case "chrome":
        case "opera":
            browser = {
                prefs_updated: function() {
                    localStorage.prefs = JSON.stringify(prefs);
                }
            };
            break;
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
                browser.prefs_updated();
            }, false);
        }

        checkbox_pref(enableNSFW, "enableNSFW");
        checkbox_pref(enableExtraCSS, "enableExtraCSS");

        // Subreddit enabler
        var sr_list_element = document.getElementById("sr-list");
        function gen_checkbox(label, value) {
            // <label>Some text here <input type="checkbox" value="?"></label><br>
            var label_element = document.createElement("label");
            var input_element = document.createElement("input");
            input_element.type = "checkbox";
            input_element.checked = value;
            label_element.appendChild(input_element);
            label_element.appendChild(document.createTextNode(label));
            sr_list_element.appendChild(label_element);
            sr_list_element.appendChild(document.createElement("br"));
            return input_element;
        }

        for(var sr_name in sr_data) {
            var full_name = sr_data[sr_name][0];
            var element = gen_checkbox("Enable " + full_name, prefs.enabledSubreddits[sr_name]);

            // Closure to capture variables
            var callback = (function(sr_name) {
                return function() {
                    console.log("Setting sr " + sr_name + " to " + this.checked);
                    prefs.enabledSubreddits[sr_name] = this.checked;
                    browser.prefs_updated();
                };
            })(sr_name);

            element.addEventListener("change", callback, false);
        }
    }

    window.addEventListener("DOMContentLoaded", function() {
        _doc_loaded = true;
        if(_doc_loaded && prefs !== null) {
            run();
        }
    }, false);

    switch(platform) {
        case "firefox":
            self.port.on("prefs", function(_prefs) {
                prefs = _prefs;
                if(_doc_loaded && prefs !== null) {
                    run();
                }
            });

            self.port.emit("getPrefs");
            break;

        case "chrome":
        case "opera":
            prefs = JSON.parse(localStorage.prefs);
            if(_doc_loaded && prefs !== null) {
                run();
            }
            break;
    }
})(this);
