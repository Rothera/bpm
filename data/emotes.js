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

/*
 * How this works: emotes is a global mapping of emote names (including the
 * initial /, e.g. "/rdhappy") to a CSS dict. There's a couple of functions to
 * make it easy to add emotes to it in bulk, and that's about it for now.
 */

var emotes = {};

/*
 * Adds an entire emote grid sheet in one go.
 *
 * common: any CSS that must be specified for each emote. At a minimum this
 *     typically must include a background-image.
 * emote_width: the width of each emote in the grid. For r/mlp, typically 50 or 70.
 * emote_height: the height of each emote in the grid.
 * grid_width: how many emotes wide the image is.
 * grid_height: how many emotes high the imag eis.
 * emote_list: a triply-nested list of emote names. Its layout mimics the layout
 *     of the image itself, where each element is a list of aliases for the
 *     same emote. For instance, a 2x2 emote sheet might be:
 *
 *         [[["topleft", "00"], ["topright", "10"]],
 *          [["bottomleft", "01"], ["bottomright", "11"]]]
 */
function add_sheet(common, emote_width, emote_height, grid_width, grid_height, emote_list) {
    jQuery.extend(common, {
        "display": "block",
        "clear": "none",
        "float": "left",
        "width": emote_width + "px",
        "height": emote_height + "px"
    });
    for(var x = 0; x < grid_width; x++) {
        for(var y = 0; y < grid_height; y++) {
            var aliases = emote_list[y][x]; // Careful!
            var position = "-" + x*emote_width + "px -" + y*emote_height + "px";
            aliases.forEach(function(name) {
                emotes[name] = jQuery.extend({"background-position": position}, common);
            });
        }
    }
}

/*******************************************************************************
**
** R/MYLITTLEPONY
**
*******************************************************************************/

// A sheet
add_sheet({"background-image": "url(http://b.thumbs.redditmedia.com/DW12xf1EuQi8VRcI.png)"}, 70, 70, 3, 10, [
    [["/a00", "/ajlie"], ["/a10", "/priceless"], ["/a20", "/flutterjerk"]],
    [["/a01", "/twipride"], ["/a11", "/celestiamad"], ["/a21", "/twicrazy"]],
    [["/a02", "/lunateehee"], ["/a12", "/lunawait"], ["/a22", "/paperbagderpy", "/paperbagwizard", "/derpwizard"]],
    [["/a03", "/ajhappy", "/happlejack"], ["/a13", "/ppfear"], ["/a23", "/twibeam"]],
    [["/a04", "/raritydaww"], ["/a14", "/scootacheer", "/lootascoo"], ["/a24", "/swagintosh"]], // /swagintosh is overridden later
    [["/a05", "/ajsup", "/ajwhatsgood"], ["/a15", "/flutterwhoa", "/flutterwoah"], ["/a25", "/rdsad", "/rdcry"]],
    [["/a06", "/ohcomeon", "/sbcomeon"], ["/a16", "/ppcute", "/cutiepie"], ["/a26", "/abbored", "/abmerp"]],
    [["/a07", "/raritypaper", "/raritynews"], ["/a17", "/sbbook", "/sweetiebook"], ["/a27", "/scootaplease", "/scootappeal", "/scootaplz"]],
    [["/a08", "/twiright", "/satistwied"], ["/a18", "/celestiawut", "/wutlestia"], ["/a28", "/grannysmith", "/granny", "/oldmareyellsatcloud"]],
    [["/a09", "/shiningarmor", "/shiningarmour"], ["/a19", "/chrysalis", "/queenchrysalis", "/changlingqueen"], ["/a29", "/cadence", "/cadance", "/princesscadence", "/princesscadance", "/princessmiamorecadenza"]]
    ]);

