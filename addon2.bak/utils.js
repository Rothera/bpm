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

var dom = new Promise(function(resolve, reject) {
    if(document.readyState === "interactive" || document.readyState === "complete") {
        console.log("Document loaded on startup");
        resolve();
    } else {
        document.addEventListener("DOMContentLoaded", function(event) {
            console.log("Document loaded");
            resolve();
        }, false);
    }
});

function ajax(url) {
    return new Promise(function(resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.addEventListener("load", function(event) {
            resolve(xhr);
        });
        xhr.addEventListener("error", function(event) {
            reject(xhr);
        });
        xhr.open("GET", url);
        xhr.send();
    });
}

var slice = Array.prototype.slice.call.bind(Array.prototype.slice);

function parse_html(text) {
    var parser = new DOMParser();
    var document = parser.parseFromString(text, "text/html");
    return document;
}

function debounce(wait, callback) {
    var timer = null;
    return function() {
        var args = arguments;
        clearTimeout(timer);
        timer = setTimeout(function() {
            timer = null;
            callback.apply(undefined, args);
        }, wait);
    };
}
