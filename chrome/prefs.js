/*******************************************************************************
**
** Copyright (C) 2012 Typhos
**
** This Source Code Form is subject to the terms of the Mozilla Public
** License, v. 2.0. If a copy of the MPL was not distributed with this
** file, You can obtain one at http://mozilla.org/MPL/2.0/.
**
*******************************************************************************/

function getPrefs() {
    var prefs = localStorage["prefs"];
    if(prefs) {
        prefs = JSON.parse(prefs);
    } else {
        prefs = {"enableNSFW": false, "enableExtraCSS": true};
        localStorage["prefs"] = JSON.stringify(prefs);
    }
    return prefs;
}
