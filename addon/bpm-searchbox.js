// Whether or not we're running on Reddit's .compact display, i.e. their mobile
// version. We modify the search box UI a fair bit to compensate in this case.
//
// i.reddit.com is another way to get the compact UI. Occasionally it'll
// redirect users to .compact links, but in the meantime we need to work
// correctly there as well.
var is_compact = ends_with(document.location.pathname, ".compact") ||
                 document.location.hostname.split(".").indexOf("i") > -1;

// Search box elements
var sb_container = null;
var sb_dragbox = null;
var sb_tagdropdown = null;
var sb_input = null;
var sb_resultinfo = null;
var sb_close = null;
var sb_tabframe = null;
var sb_results = null;
var sb_helptab = null;
var sb_helplink = null;
var sb_flagtab = null;
var sb_flaglink = null;
var sb_optionslink = null;
var sb_resize = null;
var sb_global_icon = null; // Global << thing

var sb_firstrun = false; // Whether or not we've made any search at all yet
var current_sb_tab = null;

/*
 * Sets up the search box for use on a page, either Reddit or the top-level
 * frame, globally. Also injects the global icon, though it doesn't initialize
 * it.
 */
function init_search_box(store) {
    log_debug("Initializing search box");
    inject_search_box();
    init_search_ui(store);
}

/*
 * Builds and injects the search box HTML.
 */
