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
    if(emote_map.hasOwnProperty(this.pathname)) {
        console.log("Applying CSS to " + this.pathname + ": ");
        $(this).addClass(emote_map[this.pathname]);
    }
});