// Reversed A sheet
// If I were smart, this wouldn't just be a copy&paste.
add_sheet({"background-image": "url(http://c.thumbs.redditmedia.com/QNdAer5mOCS_f1-J.png)"}, 70, 70, 3, 10, [
    [["/ra00", "/rajlie"], ["/ra10", "/rpriceless"], ["/ra20", "/rflutterjerk"]],
    [["/ra01", "/rtwipride"], ["/ra11", "/rcelestiamad"], ["/ra21", "/rtwicrazy"]],
    [["/ra02", "/rlunateehee"], ["/ra12", "/rlunawait"], ["/ra22", "/rpaperbagderpy", "/rpaperbagwizard", "/rderpwizard"]],
    [["/ra03", "/rajhappy", "/rhapplejack"], ["/ra13", "/rppfear"], ["/ra23", "/rtwibeam"]],
    [["/ra04", "/rraritydaww"], ["/ra14", "/rscootacheer", "/rlootascoo"], ["/ra24", "/rswagintosh"]], // /rswagintosh is overridden later
    [["/ra05", "/rajsup", "/rajwhatsgood"], ["/ra15", "/rflutterwhoa", "/rflutterwoah"], ["/ra25", "/rrdsad", "/rrdcry"]],
    [["/ra06", "/rohcomeon", "/rsbcomeon"], ["/ra16", "/rppcute", "/rcutiepie"], ["/ra26", "/rabbored", "/rabmerp"]],
    [["/ra07", "/rraritypaper", "/rraritynews"], ["/ra17", "/rsbbook", "/rsweetiebook"], ["/ra27", "/rscootaplease", "/rscootappeal", "/rscootaplz"]],
    [["/ra08", "/rtwiright", "/rsatistwied"], ["/ra18", "/rcelestiawut", "/rwutlestia"], ["/ra28", "/rgrannysmith", "/rgranny", "/roldmareyellsatcloud"]],
    [["/ra09", "/rshiningarmor", "/rshiningarmour"], ["/ra19", "/rchrysalis", "/rqueenchrysalis", "/rchanglingqueen"], ["/ra29", "/rcadence", "/rcadance", "/rprincesscadence", "/rprincesscadance", "/rprincessmiamorecadenza"]]
    ]);

// Swagintosh is animated, so in a separate image. It's more or less a sheet.
add_sheet({"background-image": "url(http://b.thumbs.redditmedia.com/Kt_jbvLW92C9Fdqg.png)"}, 70, 70, 1, 2, [
    [["/a24", "/swagintosh"]],
    [["/ra24", "/rswagintosh"]]
    ]);

// B sheet
add_sheet({"background-image": "url(http://e.thumbs.redditmedia.com/SdD3wwCBFtlQDVx4.png)"}, 50, 50, 4, 10, [
    [["/b00", "/flutterfear"], ["/b10", "/ppboring"], ["/b20", "/rarityyell"], ["/b30", "/fluttershy"]],
    [["/b01", "/ajcower"], ["/b11", "/ajsly"], ["/b21", "/eeyup"], ["/b31", "/rdsmile"]],
    [["/b02", "/fluttersrs"], ["/b12", "/raritydress"], ["/b22", "/takealetter"], ["/b32", "/rdwut"]],
    [["/b03", "/ppshrug"], ["/b13", "/spikenervous", "/newrainbowdash"], ["/b23", "/noooo"], ["/b33", "/dj", "/threedog"]],
    [["/b04", "/fluttershh"], ["/b14", "/flutteryay"], ["/b24", "/squintyjack"], ["/b34", "/spikepushy"]],
    [["/b05", "/ajugh"], ["/b15", "/raritywut"], ["/b25", "/dumbfabric"], ["/b35", "/raritywhy"]],
    [["/b06", "/trixiesmug"], ["/b16", "/flutterwink"], ["/b26", "/rarityannoyed"], ["/b36", "/soawesome"]],
    [["/b07", "/ajwut"], ["/b17", "/twisquint"], ["/b27", "/raritywhine"], ["/b37", "/rdcool"]],
    [["/b08", "/abwut"], ["/b18", "/manspike"], ["/b28", "/cockatrice"], ["/b38", "/facehoof"]],
    [["/b09", "/rarityjudge"], ["/b19", "/rarityprimp"], ["/b29", "/twirage"], ["/b39", "/ppseesyou"]]
    ]);