function inject_search_box() {
    // Placeholder div to create HTML in
    var div = document.createElement("div");
    // I'd sort of prefer display:none, but then I'd have to override it
    div.style.visibility = "hidden";
    div.id = "bpm-stuff"; // Just so it's easier to find in an elements list
    
    //We need to put a blank target on all links in the discord client.
    //If not, it opens the link in the client and destroys Discord
    var blankTarget = ' target="_blank"';
    var insertTarget = platform == "discord-ext";

    // NOTE: Do not add elements to this without first considering whether or
    // not they need to have "visibility: inherit;" in bpmotes.css. It probably
    // does. See the note there.
    var htmlArray = [
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
            '<div id="bpm-sb-flagtab">',
              '<p class="bpm-sb-flag">You can add various flags onto emotes to ',
              'change their appearance or behavior using the syntax of <code>',
              '[](/emote-flag)</code>. Also, multiple flags can be added per emote.</p>',
              '<p class="bpm-sb-flag">For instance, <code class="bpm-sb-noconvert-flutterwink">',
              '</code> generates <a class="bpm-emote bpflag-invert bpflag-in ',
              'bpmote-flutterwink"></a>.</p>',
              '<p class="bpm-sb-flag">If you need to type an emote in the middle of the sentence, like -> <a class="bpm-emote bpflag-in bpmote-pinkieooh"></a> <- this, use the <code>-in</code> flag.</p>',
              '<p class="bpm-sb-flag">If you need to have an emote towards the right side of your comment, use the flag <code>-ar</code>.<a class="bpm-emote bpflag-ar bpflag-in bpmote-smooze"></a></p>',
              '<p class="bpm-sb-flag">Most of the other flags that can be used are listed',
              ' below:</p><br><br><br><br>',
              '<center>Basics:</center>',
               '<center><table class="bpflagtable">',
                 '<tr>',
                   '<th class="bpflagtable-031e"><a class="bpm-emote bpflag-in bpflag-r bpmote-twibeam"></a><br><center><code>-r</code></center></th>',
                   '<th class="bpflagtable-031e"><a class="bpm-emote bpflag-in bpflag-d bpmote-twibeam"></a><br><center><code>-d</code></center></th>',
                   '<th class="bpflagtable-031e"><a class="bpm-emote bpflag-in bpflag-f bpmote-twibeam"></a><br><center><code>-f</code></center></th>',
                   '<th class="bpflagtable-031e"><a class="bpm-emote bpflag-in bpflag-45 bpmote-twibeam"></a><br><center><code>-45</code></center></th>',
                   '<th class="bpflagtable-031e"><a class="bpm-emote bpflag-in bpflag-m bpmote-twibeam"></a><br><center><code>-m</code></center></th>',
                 '</tr>',
               '</table></center><br>',
               '<center>Colouring:</center>',
                '<center><table class="bpflagtable">',
                  '<tr>',
                    '<th class="bpflagtable-031e"><a class="bpm-emote bpflag-in bpflag-i bpmote-derpyshock"></a><br><center><code>-i</code></center></th>',
                    '<th class="bpflagtable-031e"><a class="bpm-emote bpflag-in bpflag-invert bpmote-derpyshock"></a><br><center><code>-invert</code></center></th>',
                    '<th class="bpflagtable-031e"><a class="bpm-emote bpflag-in bpflag-mono bpmote-derpyshock"></a><br><center><code>-mono</code></center></th>',
                    '<th class="bpflagtable-031e"><a class="bpm-emote bpflag-in bpflag-sepia bpmote-derpyshock"></a><br><center><code>-sepia</code></center></th>',
                    '<th class="bpflagtable-031e"><a class="bpm-emote bpflag-in bpflag-blur bpmote-derpyshock"></a><br><center><code>-blur</code></center></th>',
                  '</tr>',
                '</table></center><br>',
                '<center>Animated:</center>',
                 '<center><table class="bpflagtable">',
                   '<tr>',
                     '<th class="bpflagtable-031e"><a class="bpm-emote bpflag-in bpflag-spin bpmote-happyluna"></a><br><center><code>-spin</code></center></th>',
                     '<th class="bpflagtable-031e"><a class="bpm-emote bpflag-in bpflag-_excl_spin bpmote-happyluna"></a><br><center><code>-!spin</code></center></th>',
                     '<th class="bpflagtable-031e"><a class="bpm-emote bpflag-in bpflag-xspin bpmote-happyluna"></a><br><center><code>-xspin</code></center></th>',
                     '<th class="bpflagtable-031e"><a class="bpm-emote bpflag-in bpflag-yspin bpmote-happyluna"></a><br><center><code>-yspin</code></center></th>',
                  '</tr>',
                  '<tr>',
                    '<th class="bpflagtable-031e"><a class="bpm-emote bpflag-in bpflag-zspin bpmote-happyluna"></a><br><center><code>-zspin</code></center></th>',
                    '<th class="bpflagtable-031e"><a class="bpm-emote bpflag-in bpflag-_excl_zspin bpmote-happyluna"></a><br><center><code>-!zspin</code></center></th>',
                    '<th class="bpflagtable-031e"><a class="bpm-emote bpflag-in bpflag-wobble bpmote-happyluna"></a><br><center><code>-wobble</code></center></th>',
                    '<th class="bpflagtable-031e"><a class="bpm-emote bpflag-in bpflag-intensifies bpmote-happyluna"></a><br><center><code>-intensifies</code></center></th>',
                 '</tr>',
                 '</table></center><br>',
                 '<center>Sliding:</center>',
                  '<center><table class="bpflagtable">',
                      '<tr><th style="table-layout:fixed;width:350px;" class="bpflagtable-031e"><a class="bpm-emote bpflag-in bpflag-slide bpmote-rdwut"></a><br><center><code>-slide</code></center></th></tr>',
                      '<tr><th style="table-layout:fixed;width:350px;" class="bpflagtable-031e"><a class="bpm-emote bpflag-in bpflag-_excl_slide bpmote-rdwut"></a><br><center><code>-!slide</code></center></th></tr>',
                      '<tr><th style="table-layout:fixed;width:350px;" class="bpflagtable-031e"><a class="bpm-emote bpflag-in bpflag-shift bpmote-rdwut"></a><br><center><code>-shift</code></center></th></tr>',
                      '<tr><th style="table-layout:fixed;width:350px;" class="bpflagtable-031e"><a class="bpm-emote bpflag-in bpflag-_excl_shift bpmote-rdwut"></a><br><center><code>-!shift</code></center></th></tr>',
                  '</table></center><br>',
                  '<center>Text (use with <code class="bpm-sb-noconvert-txt"></code>):</center>',
                   '<center><table class="bpflagtable">',
                     '<tr>',
                       '<th class="bpflagtable-031e"><center><a style="color:black" class="bpm-emote bpmote-txt_excl bpflag-blink_excl_">yay.</a></center><br><center><code>-blink!</code></center></th>',
                       '<th class="bpflagtable-031e"><center><a style="color:black" class="bpm-emote bpmote-txt_excl bpflag-comicsans_excl_">yay.</a></center><br><center><code>-comicsans!</code></center></th>',
                       '<th class="bpflagtable-031e"><center><a style="color:black" class="bpm-emote bpmote-txt_excl bpflag-impact_excl_">yay.</a></center><br><center><code>-impact!</code></center></th>',
                       '<th class="bpflagtable-031e"><center><a style="color:black" class="bpm-emote bpmote-txt_excl bpflag-tahoma_excl_">yay.</a></center><br><center><code>-tahoma!</code></center></th>',
                       '<th class="bpflagtable-031e"><center><a style="color:black" class="bpm-emote bpmote-txt_excl bpflag-papyrus_excl_">yay.</a></center><br><center><code>-papyrus!</code></center></th>',
                       '<th class="bpflagtable-031e"><center><a style="color:black" class="bpm-emote bpmote-txt_excl bpflag-center">yay.</a></center><br><center><code>-center</code></center></th>',
                       '</tr>',
                   '</table></center><br>',
                   '<br><a class="bpm-emote bpflag-spin bpflag-s1 bpmote-zecora"></a><p class="bpm-sb-flag">Intensity and speed modifiers allow you to modify how flags work and appear. For example, <code class="bpm-sb-noconvert-zecora"></code> would make the emote spin very fast (see left).<br>The examples below demonstrate the least and most intense of the modification flags.</p>',
                   '<br><br><center>Intensity/Speed Modifiers:</center>',
                    '<center><table class="bpflagtable">',
                        '<tr><th style="table-layout:fixed;width:350px;" class="bpflagtable-031e"><a class="bpm-emote bpflag-in bpflag-s1 bpflag-slide bpmote-gummystare"></a><br><center><code>-s1 and -slide</code></center></th></tr>',
                        '<tr><th style="table-layout:fixed;width:350px;" class="bpflagtable-031e"><a class="bpm-emote bpflag-in bpflag-s15 bpflag-_excl_slide bpmote-gummystare"></a><br><center><code>-s15 and -slide</code></center></th></tr>',
                        '</table><table class="bpflagtable"><tr><th style="table-layout:fixed;width:170px;" class="bpflagtable-031e"><center><a class="bpm-emote bpflag-in bpflag-blur1 bpmote-gummystare"></a></center><br><center><code>-blur1</code></center></th>',
                        '<th style="table-layout:fixed;width:170px;" class="bpflagtable-031e"><center><a class="bpm-emote bpflag-in bpflag-blur8 bpmote-gummystare"></a></center><br><center><code>-blur8</code></center></th></tr>',
                    '</table></center><br>',
            '</div>',
          '</div>',
          '<div id="bpm-sb-bottomrow">',
            '<a id="bpm-sb-helplink" href="javascript:void(0)">search help</a> | ',
            '<a id="bpm-sb-flaglink" href="javascript:void(0)">flags help</a> | ',
            '<a id="bpm-sb-optionslink" href="javascript:void(0)">bpm options</a>',
            '<span id="bpm-sb-resize"></span>',
            '<a id="bpm-sb-srlink"' + (insertTarget ? blankTarget : '') + ' href="https://www.reddit.com/r/betterponymotes">/r/betterponymotes</a>',
          '</div>',
        '</div>'
        ];
    if(platform != "discord-ext") {
        htmlArray.push('<div id="bpm-global-icon" title="Hold Ctrl (Command/Meta) to drag"></div>');
    }

    var html = htmlArray.join("");
    div[IHTML] = html;
    document.body.appendChild(div);

    // This seems to me a rather lousy way to build HTML, but oh well
    sb_container = document.getElementById("bpm-sb-container");
    sb_dragbox = document.getElementById("bpm-sb-dragbox");
    sb_input = document.getElementById("bpm-sb-input");
    sb_tagdropdown = document.getElementById("bpm-sb-tagdropdown");
    sb_resultinfo = document.getElementById("bpm-sb-resultinfo");
    sb_close = document.getElementById("bpm-sb-close");
    sb_tabframe = document.getElementById("bpm-sb-tabframe");
    sb_results = document.getElementById("bpm-sb-results");
    sb_helptab = document.getElementById("bpm-sb-helptab");
    sb_helplink = document.getElementById("bpm-sb-helplink");
    sb_flagtab = document.getElementById("bpm-sb-flagtab");
    sb_flaglink = document.getElementById("bpm-sb-flaglink");
    sb_optionslink = document.getElementById("bpm-sb-optionslink");
    sb_resize = document.getElementById("bpm-sb-resize");

    sb_global_icon = document.getElementById("bpm-global-icon");

    if(is_compact) {
        sb_container.classList.add("bpm-compact");
    }
}

