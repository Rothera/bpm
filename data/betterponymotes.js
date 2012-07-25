/*******************************************************************************
**
** Copyright (C) 2012 Typhos
**
** This Source Code Form is subject to the terms of the Mozilla Public
** License, v. 2.0. If a copy of the MPL was not distributed with this
** file, You can obtain one at http://mozilla.org/MPL/2.0/.
**
*******************************************************************************/

"use strict";

$("a").each(function(index) {
    var emote = this.pathname.toLowerCase();
    if(emote_map.hasOwnProperty(emote)) {
        console.log("Applying CSS to " + emote + ": " + emote_map[emote]);
        $(this).addClass(emote_map[emote]);
    }
});