// Reversed B sheet
add_sheet({"background-image": "url(http://f.thumbs.redditmedia.com/I7qbwaE3bctckwOk.png)"}, 50, 50, 4, 10, [
    [["/rb00", "/rflutterfear"], ["/rb10", "/rppboring"], ["/rb20", "/rrarityyell"], ["/rb30", "/rfluttershy"]],
    [["/rb01", "/rajcower"], ["/rb11", "/rajsly"], ["/rb21", "/reeyup"], ["/rb31", "/rrdsmile"]],
    [["/rb02", "/rfluttersrs"], ["/rb12", "/rraritydress"], ["/rb22", "/rtakealetter"], ["/rb32", "/rrdwut"]],
    [["/rb03", "/rppshrug"], ["/rb13", "/rspikenervous", "/rnewrainbowdash"], ["/rb23", "/rnoooo"], ["/rb33", "/rdj", "/rthreedog"]],
    [["/rb04", "/rfluttershh"], ["/rb14", "/rflutteryay"], ["/rb24", "/rsquintyjack"], ["/rb34", "/rspikepushy"]],
    [["/rb05", "/rajugh"], ["/rb15", "/rraritywut"], ["/rb25", "/rdumbfabric"], ["/rb35", "/rraritywhy"]],
    [["/rb06", "/rtrixiesmug"], ["/rb16", "/rflutterwink"], ["/rb26", "/rrarityannoyed"], ["/rb36", "/rsoawesome"]],
    [["/rb07", "/rajwut"], ["/rb17", "/rtwisquint"], ["/rb27", "/rraritywhine"], ["/rb37", "/rrdcool"]],
    [["/rb08", "/rabwut"], ["/rb18", "/rmanspike"], ["/rb28", "/rcockatrice"], ["/rb38", "/rfacehoof"]],
    [["/rb09", "/rrarityjudge"], ["/rb19", "/rrarityprimp"], ["/rb29", "/rtwirage"], ["/rb39", "/rppseesyou"]]
    ]);

// C sheet
add_sheet({"background-image": "url(http://d.thumbs.redditmedia.com/YKSDpjdgMQmII9YE.png)"}, 70, 70, 3, 10, [
    [["/c00", "/rdsitting"], ["/c10", "/rdhappy"], ["/c20", "/rdannoyed"]],
    [["/c01", "/twismug"], ["/c11", "/twismile"], ["/c21", "/twistare"]],
    [["/c02", "/ohhi"], ["/c12", "/party"], ["/c22", "/hahaha"]],
    [["/c03", "/flutterblush"], ["/c13", "/gross"], ["/c23", "/derpyhappy"]],
    [["/c04", "/ajfrown"], ["/c14", "/hmmm"], ["/c24", "/joy"]],
    [["/c05", "/raritysad"], ["/c15", "/fabulous"], ["/c25", "/derp"]],
    [["/c06", "/louder"], ["/c16", "/lunasad"], ["/c26", "/derpyshock"]],
    [["/c07", "/pinkamina"], ["/c17", "/loveme"], ["/c27", "/lunagasp"]],
    [["/c08", "/scootaloo"], ["/c18", "/celestia"], ["/c28", "/angel"]],
    [["/c09", "/allmybits"], ["/c19", "/zecora"], ["/c29", "/photofinish"]]
    ]);

// Reversed C sheet
add_sheet({"background-image": "url(http://b.thumbs.redditmedia.com/mRM0EMQwBonm0jT7.png)"}, 70, 70, 3, 10, [
    [["/rc00", "/rrdsitting"], ["/rc10", "/rrdhappy"], ["/rc20", "/rrdannoyed"]],
    [["/rc01", "/rtwismug"], ["/rc11", "/rtwismile"], ["/rc21", "/rtwistare"]],
    [["/rc02", "/rohhi"], ["/rc12", "/rparty"], ["/rc22", "/rhahaha"]],
    [["/rc03", "/rflutterblush"], ["/rc13", "/rgross"], ["/rc23", "/rderpyhappy"]],
    [["/rc04", "/rajfrown"], ["/rc14", "/rhmmm"], ["/rc24", "/rjoy"]],
    [["/rc05", "/rraritysad"], ["/rc15", "/rfabulous"], ["/rc25", "/rderp"]],
    [["/rc06", "/rlouder"], ["/rc16", "/rlunasad"], ["/rc26", "/rderpyshock"]],
    [["/rc07", "/rpinkamina"], ["/rc17", "/rloveme"], ["/rc27", "/rlunagasp"]],
    [["/rc08", "/rscootaloo"], ["/rc18", "/rcelestia"], ["/rc28", "/rangel"]],
    [["/rc09", "/rallmybits"], ["/rc19", "/rzecora"], ["/rc29", "/rphotofinish"]]
    ]);