/*
 * Sets up the emote search box.
 */
function init_search_ui(store) {
    current_sb_tab = sb_results;

    /*
     * Intercept mouse over for the entire search widget, so we can remember
     * which form was being used before.
     */
    sb_container.addEventListener("mouse" + "over", catch_errors(function(event) {
        track_focus();
    }), false);

    // Close it on demand
    sb_close.addEventListener("click", catch_errors(function(event) {
        hide_search_box();
    }), false);

    // Another way to close it
    sb_container.addEventListener("keyup", catch_errors(function(event) {
        if(event.keyCode === 27) { // Escape key
            hide_search_box();
        }
    }), false);

    // Default behavior of the escape key in the search input is to clear
    // it, which we don't want.
    sb_input.addEventListener("keydown", catch_errors(function(event) {
        if(event.keyCode === 27) { // Escape key
            event.preventDefault();
        }
    }), false);

    // Listen for keypresses and adjust search results. Delay 500ms after
    // end of typing to make it more responsive.
    var timeout = null;
    sb_input.addEventListener("input", catch_errors(function(event) {
        if(timeout !== null) {
            clearTimeout(timeout);
        }
        timeout = ST(catch_errors(function() {
            // Re-enable searching as early as we can, just in case
            timeout = null;
            update_search_results(store);
        }), 500);
    }), false);

    // Listen for clicks
    sb_results.addEventListener("click", catch_errors(function(event) {
        if(event.target.classList.contains("bpm-search-result")) {
            // .dataset would probably be nicer, but just in case...
            var emote_name = event.target.getAttribute("data-emote");
            //In discord we'd like to handle this case specially
            if(platform == "discord-ext") {
               _send_discord_message("insert_emote", { emote: emote_name }); 
            } else {
                inject_emote(store, emote_name);
            }
            // On compact display, we want to get out of the way as soon as
            // possible. (Might want to default to this on standard display too,
            // but we're not so offensively invasive there.)
            if(is_compact) {
                hide_search_box();
            }
        }
    }), false);

    // Listen for the "help" tab link
    sb_helplink.addEventListener("click", catch_errors(function(event) {
        if(current_sb_tab !== sb_helptab) {
            switch_to_sb_tab(sb_helptab);
        } else {
            switch_to_sb_tab(sb_results);
        }
    }), false);

    // Listen for the "flag" tab link
    sb_flaglink.addEventListener("click", catch_errors(function(event) {
        if(current_sb_tab !== sb_flagtab) {
            switch_to_sb_tab(sb_flagtab);
        } else {
            switch_to_sb_tab(sb_results);
        }
    }), false);

    // Set up the options page link
    linkify_options(sb_optionslink);

    // Focusing input switches to results tab
    sb_input.addEventListener("focus", catch_errors(function(event) {
        switch_to_sb_tab(sb_results);
    }), false);

    // Set up default positions. NOTE: The container size we set doesn't matter
    // in compact mode. As soon as we open the box, it goes fullscreen anyway.
    var sizeinfo = store.prefs.searchBoxInfo;
    if(is_compact) {
        set_sb_position(0, 0);
    } else {
        set_sb_position(sizeinfo[0], sizeinfo[1]);
        set_sb_size(sizeinfo[2], sizeinfo[3]);
    }
    if(platform != "discord-ext") {
        sb_global_icon.style.left = store.prefs.globalIconPos[0] + "px";
        sb_global_icon.style.top = store.prefs.globalIconPos[1] + "px";
    }

    // Enable dragging the window around
    make_movable(sb_dragbox, sb_container, function(event, left, top, move) {
        move();
        store.prefs.searchBoxInfo[0] = left;
        store.prefs.searchBoxInfo[1] = top;
        store.sync_key("searchBoxInfo");
    });

    // Keep the searchbox on the window
    keep_on_window(sb_container);

    window.addEventListener("resize", catch_errors(function(event) {
        keep_on_window(sb_container);
    }), false);

    // Enable dragging the resize element around (i.e. resizing it)
    var search_box_width, search_box_height;
    enable_drag(sb_resize, function(event) {
        search_box_width = parseInt(sb_container.style.width ? sb_container.style.width : 620, 10);
        search_box_height = parseInt(sb_container.style.height ? sb_container.style.height : 450, 10);
    }, function(event, dx, dy) {
        // 420px wide prevents the search box from collapsing too much, and
        // the extra 5px is to prevent the results div from vanishing (which
        // sometimes kills Opera),
        var sb_width = Math.max(dx + search_box_width, 420);
        var sb_height = Math.max(dy + search_box_height, 62+5);

        set_sb_size(sb_width, sb_height);

        store.prefs.searchBoxInfo[2] = sb_width;
        store.prefs.searchBoxInfo[3] = sb_height;
        store.sync_key("searchBoxInfo");
    });

    // Set up the tag dropdown menu
    var option = document.createElement("option");
    option.value = "";
    option.text = "Tags";
    option.setAttribute("selected", null);
    sb_tagdropdown.add(option);
    for (var id in store._tag_array) {
        var option = document.createElement("option");
        option.value = store._tag_array[id];
        option.text = option.value.substring(1);
        sb_tagdropdown.add(option);
    }
    sb_tagdropdown.onchange = function(){
        sb_input.value = sb_input.value + " " + sb_tagdropdown.value;
        sb_tagdropdown.selectedIndex = "0"
        update_search_results(store);
    };

    // If used on Voat, add the CSS classes for either Light or Dark mode,
    // making use of the native bootstrap classes where apropriate.
    if (is_voat) {
        sb_input.classList.add("form-control");
        if (document.body.classList.contains("dark")) {
            sb_container.classList.add("bpm-dark");
            sb_tabframe.classList.add("bpm-dark");
        }
    }

    // If used on Reddit, and RES enables nightmode, change the theme
    // of BPM accordingly, similarly to how it is with Voat.
    if (is_reddit) {
        if (document.body.classList.contains("res-nightmode")) {
            sb_container.classList.add("bpm-dark");
            sb_tabframe.classList.add("bpm-dark");
        }
    }
}

