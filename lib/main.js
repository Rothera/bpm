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

var page_mod = require("page-mod");
var self = require("self");

page_mod.PageMod({
    include: ["*.reddit.com"],
    // Use non-minified jquery version for development (because
    // otherwise the tracebacks are a mile wide)
    contentScriptFile: [
        self.data.url("jquery-1.7.2.js"),
        self.data.url("mutation_summary.js"),
        self.data.url("emote_map.js"),
        self.data.url("betterponymotes.js")],
    contentScriptWhen: "ready",
    contentStyleFile: self.data.url("betterponymotes.css")
});
