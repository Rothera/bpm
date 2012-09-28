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

function run() {
    function parse_input(input) {
        var text = input.val();
        var emotes = text.split(",");
        // Normalize things a bit
        emotes = emotes.map(function(s) { return s.trim(); });
        emotes = emotes.filter(function(s) { return s.length; });
        return emotes;
    }

    function insert_emotes(input, list, emotes) {
        emotes = emotes.map(function(s) { return (s[0] == "+" ? "" : "+") + s; });

        for(var i = 0; i < emotes.length; i++) {
            if(list.indexOf(emotes[i]) > -1) {
                continue; // Already in the list
            }

            list.push(emotes[i]);
            var span = $("<span class='listed-emote " +
                         (emotes[i] == "+v" ? "v" : "") + "'>" + emotes[i] +
                         " <a href='#' class='x' tabindex='0'>x</a></span>");
            input.before(span);
        }
    }

    // Handle X buttons
    $(document).on("click", ".x", function(event) {
        var anchor = $(this);
        var emote = anchor.parent().parent().find(".name").text();
        var name = anchor.parent().text().slice(0, -1).trim(); // Nasty hack
        var list = tags[emote];
        var span = $(this).parent();

        event.preventDefault();
        var index = list.indexOf(name);
        list.splice(index, 1);
        span.remove();
    })

    // Defer focus
    $(document).on("click", ".emote-list-container", function(event) {
        $(this).find(".emote-list-input").focus();
    });

    // Handle enter/backspace specially. Remember that keydown sees the input
    // as it was *before* the key is handled by the browser.
    $(document).on("keydown", ".emote-list-input", function(event) {
        var input = $(this);
        var name = input.parent().find(".name").text();
        var list = tags[name];
        if(list === undefined) {
            tags[name] = list = [];
        }

        if(event.keyCode === 8) { // Backspace
            if(!input.val() && list.length) {
                // Empty input means chop off the last item
                var index = list.length - 1;
                $(input.parent().find(".listed-emote")[index]).remove();

                list.splice(index, 1);
            }
        } else if(event.keyCode === 13 || event.keyCode === 9 || event.keyCode === 32) {
            // Return, tab, and space keys
            var emotes = parse_input(input);
            insert_emotes(input, list, emotes);
            input.val("");
        }
    });

    // Handle commas
    $(document).on("input", ".emote-list-input", function(event) {
        var input = $(this);
        var name = input.parent().find(".name").text();
        var list = tags[name];
        var emotes = parse_input(input);
        var text = input.val();
        if(text[text.length - 1] === ",") {
            input.val("");
        } else {
            input.val(emotes.pop() || "");
        }
        insert_emotes(input, list, emotes);
    });

    // Non fancy-input stuff
    $("#save").submit(function(event) {
        console.log("Writing tags");
        console.log("data = " + JSON.stringify(tags));
        $("#tags").val(JSON.stringify(tags));
    });

    $("#batch-go").click(function(event) {
        var tag_name = $("#batch-tag").val();
        var regexp = RegExp($("#batch-regexp").val());
        $(".name").each(function(i) {
            var name = $(this).text();
            if(regexp.test(name)) {
                var input = $(this).parent().find(".emote-list-input");
                var list = tags[name];
                if(list === undefined) {
                    tags[name] = list = [];
                }
                insert_emotes(input, list, [tag_name]);
            }
        });
    });
}

function main() {
    window.addEventListener("DOMContentLoaded", function() {
        run();
    }, false);
}

main();