function set_sb_position(left, top) {
    sb_container.style.left = left + "px";
    sb_container.style.top = top + "px";
}

function set_sb_size(width, height) {
    // 12 and 7 are compensation for container margins/border/padding. Source
    // values are hardcoded in CSS.
    sb_container.style.width = (width - 12) + "px";
    sb_container.style.height = (height - 7) + "px";
    // 62: compensation for top row, bottom row, and various margins (inc.
    // padding of tabframe itself).
    sb_tabframe.style.height = (height - 70) + "px";
    if(is_compact) {
        // 61: width of top row minus close button and various margins (results
        // text and dragbox are not present). Take up all remaining space.
        sb_input.style.width = (width - 61) + "px";
    }
}

/*
 * Initializes the global ">>" emotes icon.
 */
function setup_global_icon(store) {
    if(platform == "discord-ext") {
        setup_discord_search(store);    
        return;
    }

    log_debug("Injecting global search icon");
    sb_global_icon.addEventListener("mouse" + "over", catch_errors(function(event) {
        track_focus();
    }), false);

    // Enable dragging the global button around
    make_movable(sb_global_icon, sb_global_icon, function(event, left, top, move) {
        if(!event.ctrlKey && !event.metaKey) {
            return;
        }
        move();
        store.prefs.globalIconPos[0] = left;
        store.prefs.globalIconPos[1] = top;
        store.sync_key("globalIconPos");
    });

    sb_global_icon.style.visibility = "visible";

    sb_global_icon.addEventListener("click", catch_errors(function(event) {
        // Don't open at the end of a drag (only works if you release the
        // mouse button before the ctrl/meta key though...)
        if(!event.ctrlKey && !event.metaKey) {
            show_search_box(store);
        }
    }), false);
}
/**
 * Discord-specific search setup
 **/
