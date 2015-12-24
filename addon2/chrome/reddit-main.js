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

var browser = {
    core_stylesheets: ["gif-animotes.css"],

    prefs: function() {
        return new Promise(function(resolve, reject) {
            console.log(lp, "[BROWSER]", "Loading preferences");
            chrome.storage.local.get("bpm.prefs", function(items) {
                resolve(items["bpm.prefs"]);
            });
        });
    },

    fetch_stylesheet: function(name) {
        console.log(lp, "[BROWSER]", "Loading", name);
        return new Promise(function(resolve, reject) {
            var url = chrome.extension.getURL("/" + name);
            ajax(url).then(function(xhr) {
                console.log(lp, "[BROWSER]", "Loaded", name);
                resolve(xhr.response);
            }, function(xhr) {
                console.log(lp, "[BROWSER]", "Failed to load", name);
                reject();
            });
        });
    },

    fetch_custom_css: function() {
        console.log(lp, "STUB: browser.fetch_custom_css");
        return Promise.resolve("/*stub*/");
    },

    fetch_emotes: function(emote_names) {
        // emote_names: {"/emotename": arbitrary data}
        return new Pronise(function(resolve, reject) {
            // TODO: Fetch all this stuff from backend. First need to be able
            // to receive messages on the backend...
        });
    }
};

function main() {
    console.log(lp, "[BROWSER]", "BetterPonymotes reddit/Voat Chrome Content Script");

    if(!is_reddit && !is_voat) {
        console.log(lp, "[BROWSER]", "Unknown site: this doesn't seem to be reddit or Voat");
        return;
    }

    reddit_preload();
    timing_checkpoint("reddit-preload-done");

    dom.then(function() {
        reddit_main();
        timing_checkpoint("reddit-done");
    });
}

timing_checkpoint("content-script-end");
main();
