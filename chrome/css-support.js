/*******************************************************************************
**
** Copyright (C) 2012 Typhos
**
** This Source Code Form is subject to the terms of the Mozilla Public
** License, v. 2.0. If a copy of the MPL was not distributed with this
** file, You can obtain one at http://mozilla.org/MPL/2.0/.
**
*******************************************************************************/

function enable_css(filename) {
    var tag = document.createElement("link");
    tag.href =  chrome.extension.getURL(filename);
    tag.rel = "stylesheet";
    document.documentElement.insertBefore(tag);
}

chrome.extension.sendMessage({method: "getPrefs"}, function(prefs) {
    if(prefs.enableExtraCSS) {
        enable_css("extracss-chrome.css");
    }

    if(prefs.enableNSFW) {
        enable_css("nsfw-emote-classes.css");
    }
});