function setup_discord_search(store) {
    function setup_button(button) {
        button.addEventListener("click", function(e) {
            e.preventDefault();
            show_search_box(store);
        });
    }
    function wait_for_button(callback) {
        var bpmButton = document.getElementsByClassName("bpm-emote-search-button");
        if(bpmButton.length < 1) {
            window.setTimeout(function() { wait_for_button(callback); }, 100);
        } else {
            callback(bpmButton[0]);
        }
    }
    wait_for_button(setup_button);
}

/*
 * Displays the search box.
 */
function show_search_box(store) {
    sb_container.style.visibility = "visible";
    sb_input.focus();
    switch_to_sb_tab(sb_results);

    if(is_compact) {
        // In compact mode, we force it to be fullscreen. We do that here in
        // case the size has changed since last time (i.e. on page load, a
        // scrollbar will appear).
        set_sb_size(document.documentElement.clientWidth, document.documentElement.clientHeight);
    }

    // If we haven't run before, go search for things
    if(!sb_firstrun) {
        sb_firstrun = true;
        sb_input.value = store.prefs.lastSearchQuery;
        update_search_results(store);
    }
}

function hide_search_box() {
    sb_container.style.visibility = "hidden";
    sb_flagtab.style.display = "none"; //Needed to make the "flags help" tab a) not lag when unused and b) display properly.
    // TODO: possibly clear out the search results, since it's a large pile
    // of HTML.
    if(target_form) {
        target_form.focus();
    }
}