// E sheet
add_sheet({"background-image": "url(http://b.thumbs.redditmedia.com/xI80gM1JZrHyBlFm.png)"}, 70, 70, 3, 10, [
    [["/e00", "/fillytgap", "/t00"], ["/e10", "/rdhuh"], ["/e20", "/snails"]],
    [["/e01", "/lyra", "/100"], ["/e11", "/bonbon"], ["/e21", "/spitfire"]],
    [["/e02", "/cutealoo"], ["/e12", "/happyluna", "lunahappy"], ["/e22", "/sotrue"]],
    [["/e03", "/wahaha"], ["/e13", "/sbstare"], ["/e23", "/punchdrunk", "/berry"]],
    [["/e04", "/huhhuh"], ["/e14", "/absmile"], ["/e24", "/dealwithit"]],
    [["/e05", "/nmm", "/blacksnooty", "/queenmeanie", "/hokeysmokes"], ["/e15", "/whooves"], ["/e25", "/rdsalute"]],
    [["/e06", "/octavia", "/whomeverthisis"], ["/e16", "/colgate"], ["/e26", "/cheerilee"]],
    [["/e07", "/ajbaffle", "/ajconfused"], ["/e17", "/abhuh"], ["/e27", "/thehorror", "/lily"]],
    [["/e08", "/twiponder"], ["/e18", "/spikewtf"], ["/e28", "/awwyeah"]],
    [["/e09", "/gilda"], ["/e19", "/discentia", "/discentiastare", "/disstare"], ["/e29", "/macintears", "/manlytears", "/bigmactears"]]
    ]);

// Reversed E sheet
add_sheet({"background-image": "url(http://e.thumbs.redditmedia.com/UCe9yrEaHepzkgep.png)"}, 70, 70, 3, 10, [
    [["/re00", "/rfillytgap", "/rt00"], ["/re10", "/rrdhuh"], ["/re20", "/rsnails"]],
    [["/re01", "/rlyra", "/r100"], ["/re11", "/rbonbon"], ["/re21", "/rspitfire"]],
    [["/re02", "/rcutealoo"], ["/re12", "/rhappyluna", "lunahappy"], ["/re22", "/rsotrue"]],
    [["/re03", "/rwahaha"], ["/re13", "/rsbstare"], ["/re23", "/rpunchdrunk", "/rberry"]],
    [["/re04", "/rhuhhuh"], ["/re14", "/rabsmile"], ["/re24", "/rdealwithit"]],
    [["/re05", "/rnmm", "/rblacksnooty", "/rqueenmeanie", "/rhokeysmokes"], ["/re15", "/rwhooves"], ["/re25", "/rrdsalute"]],
    [["/re06", "/roctavia", "/rwhomeverthisis"], ["/re16", "/rcolgate"], ["/re26", "/rcheerilee"]],
    [["/re07", "/rajbaffle", "/rajconfused"], ["/re17", "/rabhuh"], ["/re27", "/rthehorror", "/rlily"]],
    [["/re08", "/rtwiponder"], ["/re18", "/rspikewtf"], ["/re28", "/rawwyeah"]],
    [["/re09", "/rgilda"], ["/re19", "/rdiscentia", "/rdiscentiastare", "/rdisstare"], ["/re29", "/rmacintears", "/rmanlytears", "/rbigmactears"]]
    ]);

// Other emote stuff
add_sheet({"background-image": "url(http://c.thumbs.redditmedia.com/5wA7HWAl2WD-UzA8.png)"}, 70, 70, 1, 2, [
    [["/smooze"]],
    [["/rsmooze"]]
    ]);

emotes["/sp"] = {"display": "inline-block", "padding-right": "100%"};

/* TODO
// in-line emotes -in and -inp, e.g. texttext[](/b24-in)texttext
a[href^="/"][href*="-in-"], a[href^="/"][href$="-in"], a[href^="/"][href*="-inp-"], a[href^="/"][href$="-inp"] {
    float: none !important;
    display: inline-block !important
}
*/
