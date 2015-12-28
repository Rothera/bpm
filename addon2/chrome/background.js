/*******************************************************************************
**
** This file is part of BetterPonymotes.
** Copyright (c) 2012-2015 Typhos.
** Copyright (c) 2015 TwilightShadow1.
**
** This program is free software: you can redistribute it and/or modify it
** under the terms of the GNU Affero General Public License as published by
** the Free Software Foundation, either version 3 of the License, or (at your
** option) any later version.
**
** This program is distributed in the hope that it will be useful, but WITHOUT
** ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
** FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public License
** for more details.
**
** You should have received a copy of the GNU Affero General Public License
** along with this program.  If not, see <http://www.gnu.org/licenses/>.
**
*******************************************************************************/

"use strict";

function main() {
    console.log("Starting up");

    chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
        console.log("Received message:", message);
        if(message.request === "emotes") {
            sendResponse(lookup_emotes(message.emotes));
        }
        sendResponse("go away");
    });
}

if(localStorage["prefs"]) {
    // Upgrade from old versions.
    console.log("Upgrading preferences from localStorage");
    var prefs = migrate_preferences(JSON.parse(localStorage["prefs"]));

    // Upgrade
    setup_preferences(prefs);

    // Reset, then run main
    chrome.storage.local.set({"bpm.prefs": prefs}, function() {
        // Clear localStorage
        for(var k in localStorage) {
            delete localStorage[k];
        }

        main();
    });
} else {
    chrome.storage.local.get("bpm.prefs", function(items) {
        var prefs = items["bpm.prefs"] || {};

        // Upgrade
        if(setup_preferences(prefs)) {
            chrome.storage.local.set({"bpm.prefs": prefs}, function() {
                main();
            });
        } else {
            main();
        }
    });
}