function switch_to_sb_tab(tab) {
    var tabs = [sb_results, sb_helptab, sb_flagtab];
    for(var i = 0; i < tabs.length; i++) {
        tabs[i].style.display = "none";
    }
    tab.style.display = "block";
    current_sb_tab = tab;
}

/*
 * Updates the search results window according to the current query.
 */
function update_search_results(store) {
    // Split search query on spaces, remove empty strings, and lowercase terms
    var terms = sb_input.value.split(" ").map(function(v) { return v.toLowerCase(); });
    terms = terms.filter(function(v) { return v; });
    store.prefs.lastSearchQuery = terms.join(" ");
    store.sync_key("lastSearchQuery");

    // Check this before we append the default search terms.
    if(!terms.length) {
        // If we're on a subreddit that has some of its own emotes, show those
        // instead of nothing.
        if(current_subreddit && sr_name2id[current_subreddit] !== undefined) {
            terms = [current_subreddit];
        } else {
            sb_results[IHTML] = "";
            sb_resultinfo.textContent = "";
            return;
        }
    }

    // This doesn't work quite perfectly- searching for "+hidden" should
    // theoretically just show all hidden emotes, but it just ends up
    // cancelling into "-nonpony", searching for everything.
    terms.unshift("-hidden", "-nonpony");
    var query = parse_search_query(terms);
    // Still nothing to do
    if(query === null) {
        sb_results[IHTML] = "";
        sb_resultinfo.textContent = "";
        return;
    }

    var results = execute_search(store, query);
    log_debug("Search found", results.length, "results on query", query);
    display_search_results(store, results);
}

/*
 * Converts search results to HTML and displays them.
 */
function display_search_results(store, results) {
    // We go through all of the results regardless of search limit (as that
    // doesn't take very long), but stop building HTML when we reach enough
    // shown emotes.
    //
    // As a result, NSFW/disabled emotes don't count toward the result.
    var html = "";
    var shown = 0;
    var hidden = 0;
    var prev = null;
    var actual_results = results.length;
    for(var i = 0; i < results.length; i++) {
        var result = results[i];
        if(prev === result.name) {
            actual_results--;
            continue; // Duplicates can appear when following +v emotes
        }
        prev = result.name;

        if(store.is_disabled(result)) {
            // TODO: enable it anyway if a pref is set? Dunno exactly what
            // we'd do
            hidden += 1;
            continue;
        }

        if(shown >= store.prefs.searchLimit) {
            continue;
        } else {
            shown += 1;
        }

        // Use <span> so there's no chance of emote parse code finding
        // this.
        html += "<span data-emote=\"" + result.name + "\" class=\"bpm-search-result bpm-emote " +
                result.css_class + "\" title=\"" + result.name + " from " + result.source_name + "\">";
        if(result.tags.indexOf(store.formatting_tag_id) > -1) {
            html += "Example Text";
        }
        html += "</span>";
    }

    sb_results[IHTML] = html;

    var hit_limit = shown + hidden < actual_results;
    // Format text: "X results (out of N, Y hidden)"
    var text = shown + " results";
    if(hit_limit || hidden) { text += " ("; }
    if(hit_limit)           { text += "out of " + actual_results; }
    if(hit_limit && hidden) { text += ", "; }
    if(hidden)              { text += hidden + " hidden"; }
    if(hit_limit || hidden) { text += ")"; }
    sb_resultinfo.textContent = text;
}

