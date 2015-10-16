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

console.log("Starting up");

// TODO: initialize sync[prefs] w/ upgrade from localStorage
// Also init local[custom_css] w/ upgrade

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if(message.method === "emote-info-batch") {
        var e = message.emotes;
        for(var k in e) {
            e[k] = lookup_emote(k);
        }
        sendResponse(e);
    } else {
        console.log("Unknown request:", message);
    }
});
