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
        console.log("Loading preferences");
        return new Promise(function(resolve, reject) {
            chrome.storage.sync.get("prefs", function(items) {
                console.log("Loaded preferences");
                resolve(items);
            });
        });
    },

    fetch_resource: function(name) {
        console.log("Loading", name);
        return new Promise(function(resolve, reject) {
            var url = chrome.extension.getURL("/" + name);
            ajax(url).then(function(xhr) {
                console.log("Loaded", name);
                resolve(xhr.response);
            }, function(xhr) {
                console.log("Failed to load", name);
                reject();
            });
        });
    },

    fetch_custom_css: function() {
        console.log("Loading custom subreddit CSS");
        return new Promise(function(resolve, reject) {
            console.log("STUB: fetch_custom_css");
            resolve("");
        });
    },

    open_options_page: function() {
        console.log("STUB: open_options_page");
    },

    emote_info_batch: function(emotes) {
        console.log("Loading batch emote info");
        var msg = {"method": "emote-info-batch", "emotes": emotes};
        return new Promise(function(resolve, reject) {
            chrome.runtime.sendMessage(msg, function(response) {
                resolve(response);
            });
        });
    }
};

function main() {
    if(!is_reddit && !is_voat) {
        return;
    }

    console.log("Starting up");

    reddit_preload();

    dom.then(function() {
        reddit_main();
    });
}

main();