/*
 * Injects the "emotes" button onto Reddit.
 */
function inject_emotes_button(store, usertext_edits) {
    for(var i = 0; i < usertext_edits.length; i++) {
        var existing = usertext_edits[i].getElementsByClassName("bpm-search-toggle");
        var textarea = usertext_edits[i].getElementsByTagName("textarea")[0];
        /*
         * Reddit's JS uses cloneNode() when making reply forms. As such,
         * we need to be able to handle two distinct cases- wiring up the
         * top-level reply box that's there from the start, and wiring up
         * clones of that form with our button already in it.
         */
        if(existing.length) {
            wire_emotes_button(store, existing[0], textarea);
        } else {
            var button = document.createElement("button");
            // Default is "submit", which is not good (saves the comment).
            // Safari has some extremely weird bug where button.type seems to
            // be readonly. Writes fail silently.
            button.setAttribute("type", "button");
            button.classList.add("bpm-search-toggle");
            if(is_compact) {
                // Blend in with the other mobile buttons
                button.classList.add("newbutton");
            } else if(is_modreddit) {
                // Blend in with the other modmail buttons
                button.classList.add("Button");
            } else if(is_voat) {
                button.classList.add("markdownEditorImgButton");
                button.classList.add("bpm-voat");
            }
            button.textContent = "emotes";
            // Since we come before the save button in the DOM, we tab first,
            // but this is generally annoying. Correcting this ideally would
            // require moving or editing the save button, which I'd rather not
            // do.
            //
            // So instead it's just untabbable.
            button.tabIndex = 100;
            wire_emotes_button(store, button, textarea);
            // On the standard display, we want the emotes button to be all the
            // way to the right, next to the "formatting help" link. However,
            // this breaks rather badly on .compact display (sort of merging
            // into it), so do something different there.
            // If in modmail, have it on the left instead.
            // If on voat, do something completely different.
            if (is_reddit) {
                if(is_compact) {
                    var button_bar = find_class(usertext_edits[i], "usertext-buttons");
                    button_bar.insertBefore(button, find_class(button_bar, "status"));
                } else {
                    var bottom_area = find_class(usertext_edits[i], "bottom-area");
                    bottom_area.insertBefore(button, bottom_area.firstChild);
                }
            } else if (is_modreddit) {
                if (ends_with(document.location.pathname, "create")) {
                    var button_bar = find_class(usertext_edits[i], "NewThread__submitRow");
                    button_bar.insertBefore(button, find_class(button_bar, "NewThread__formattingHelp"));
                } else {
                    var button_bar = find_class(usertext_edits[i], "ThreadViewerReplyForm__replyFooter");
                    button_bar.insertBefore(button, find_class(button_bar, "ThreadViewerReplyForm__formattingHelp"));
                }
            } else if (is_voat) {
                var editbar = find_class(usertext_edits[i], "markdownEditorMainMenu");
                editbar.appendChild(button);
            }
        }
    }
}

/*
 * Sets up one particular "emotes" button.
 */
function wire_emotes_button(store, button, textarea) {
    button.addEventListener("mouse" + "over", catch_errors(function(event) {
        track_focus();
    }), false);

    button.addEventListener("click", catch_errors(function(event) {
        if(sb_container.style.visibility !== "visible") {
            show_search_box(store);
            if(!target_form) {
                target_form = textarea;
            }
        } else {
            hide_search_box();
        }
    }), false);
}
