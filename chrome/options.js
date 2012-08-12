/*******************************************************************************
**
** Copyright (C) 2012 Typhos
**
** This Source Code Form is subject to the terms of the Mozilla Public
** License, v. 2.0. If a copy of the MPL was not distributed with this
** file, You can obtain one at http://mozilla.org/MPL/2.0/.
**
*******************************************************************************/

/*
 * Because Chrome is fucking annoying
 */

function load_options() {
    var prefs = getPrefs();
    console.log("loading prefs:", prefs);

    document.getElementById("enableNSFW").checked = prefs["enableNSFW"];
    document.getElementById("enableExtraCSS").checked = prefs["enableExtraCSS"];
}

function save_options() {
    localStorage["prefs"] = JSON.stringify({
        "enableNSFW": document.getElementById("enableNSFW").checked,
        "enableExtraCSS": document.getElementById("enableExtraCSS").checked
        });
    console.log("saved prefs:", localStorage["prefs"]);
}

document.body.onload = load_options;
document.getElementById("save-button").onclick = save_options;
