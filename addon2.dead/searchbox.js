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

function SearchBox() {
    this._create();
    this._init();
}

SearchBox.prototype._create = function() {
    var d = parse_html([
        // tabindex is a hack to make Esc work. Reddit uses this index in a
        // couple of places, so it's probably safe.
        '<div id="bpm-sb-container" tabindex="100">',
          '<div id="bpm-sb-toprow">',
            '<span id="bpm-sb-dragbox"></span>',
            '<select id="bpm-sb-tagdropdown" onchange="">',
            '<input id="bpm-sb-input" type="search" placeholder="Search"/>',
            '<span id="bpm-sb-resultinfo"></span>',
            '<span id="bpm-sb-close"></span>',
          '</div>',
          '<div id="bpm-sb-tabframe">',
            '<div id="bpm-sb-results"></div>',
            '<div id="bpm-sb-helptab">',
              '<p class="bpm-sb-help">Simple search terms will show you ',
                'emotes with names that match: for instance, <code>"aj"',
                '</code> will find all emotes with <code>"aj"</code> in ',
                'their names. If you use more than one term, all of them ',
                'must match to return an emote.</p>',
              '<p class="bpm-sb-help">You can filter by subreddit with the ',
                'special syntaxes <code>"r/subreddit"</code> and <code>"sr:',
                'subreddit"</code>. Using more than one such filter returns ',
                'results from each of them.</p>',
              '<p class="bpm-sb-help">All emotes are tagged according to ',
                'their contents, and these can be searched on like <code>',
                '"+twilightsparkle"</code>. Most show characters have their ',
                'own tags that can be easily guessed, and some classes of ',
                '"themed" emotes also have tags. You can also negate tags ',
                'with <code>"-fluttershy"</code> to remove emotes from the ',
                'results.</p>',
              '<p class="bpm-sb-help">Some emotes are hidden by default. ',
                'Use <code>"+nonpony"</code> to see them.</p>',
            '</div>',
          '</div>',
          '<div id="bpm-sb-bottomrow">',
            '<a id="bpm-sb-helplink" href="javascript:void(0)">help</a> | ',
            '<a id="bpm-sb-optionslink" href="javascript:void(0)">bpm options</a>',
            '<span id="bpm-sb-resize"></span>',
            '<a id="bpm-sb-srlink" href="https://www.reddit.com/r/betterponymotes">/r/betterponymotes</a>',
          '</div>',
        '</div>',
        ].join(""));

    var $ = function(id) {
        return d.getElementById(id);
    };

    this.sb = {
        container: $("bpm-sb-container"),
        dragbox: $("bpm-sb-dragbox"),
        tagdropdown: $("bpm-sb-tagdropdown"),
        input: $("bpm-sb-input"),
        resultinfo: $("bpm-sb-resultinfo"),
        close: $("bpm-sb-close"),
        tabframe: $("bpm-sb-tabframe"),
        results: $("bpm-sb-results"),
        helptab: $("bpm-sb-helptab"),
        helplink: $("bpm-sb-helplink"),
        optionslink: $("bpm-sb-optionslink"),
        resize: $("bpm-sb-resize")
    };

    if(is_compact) {
        this.sb.container.classList.add("bpm-compact");
    }
};

SearchBox.prototype._init = function(sb) {
    this.current_tab = this.sb.results;

    // Keep track of focused input
    this.sb.container.addEventListener("mouseover", function(event) {
        this.track_focus();
    }.bind(this), false);

    // Enable close button
    this.sb.close.addEventListener("click", function(event) {
        this.hide();
    }.bind(this), false);

    // Enable esc-to-close
    this.sb.container.addEventListener("keyup", function(event) {
        if(event.keyCode === 27) { // Escape key
            this.hide();
        }
    }.bind(this), false);

    // Ignore escape key in search input
    this.sb.input.addEventListener("keydown", function(event) {
        if(event.keyCode === 27) { // Escape key
            event.preventDefault();
        }
    }.bind(this), false);

    // Actual search
    this.sb.input.addEventListener("input", debounce(500, function(event) {
        this.update();
    }.bind(this)), false);

    // Click to inject
    this.sb.results.addEventListener("click", function(event) {
        if(event.target.classList.contains("bpm-search-result")) {
            var name = event.target.getAttribute("data-emote");
            _inject_emote(store, name);

            // On compact display, want to get out of the way as soon as we can.
            if(is_compact) {
                this.hide();
            }
        }
    }.bind(this), false);

    // Help tab link
    this.sb.helplink.addEventListener("click", function(event) {
        if(this.current_tab !== this.sb.helptab) {
            this.activate_tab(this.sb.helptab);
        } else {
            this.activate_tab(this.sb.results);
        }
    }.bind(this), false);

    // Options page link
    this.sb.optionslink.addEventListener("click", function(event) {
        browser.open_options_page();
    }.bind(this), false);

    // Clicking to input box focuses results tab
    this.sb.input.addEventListener("focus", function(event) {
        this.activate_tab(sb.results);
    }.bind(this), false);
};

SearchBox.prototype.inject = function() {
    document.body.appendChild(this.sb.container);
};

SearchBox.prototype.track_focus = function() {
    console.log("STUB: SearchBox.track_focus");
};

SearchBox.prototype.hide = function() {
    console.log("STUB: SearchBox.hide");
};

SearchBox.prototype.update = function() {
    console.log("STUB: SearchBox.update");
};

SearchBox.prototype.activate_tab = function() {
    console.log("STUB: SearchBox.activate_tab");
};
