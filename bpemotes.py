#!/usr/bin/env python3
# -*- coding: utf8 -*-
################################################################################
##
## Copyright (C) 2012 Typhos
##
## This Source Code Form is subject to the terms of the Mozilla Public
## License, v. 2.0. If a copy of the MPL was not distributed with this
## file, You can obtain one at http://mozilla.org/MPL/2.0/.
##
################################################################################

##
## Known conflicts:
##
## - r/mlp and r/mlas1 both define /gilda and /manlytears. Since r/mlp uses
##   !important on all their emotes, theirs will work fine there, but r/mlas1
##   will win out everywhere else.
##

ConflictWhitelist = ("/gilda", "/manlytears")

from bplib import *

Things = [
    ########################################################################
    ##
    ## R/MYLITTLEPONY
    ##
    ########################################################################

    # A sheet
    Spritesheet("mylittlepony_a", "http://b.thumbs.redditmedia.com/DW12xf1EuQi8VRcI.png", emote_grid((70, 70), [
        [["/a00", "/ajlie"], ["/a10", "/priceless"], ["/a20", "/flutterjerk"]],
        [["/a01", "/twipride"], ["/a11", "/celestiamad"], ["/a21", "/twicrazy"]],
        [["/a02", "/lunateehee"], ["/a12", "/lunawait"], ["/a22", "/paperbagderpy", "/paperbagwizard", "/derpwizard"]],
        [["/a03", "/ajhappy", "/happlejack"], ["/a13", "/ppfear"], ["/a23", "/twibeam"]],
        [["/a04", "/raritydaww"], ["/a14", "/scootacheer", "/lootascoo"]], # /a24 and /swagintosh are the third one, but overridden later
        [["/a05", "/ajsup", "/ajwhatsgood"], ["/a15", "/flutterwhoa", "/flutterwoah"], ["/a25", "/rdsad", "/rdcry"]],
        [["/a06", "/ohcomeon", "/sbcomeon"], ["/a16", "/ppcute", "/cutiepie"], ["/a26", "/abbored", "/abmerp"]],
        [["/a07", "/raritypaper", "/raritynews"], ["/a17", "/sbbook", "/sweetiebook"], ["/a27", "/scootaplease", "/scootappeal", "/scootaplz"]],
        [["/a08", "/twiright", "/satistwied"], ["/a18", "/celestiawut", "/wutlestia"], ["/a28", "/grannysmith", "/granny", "/oldmareyellsatcloud"]],
        [["/a09", "/shiningarmor", "/shiningarmour"], ["/a19", "/chrysalis", "/queenchrysalis", "/changlingqueen"],
            ["/a29", "/cadence", "/cadance", "/princesscadence", "/princesscadance", "/princessmiamorecadenza"]]
        ])),

    # Reversed A sheet
    # If I were smart, this wouldn't just be a copy&paste.
    Spritesheet("mylittlepony_a_r", "http://c.thumbs.redditmedia.com/QNdAer5mOCS_f1-J.png", emote_grid((70, 70), [
        [["/ra00", "/rajlie"], ["/ra10", "/rpriceless"], ["/ra20", "/rflutterjerk"]],
        [["/ra01", "/rtwipride"], ["/ra11", "/rcelestiamad"], ["/ra21", "/rtwicrazy"]],
        [["/ra02", "/rlunateehee"], ["/ra12", "/rlunawait"], ["/ra22", "/rpaperbagderpy", "/rpaperbagwizard", "/rderpwizard"]],
        [["/ra03", "/rajhappy", "/rhapplejack"], ["/ra13", "/rppfear"], ["/ra23", "/rtwibeam"]],
        [["/ra04", "/rraritydaww"], ["/ra14", "/rscootacheer", "/rlootascoo"]], # /ra24 and /rswagintosh are the third one
        [["/ra05", "/rajsup", "/rajwhatsgood"], ["/ra15", "/rflutterwhoa", "/rflutterwoah"], ["/ra25", "/rrdsad", "/rrdcry"]],
        [["/ra06", "/rohcomeon", "/rsbcomeon"], ["/ra16", "/rppcute", "/rcutiepie"], ["/ra26", "/rabbored", "/rabmerp"]],
        [["/ra07", "/rraritypaper", "/rraritynews"], ["/ra17", "/rsbbook", "/rsweetiebook"], ["/ra27", "/rscootaplease", "/rscootappeal", "/rscootaplz"]],
        [["/ra08", "/rtwiright", "/rsatistwied"], ["/ra18", "/rcelestiawut", "/rwutlestia"], ["/ra28", "/rgrannysmith", "/rgranny", "/roldmareyellsatcloud"]],
        [["/ra09", "/rshiningarmor", "/rshiningarmour"], ["/ra19", "/rchrysalis", "/rqueenchrysalis", "/rchanglingqueen"],
            ["/ra29", "/rcadence", "/rcadance", "/rprincesscadence", "/rprincesscadance", "/rprincessmiamorecadenza"]]
        ])),

    # Swagintosh is animated, so in a separate image. It's more or less a sheet.
    Spritesheet("mylittlepony_swagintosh", "http://b.thumbs.redditmedia.com/Kt_jbvLW92C9Fdqg.png", emote_grid((70, 70), [
        [["/a24", "/swagintosh"]],
        [["/ra24", "/rswagintosh"]]
        ])),

    # B sheet
    Spritesheet("mylittlepony_b", "http://e.thumbs.redditmedia.com/SdD3wwCBFtlQDVx4.png", emote_grid((50, 50), [
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
        ])),

    # Reversed B sheet
    Spritesheet("mylittlepony_b_r", "http://f.thumbs.redditmedia.com/I7qbwaE3bctckwOk.png", emote_grid((50, 50), [
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
        ])),

    # C sheet
    Spritesheet("mylittlepony_c", "http://d.thumbs.redditmedia.com/YKSDpjdgMQmII9YE.png", emote_grid((70, 70), [
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
        ])),

    # Reversed C sheet
    Spritesheet("mylittlepony_c_r", "http://b.thumbs.redditmedia.com/mRM0EMQwBonm0jT7.png", emote_grid((70, 70), [
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
        ])),

    # E sheet
    Spritesheet("mylittlepony_e", "http://b.thumbs.redditmedia.com/xI80gM1JZrHyBlFm.png", emote_grid((70, 70), [
        [["/e00", "/fillytgap", "/t00"], ["/e10", "/rdhuh"], ["/e20", "/snails"]],
        [["/e01", "/lyra", "/100"], ["/e11", "/bonbon"], ["/e21", "/spitfire"]],
        [["/e02", "/cutealoo"], ["/e12", "/happyluna", "/lunahappy"], ["/e22", "/sotrue"]],
        [["/e03", "/wahaha"], ["/e13", "/sbstare"], ["/e23", "/punchdrunk", "/berry"]],
        [["/e04", "/huhhuh"], ["/e14", "/absmile"], ["/e24", "/dealwithit"]],
        [["/e05", "/nmm", "/blacksnooty", "/queenmeanie", "/hokeysmokes"], ["/e15", "/whooves"], ["/e25", "/rdsalute"]],
        [["/e06", "/octavia", "/whomeverthisis"], ["/e16", "/colgate"], ["/e26", "/cheerilee"]],
        [["/e07", "/ajbaffle", "/ajconfused"], ["/e17", "/abhuh"], ["/e27", "/thehorror", "/lily"]],
        [["/e08", "/twiponder"], ["/e18", "/spikewtf"], ["/e28", "/awwyeah"]],
        # /gilda and /manlytears both CONFLICT with r/mylittleandysonic1
        [["/e09", "/gilda"], ["/e19", "/discentia", "/discentiastare", "/disstare"], ["/e29", "/macintears", "/manlytears", "/bigmactears"]]
        ])),

    # Reversed E sheet
    Spritesheet("mylittlepony_e_r", "http://e.thumbs.redditmedia.com/UCe9yrEaHepzkgep.png", emote_grid((70, 70), [
        [["/re00", "/rfillytgap", "/rt00"], ["/re10", "/rrdhuh"], ["/re20", "/rsnails"]],
        [["/re01", "/rlyra", "/r100"], ["/re11", "/rbonbon"], ["/re21", "/rspitfire"]],
        [["/re02", "/rcutealoo"], ["/re12", "/rhappyluna", "/rlunahappy"], ["/re22", "/rsotrue"]],
        [["/re03", "/rwahaha"], ["/re13", "/rsbstare"], ["/re23", "/rpunchdrunk", "/rberry"]],
        [["/re04", "/rhuhhuh"], ["/re14", "/rabsmile"], ["/re24", "/rdealwithit"]],
        [["/re05", "/rnmm", "/rblacksnooty", "/rqueenmeanie", "/rhokeysmokes"], ["/re15", "/rwhooves"], ["/re25", "/rrdsalute"]],
        [["/re06", "/roctavia", "/rwhomeverthisis"], ["/re16", "/rcolgate"], ["/re26", "/rcheerilee"]],
        [["/re07", "/rajbaffle", "/rajconfused"], ["/re17", "/rabhuh"], ["/re27", "/rthehorror", "/rlily"]],
        [["/re08", "/rtwiponder"], ["/re18", "/rspikewtf"], ["/re28", "/rawwyeah"]],
        [["/re09", "/rgilda"], ["/re19", "/rdiscentia", "/rdiscentiastare", "/rdisstare"], ["/re29", "/rmacintears", "/rmanlytears", "/rbigmactears"]]
        ])),

    # Other emote stuff
    Spritesheet("mylittlepony_smooze", "http://c.thumbs.redditmedia.com/5wA7HWAl2WD-UzA8.png", emote_grid((70, 70), [
        [["/smooze"]],
        [["/rsmooze"]]
        ])),

    # Spacing
    PsuedoEmote("mylittlepony_misc", "/sp", {"display": "inline-block", "padding-right": "100%"}),

    # TODO: from r/mlp's CSS, modifiers (not even supported yet):
    #// in-line emotes -in and -inp, e.g. texttext[](/b24-in)texttext
    #a[href^="/"][href*="-in-"], a[href^="/"][href$="-in"], a[href^="/"][href*="-inp-"], a[href^="/"][href$="-inp"]
    #    float: none !important;
    #    display: inline-block !important
    #}

    ########################################################################
    ##
    ## R/MYLITTLEANDYSONIC1
    ##
    ########################################################################

    # Various random emotes
    Spritesheet("mylittleandysonic1_misc1", "http://d.thumbs.redditmedia.com/DUaiuDPgJYWcPwWu.png", emote_list({
        "/flutterumm":          (146, 152, 0, 0),
        "/flutterwhat":         (146, 152, -146, 0),
        "/sackflip":            (199, 129, -292, 0),
        "/sackfun":             (187, 220, -690, 0),
        "/shitemote":           (246, 252, -187, -220)
        })),

    # These emotes have various hover attributes... TODO: make a better way to
    # do this. Ideally a parameter to Emote()...
    CustomCss("mylittleandysonic1_misc1", "flutterumm:hover", {
        "width": "146px", "height": "152px", "background-position": "-146px -0px"
        }),
    CustomCss("mylittleandysonic1_misc1", "flutterwhat:hover", {
        "width": "146px", "height": "152px", "background-position": "-0px -0px"
        }),
    CustomCss("mylittleandysonic1_misc1", "sackflip:hover", {
        "width": "199px", "height": "129px", "background-position": "-491px -0px"
        }),
    CustomCss("mylittleandysonic1_misc1", "sackfun:hover", {
        "width": "187px", "height": "220px", "background-position": "-0px -220px"
        }),
    CustomCss("mylittleandysonic1_misc1", "shitemote:hover", {
        "width": "270px", "height": "263px", "background-position": "-433px -220px"
        }),
    CustomCss("mylittleandysonic1_misc1", "shitemote:active", {
        "width": "275px", "height": "266px", "background-position": "-703px -220px"
        }),

    # /*fun and a couple other things... Most of these are regularly spaced, but
    # the width varies, and there are some special cases that wouldn't fit in a
    # gridded sheet anyway.
    Spritesheet("mylittleandysonic1_fun", "http://b.thumbs.redditmedia.com/wLifHPm_phXLE7Ma.png", emote_list({
        "/rarfun":              (248, 152, 0, 0),
        "/shyfun":              (234, 167, 0, -152),
        "/dashfun":             (231, 152, 0, -319),
        "/twifun":              (230, 152, 0, -471),
        "/charliefun":          (230, 152, 0, -623),
        "/rcrfun":              (230, 152, 0, -623),
        "/pinkiefun":           (227, 152, 0, -775),
        "/ppfun":               (227, 152, 0, -775),
        "/trixfun":             (226, 152, 0, -927),
        "/derpfun":             (221, 152, 0, -1079),
        "/bonfun":              (217, 152, 0, -1231),
        "/cheerfun":            (216, 152, 0, -1383),
        "/orschfun":            (211, 154, 0, -1535),
        "/ajfun":               (210, 152, 0, -1689),
        "/thunderlanefun":      (208, 152, 0, -1841),
        "/tlfun":               (208, 152, 0, -1841),
        "/darkfun":             (208, 152, 0, -1993),
        "/dolcefun":            (208, 152, 0, -1993),
        "/lyrafun":             (202, 152, 0, -2145),
        "/esplinfun":           (202, 152, 0, -2297),
        "/braefun":             (202, 152, 0, -2449),
        "/rosefun":             (201, 152, 0, -2601),
        "/speedyfun":           (193, 152, 0, -2753),
        "/gildafriendship":     (180, 202, 0, -2905),
        "/herhorn":             (180, 202, 0, -2905),
        "/ch35":                (113, 152, 0, -3107),
        "/chnuzzle":            (113, 152, 0, -3107),
        "/twinuzzle":           (112, 152, -113, -3107)
        })),

    # More misc things, including a lot of Pokemon.
    Spritesheet("mylittleandysonic1_misc2", "http://b.thumbs.redditmedia.com/h5WgVTaRo_UWI1e1.png", emote_list({
        "/a_lot":               (256, 142, 0, 0),
        "/flutalot":            (256, 142, 0, 0),
        "/applepuff":           (99, 102, 0, -142),
        "/bendover":            (152, 152, -99, -142),
        "/cadancewat":          (85, 127, 0, -294),
        "/cadencewat":          (85, 127, 0, -294),
        "/chryswat":            (122, 127, -85, -294),
        "/cmcderp":             (175, 127, 0, -421),
        "/discordwtf":          (154, 152, 0, -548),
        "/doitfilly":           (185, 202, 0, -700),
        "/eeveedash":           (79, 102, 0, -902),
        "/gildafury":           (256, 167, 0, -1004),
        "/hatefuck":            (256, 231, 0, -1171),
        "/pbf":                 (66, 82, 0, -1402),
        "/ppchainsaw":          (226, 152, 0, -1484),
        "/ppteeth":             (166, 152, 0, -1636),
        "/raritywooo":          (100, 152, 0, -1788),
        "/rarizee":             (97, 102, -100, -1788),
        "/rubysquee":           (124, 127, 0, -1940),
        "/shyduck":             (91, 102, -124, -1940),
        "/twipoke":             (101, 102, 0, -2067),
        "/twiread":             (256, 108, 0, -2169),
        "/wuna":                (146, 202, 0, -2277)
        })),

    # More misc things, and a lot of Lyra/Bonbon stuff.
    Spritesheet("mylittleandysonic1_misc3", "http://c.thumbs.redditmedia.com/b3i1wbSbdriJsld8.png", emote_list({
        "/lb06":                (202, 156, 0, 0),
        "/lb25":                (52, 76, -202, 0),
        "/forequestria":        (182, 156, 0, -156),
        "/lb24":                (74, 76, -182, -156),
        "/lb04":                (74, 76, -182, -232),
        "/lb11":                (74, 62, -182, -308),
        "/evilenchantress":     (180, 156, 0, -312),
        "/lb31":                (76, 76, -180, -370),
        "/lb30":                (76, 76, -180, -446),
        "/twiwhy":              (179, 152, 0, -468),
        "/lb23":                (76, 76, -179, -522),
        "/lb20":                (76, 76, -179, -598),
        "/flutterhug":          (155, 156, 0, -620),
        "/lb14":                (76, 76, -155, -674),
        "/lb13":                (76, 76, -155, -750),
        "/lywithit":            (153, 156, 0, -776),
        "/ajwtf":               (102, 131, -153, -826),
        "/ch13":                (149, 156, 0, -932),
        "/cheerwithit":         (149, 156, 0, -932),
        "/worstpony":           (107, 106, -149, -957),
        "/sweetiestache":       (104, 89, -149, -1063),
        "/ch23":                (128, 156, 0, -1088),
        "/cheerilean":          (128, 156, 0, -1088),
        "/ch33":                (122, 131, -128, -1152),
        "/scratch":             (121, 156, 0, -1244),
        "/lb03":                (76, 76, -121, -1283),
        "/lb15":                (56, 76, -197, -1283),
        "/lb21":                (76, 74, -121, -1359),
        "/lb34":                (76, 72, 0, -1400),
        "/lb01":                (76, 72, -76, -1433),
        "/lb22":                (76, 70, -152, -1433),
        "/lb00":                (76, 72, 0, -1472),
        "/lb42":                (76, 64, -76, -1505),
        "/lb02":                (76, 68, -152, -1503),
        "/lb32":                (76, 64, 0, -1544),
        "/lb43":                (76, 58, -76, -1569),
        "/lb12":                (76, 56, -152, -1571),
        "/lb10":                (76, 58, 0, -1608),
        "/lb40":                (76, 48, 0, -1666),
        "/lb44":                (76, 50, -76, -1627),
        "/lb45":                (72, 76, -152, -1627),
        "/lb41":                (72, 76, -76, -1677),
        "/lb33":                (72, 76, -148, -1703),
        "/lb35":                (72, 76, 0, -1714),
        "/lb05":                (60, 76, -72, -1753)
        })),

    # Misc stuff.
    Spritesheet("mylittleandysonic1_misc4", "http://c.thumbs.redditmedia.com/7uLCsxF3MxmDKvbh.png", emote_list({
        "/celestiafun":         (408, 256, 0, 0),
        "/dayblob":             (101, 81, -408, 0),
        "/twilight":            (76, 73, -408, -81),
        "/trixmad":             (74, 76, -408, -154),
        "/wutpie":              (74, 72, -408, -230),
        "/froguedash":          (393, 417, 0, -256),
        "/roguedash":           (393, 417, 0, -256),
        "/brody2":              (118, 117, -393, -302),
        "/rbrodyhover":         (118, 117, -393, -302),
        "/pinkamena":           (106, 117, -393, -419),
        "/brody":               (106, 117, -393, -536),
        "/brodyhover":          (106, 117, -393, -536),
        "/twiokay":             (72, 76, -393, -653),
        "/lunafun":             (328, 181, 0, -673),
        "/wutjack":             (62, 68, -328, -673),
        "/surpriseparty":       (122, 194, -390, -729),
        "/darklewithit":        (249, 269, 0, -854),
        "/twihat":              (131, 151, -249, -854),
        "/faustfun":            (246, 216, -249, -1005),
        "/fleurfun":            (215, 162, 0, -1123),
        "/slutfun":             (215, 162, 0, -1123)
        })),
    CustomCss("mylittleandysonic1_misc4", "brodyhover:hover", {
        "width": "118px", "height": "117px", "background-position": "-393px -302px"
        }),
    CustomCss("mylittleandysonic1_misc4", "rbrodyhover:hover", {
        "width": "106px", "height": "117px", "background-position": "-393px -536px"
        }),

    # Misc stuff.
    Spritesheet("mylittleandysonic1_misc5", "http://a.thumbs.redditmedia.com/cJ110aNdOQSe_VEB.png", emote_list({
        "/dashmad":             (416, 430, 0, 0),
        "/dashmad2":            (416, 430, 0, 0),
        "/hamsters":            (206, 192, -211, -430),
        "/elegance":            (211, 156, 0, -430),
        "/yourhorn":            (206, 120, 0, -586),
        "/fancypants":          (111, 156, -401, -622),
        "/surnope":             (195, 256, -206, -622),
        "/twirobe":             (172, 156, 0, -706),
        "/puddinghead":         (107, 181, -401, -778),
        "/disappoint":          (169, 156, 0, -862),
        "/raritux":             (156, 155, -169, -878),
        "/hatwithit":           (153, 156, -325, -959),
        "/creepymc":            (156, 115, 0, -1018),
        "/mywings":             (146, 146, -156, -1033),
        "/vsguitar":            (101, 156, -302, -1115),
        "/ihaveyounow":         (138, 156, 0, -1133)
        })),

    # Misc stuff.
    Spritesheet("mylittleandysonic1_misc6", "http://c.thumbs.redditmedia.com/KTO2hH2v4Pm7JmNJ.png", emote_list({
        "/carrotfun":           (234, 162, -269, 0),
        "/carrottopfun":        (234, 162, -269, 0),
        "/dashwithit":          (269, 269, 0, 0),
        "/cerealpie":           (206, 200, -269, -162),
        "/rcerealpie":          (206, 200, -269, -162),
        "/pinkwithit":          (265, 273, 0, -269),
        "/twiflip":             (204, 139, -265, -362),
        "/eng":                 (46, 76, -451, -501),
        "/crossfire":           (186, 131, -265, -501),
        "/rcrossfire":          (186, 131, -265, -501),
        "/gummy":               (89, 95, -176, -542),
        "/ppfly":               (176, 92, 0, -542),
        "/ajsmile":             (83, 121, -429, -632),
        "/pptoot":              (164, 147, -265, -632),
        "/rdsax":               (171, 131, 0, -634),
        "/sbevil":              (94, 106, -171, -637),
        "/ajcute":              (91, 81, -171, -743),
        "/heavy":               (76, 76, -429, -753),
        "/lush":                (135, 109, 0, -765),
        "/dramaqueen":          (152, 105, -262, -779),
        "/flutterdash":         (126, 126, -135, -824),
        "/w40":                 (76, 74, -414, -829),
        "/bonbonlyra":          (126, 109, 0, -874),
        "/ajsmug":              (125, 155, -261, -884),
        "/rdwhat":              (125, 131, -386, -903),
        "/ppfrown":             (114, 154, -126, -950),
        "/ppstache":            (108, 106, 0, -983),
        "/bonbonlyra2":         (116, 122, -386, -1034),
        "/ppmoney":             (106, 132, -240, -1039),
        "/cake":                (107, 131, 0, -1089),
        "/twitrix":             (106, 95, -107, -1104),
        "/flunam":              (62, 76, -448, -1156),
        "/lunam":               (62, 76, -448, -1156),
        "/ppforever":           (102, 156, -346, -1156),
        "/lyou":                (68, 76, -213, -1171)
        })),

    # Misc stuff.
    Spritesheet("mylittleandysonic1_misc7", "http://f.thumbs.redditmedia.com/oFBPBInESuBi6jne.png", emote_list({
        "/ch00":                (77, 81, 0, 0),
        "/ch01":                (138, 156, -77, 0),
        "/ch02":                (194, 156, -215, 0),
        "/ch03":                (80, 81, -409, 0),
        "/ch10":                (172, 156, 0, -156),
        "/ch11":                (147, 156, -172, -156),
        "/ch12":                (89, 156, -319, -156),
        "/ch20":                (79, 156, -408, -156),
        "/ch21":                (132, 156, 0, -312),
        "/ch22":                (169, 156, -132, -312),
        "/ch25":                (155, 156, -301, -312),
        "/ch30":                (70, 81, 0, -468),
        "/ch31":                (127, 156, -70, -468),
        "/ch32":                (80, 81, -197, -468),
        "/fscrazy":             (132, 131, -277, -468),
        "/gilda":               (217, 206, 0, -624), # CONFLICT with r/mylittlepony
        "/jackwithit":          (228, 269, -217, -624),
        "/ppahh":               (175, 156, 0, -893),
        "/rarwithit":           (248, 269, -175, -893),
        "/scootie":             (158, 81, 0, -1162),
        "/shywithit":           (262, 269, -158, -1162),
        "/sparklewithit":       (249, 269, 0, -1431),
        "/spitfuck":            (108, 106, -249, -1431),
        "/twino":               (206, 176, 0, -1700)
        })),

    # Misc stuff.
    Spritesheet("mylittleandysonic1_misc8", "http://b.thumbs.redditmedia.com/IZ3Pnb_40vz0IYka.png", emote_list({
        "/braeburn":            (170, 156, 0, 0),
        "/cluna":               (362, 406, 0, -156),
        "/derpwithit":          (254, 265, 0, -562),
        "/discord":             (101, 131, -254, -562),
        "/discordsmile":        (159, 156, 0, -827),
        "/discordwithit":       (275, 275, -159, -827),
        "/froguewithit":        (390, 417, 0, -1102),
        "/roguewithit":         (390, 417, 0, -1102),
        "/hate":                (284, 188, 0, -1519),
        "/liarmac":             (116, 156, -284, -1519),
        "/qqfyq":               (156, 142, 0, -1707),
        "/ppfreakout":          (156, 142, 0, -1707),
        "/ppquite":             (106, 106, -156, -1707),
        "/ppscared":            (138, 156, -262, -1707),
        "/thatsnothowyouspellpinkiepie": (73, 76, -400, -1707),
        "/tom":                 (76, 76, 0, -1863),
        "/trixwizard":          (124, 156, -76, -1863),
        })),

    # Misc stuff.
    Spritesheet("mylittleandysonic1_misc9", "http://f.thumbs.redditmedia.com/jGyqL_Z8cvtVwHww.png", emote_list({
        "/abfun":               (132, 143, 0, 0),
        "/ajstache":            (72, 106, -132, 0),
        "/darklefun":           (234, 156, 0, -143),
        "/dashdead":            (174, 156, 0, -299),
        "/derpyzap":            (132, 156, 0, -455),
        "/fivewats":            (121, 121, -132, -455),
        "/flutterwhy":          (132, 131, 0, -611),
        "/rflutterwhy":         (132, 131, 0, -611),
        "/goat":                (116, 156, -132, -611),
        "/gummyfez":            (140, 156, 0, -767),
        "/gypsypie":            (149, 156, 0, -923),
        "/heythere":            (109, 156, 0, -1079),
        "/macsmile":            (76, 81, -109, -1079),
        "/macwink":             (68, 81, -185, -1079),
        "/manlytears":          (112, 131, 0, -1235), # CONFLICT with r/mylittlepony
        "/mav":                 (130, 116, -112, -1235),
        "/onesquee":            (121, 121, 0, -1366),
        "/pip":                 (63, 81, -121, -1366),
        "/pphello":             (83, 131, 0, -1487),
        "/ppwatching":          (116, 81, -83, -1487),
        "/rdstare":             (103, 106, 0, -1618),
        "/rdwhy":               (73, 81, -103, -1618),
        "/rod":                 (116, 106, 0, -1724),
        "/sadtwi":              (93, 106, -116, -1724),
        "/sbfun":               (140, 139, 0, -1830),
        "/scootacake":          (72, 81, -140, -1830),
        "/scootanoms":          (72, 81, -140, -1830),
        "/scootachicken":       (71, 106, 0, -1969),
        "/scootafun":           (143, 141, -71, -1969),
        "/scootidea":           (87, 106, 0, -2110),
        "/spitfetish":          (236, 200, 0, -2216),
        "/spitflyer":           (256, 81, 0, -2416),
        "/spitwithit":          (156, 156, 0, -2497),
        "/spoon":               (137, 136, 0, -2653),
        "/telegram":            (103, 131, -137, -2653),
        "/twicower":            (208, 106, 0, -2789),
        "/twicute":             (82, 81, 0, -2895),
        "/zecorawat":           (93, 106, -82, -2895)
        })),

    # Misc stuff.
    Spritesheet("mylittleandysonic1_misc10", "http://d.thumbs.redditmedia.com/BVHoQ0q2bQBOZ80E.png", emote_list({
        "/ajhay":               (86, 97, 0, 0),
        "/awesome":             (101, 152, -86, 0),
        "/ch05":                (75, 77, 0, -152),
        "/derpilee":            (75, 77, 0, -152),
        "/cheesemoo":           (113, 102, -75, -152),
        "/dcute":               (75, 77, 0, -254),
        "/derram":              (98, 127, -75, -254),
        "/discordgag":          (152, 152, 0, -381),
        "/emperorgummy":        (205, 202, 0, -533),
        "/grumpydash":          (73, 77, 0, -735),
        "/ww30":                (73, 77, 0, -735),
        "/grumpyjack":          (69, 87, -73, -735),
        "/ww02":                (69, 87, -73, -735),
        "/moongusta":           (152, 152, 0, -822),
        "/parafun":             (78, 77, -152, -822),
        "/pinkachu":            (108, 102, 0, -974),
        "/queenawesome":        (127, 127, -108, -974),
        "/radical":             (101, 152, 0, -1101),
        "/raricute":            (74, 77, -101, -1101),
        "/rarigummy":           (170, 127, 0, -1253),
        "/surcookie":           (165, 202, 0, -1380),
        "/sweetieww":           (112, 127, 0, -1582),
        "/tank":                (125, 102, -112, -1582),
        "/thatswhatshysaid":    (142, 127, 0, -1709),
        "/twibook":             (142, 127, 0, -1836),
        "/twistparty":          (153, 127, 0, -1963),
        "/ww00":                (68, 77, -153, -1963),
        "/ww01":                (141, 152, 0, -2090),
        "/ww10":                (102, 102, -141, -2090),
        "/ww11":                (71, 77, 0, -2242),
        "/ww20":                (105, 102, -71, -2242),
        "/ww21":                (140, 152, 0, -2344),
        "/ww31":                (108, 102, -140, -2344),
        "/yes":                 (223, 202, 0, -2496)
        })),

    # A couple misc. emotes, the /v, /w, /x blocks, and some of the /zz block (the
    # rest is in misc14). Some of these could probably be gridded, but they're
    # offset a bit (plus they're all random sizes).
    Spritesheet("mylittleandysonic1_misc11", "http://d.thumbs.redditmedia.com/H0eyI2gKpleBC5s3.png", emote_list({
        "/fscute":              (81, 77, 0, 0),
        "/ppohyou":             (94, 102, -81, 0),
        "/rdcute":              (70, 77, -175, 0),
        "/v00":                 (72, 56, -245, 0),
        "/v01":                 (60, 72, -317, 0),
        "/v02":                 (62, 72, -377, 0),
        "/v03":                 (60, 70, -439, 0),
        "/v10":                 (56, 70, 0, -102),
        "/v11":                 (56, 70, -56, -102),
        "/v12":                 (62, 72, -112, -102),
        "/v13":                 (62, 72, -174, -102),
        "/v20":                 (60, 70, -236, -102),
        "/v21":                 (58, 72, -296, -102),
        "/v22":                 (62, 72, -354, -102),
        "/v23":                 (62, 72, -416, -102),
        "/v30":                 (52, 72, 0, -174),
        "/v31":                 (58, 72, -52, -174),
        "/v32":                 (58, 72, -110, -174),
        "/v33":                 (66, 72, -168, -174),
        "/v40":                 (62, 70, -234, -174),
        "/v41":                 (58, 72, -296, -174),
        "/v42":                 (64, 72, -354, -174),
        "/v43":                 (72, 70, -418, -174),
        "/w00":                 (68, 66, 0, -246),
        "/w01":                 (72, 70, -68, -246),
        "/w02":                 (72, 72, -140, -246),
        "/w03":                 (68, 68, -212, -246),
        "/w04":                 (68, 70, -280, -246),
        "/w10":                 (72, 72, -348, -246),
        "/w11":                 (68, 68, -420, -246),
        "/w12":                 (72, 72, 0, -318),
        "/w13":                 (68, 68, -72, -318),
        "/w14":                 (66, 70, -140, -318),
        "/w20":                 (68, 66, -206, -318),
        "/w21":                 (68, 70, -274, -318),
        "/w22":                 (68, 66, -342, -318),
        "/w23":                 (68, 66, -410, -318),
        "/w24":                 (70, 66, 0, -390),
        "/w30":                 (68, 66, -70, -390),
        "/w31":                 (66, 66, -138, -390),
        "/w32":                 (68, 68, -204, -390),
        "/w33":                 (72, 68, -272, -390),
        "/w34":                 (68, 66, -344, -390),
        "/x00":                 (64, 72, -412, -390),
        "/x01":                 (68, 72, 0, -462),
        "/x02":                 (68, 72, -68, -462),
        "/x03":                 (64, 72, -136, -462),
        "/x04":                 (72, 72, -200, -462),
        "/x10":                 (72, 70, -272, -462),
        "/x11":                 (68, 72, -344, -462),
        "/x12":                 (72, 72, -412, -462),
        "/x13":                 (66, 72, 0, -534),
        "/x14":                 (72, 72, -66, -534),
        "/x20":                 (72, 72, -138, -534),
        "/x21":                 (64, 70, -210, -534),
        "/x22":                 (72, 72, -274, -534),
        "/x23":                 (72, 70, -346, -534),
        "/x24":                 (70, 66, -418, -534),
        "/x30":                 (70, 68, 0, -606),
        "/x31":                 (70, 72, -70, -606),
        "/x32":                 (72, 72, -140, -606),
        "/x33":                 (66, 72, -212, -606),
        "/x34":                 (70, 72, -278, -606),
        "/x40":                 (68, 68, -348, -606),
        "/x41":                 (70, 72, -416, -606),
        "/x42":                 (70, 72, 0, -678),
        "/x43":                 (72, 72, -70, -678),
        "/x44":                 (68, 72, -142, -678),
        "/zz00":                (58, 64, -210, -678),
        "/zz01":                (70, 68, -268, -678),
        "/zz02":                (62, 68, -338, -678),
        "/zz03":                (58, 64, -400, -678),
        "/zz10":                (54, 60, -458, -678)
        })),

    # Misc stuff.
    Spritesheet("mylittleandysonic1_misc12", "http://b.thumbs.redditmedia.com/BLCBKpyVbf7ZNc7m.png", emote_list({
        "/xx28":                (153, 106, 0, 0),
        "/xx33":                (151, 106, -153, 0),
        "/xx02":                (148, 106, -304, 0),
        "/xx30":                (59, 106, -452, 0),
        "/xx09":                (141, 106, 0, -106),
        "/xx10":                (134, 106, -141, -106),
        "/xx37":                (133, 106, -275, -106),
        "/xx22":                (102, 106, -408, -106),
        "/xx05":                (132, 106, 0, -212),
        "/xx24":                (127, 106, -132, -212),
        "/xx03":                (125, 106, -259, -212),
        "/xx11":                (121, 106, -384, -212),
        "/xx35":                (120, 106, 0, -318),
        "/xx15":                (120, 106, -120, -318),
        "/xx06":                (117, 106, -240, -318),
        "/xx25":                (116, 106, -357, -318),
        "/xx08":                (115, 106, 0, -424),
        "/xx36":                (114, 106, -115, -424),
        "/xx32":                (113, 106, -229, -424),
        "/xx26":                (113, 106, -342, -424),
        "/xx29":                (112, 106, 0, -530),
        "/xx12":                (106, 106, -112, -530),
        "/xx16":                (100, 106, -218, -530),
        "/xx27":                (99, 106, -318, -530),
        "/xx31":                (91, 106, -417, -530),
        "/xx38":                (111, 106, 0, -636),
        "/xx19":                (109, 106, -111, -636),
        "/xx04":                (89, 106, -220, -636),
        "/xx00":                (81, 106, -309, -636),
        "/xx20":                (74, 106, -390, -636),
        "/xx13":                (111, 106, 0, -742),
        "/xx14":                (97, 106, -111, -742),
        "/xx21":                (91, 106, -208, -742),
        "/xx18":                (81, 106, -299, -742),
        "/xx17":                (73, 106, -380, -742),
        "/xx01":                (111, 106, 0, -848),
        "/xx07":                (97, 106, -111, -848),
        "/xx23":                (85, 106, -208, -848),
        "/xx34":                (82, 106, -293, -848)
        })),

    # Misc stuff and the /yy block.
    Spritesheet("mylittleandysonic1_misc13", "http://c.thumbs.redditmedia.com/IXp-LnEZZtrgJJYb.png", emote_list({
        "/bblove":              (191, 152, 0, 0),
        "/yy41":                (152, 148, -191, 0),
        "/yy00":                (152, 141, -343, 0),
        "/yy31":                (152, 137, -343, -141),
        "/yy20":                (152, 136, -191, -148),
        "/yy22":                (152, 125, 0, -152),
        "/yy01":                (152, 118, 0, -277),
        "/yy11":                (152, 129, -343, -278),
        "/yy40":                (152, 116, -152, -284),
        "/yy12":                (152, 115, 0, -395),
        "/yy30":                (152, 110, -152, -400),
        "/yy02":                (152, 106, -304, -407),
        "/yy42":                (152, 92, 0, -510),
        "/yy32":                (150, 152, -152, -510),
        "/creepybelle":         (110, 122, -302, -513),
        "/yy21":                (100, 152, -412, -513),
        "/yy10":                (141, 152, 0, -602),
        "/ajwink":              (95, 152, -302, -635),
        "/what":                (94, 109, -141, -662),
        "/tiara":               (94, 127, -397, -665),
        "/abfreakout":          (86, 102, 0, -754),
        "/bbyou":               (72, 72, -86, -771),
        "/guitar":              (78, 137, 0, -856),
        "/abcute":              (81, 102, -78, -856)
        })),

    # Misc stuff, the /y block (which is more misc stuff), and the /zz block.
    Spritesheet("mylittleandysonic1_misc14", "http://e.thumbs.redditmedia.com/JnTe98YY8-etIE3p.png", emote_list({
        "/ch04":                (102, 102, 0, 0),
        "/ch15":                (127, 102, 0, -102),
        "/cheerihat":           (127, 102, 0, -102),
        "/ch34":                (121, 102, 0, -204),
        "/lexcited":            (102, 102, 0, -306),
        "/llaugh":              (102, 102, 0, -408),
        "/lmad":                (102, 102, 0, -510),
        "/lnotbad":             (102, 102, 0, -612),
        "/lnotimpressed":       (102, 102, 0, -714),
        "/lroyal":              (102, 102, 0, -816),
        "/lshady":              (102, 102, 0, -918),
        "/lsquee":              (102, 102, 0, -1020),
        "/lyes":                (102, 102, 0, -1122),
        "/y00":                 (68, 72, 0, -1224),
        "/y01":                 (72, 72, 0, -1296),
        "/y02":                 (72, 72, 0, -1368),
        "/y03":                 (72, 72, 0, -1440),
        "/y04":                 (72, 68, 0, -1512),
        "/y05":                 (72, 72, 0, -1580),
        "/y06":                 (72, 72, 0, -1652),
        "/y07":                 (62, 72, 0, -1724),
        "/y10":                 (70, 72, 0, -1796),
        "/y11":                 (72, 72, 0, -1868),
        "/y12":                 (64, 72, 0, -1940),
        "/y13":                 (72, 72, 0, -2012),
        "/y14":                 (72, 72, 0, -2084),
        "/y15":                 (72, 72, 0, -2156),
        "/y16":                 (72, 72, 0, -2228),
        "/y17":                 (72, 72, 0, -2300),
        "/y20":                 (72, 72, 0, -2372),
        "/y21":                 (72, 72, 0, -2444),
        "/y22":                 (72, 72, 0, -2516),
        "/y23":                 (72, 72, 0, -2588),
        "/y24":                 (72, 72, 0, -2660),
        "/y25":                 (72, 72, 0, -2732),
        "/y26":                 (72, 72, 0, -2804),
        "/y27":                 (72, 72, 0, -2876),
        "/y30":                 (72, 72, 0, -2948),
        "/y31":                 (62, 72, 0, -3020),
        "/y32":                 (72, 72, 0, -3092),
        "/y33":                 (72, 72, 0, -3164),
        "/y34":                 (72, 72, 0, -3236),
        "/y35":                 (72, 72, 0, -3308),
        "/y36":                 (72, 72, 0, -3380),
        "/y37":                 (72, 72, 0, -3452),
        "/y40":                 (72, 72, 0, -3524),
        "/y41":                 (70, 72, 0, -3596),
        "/y42":                 (72, 72, 0, -3668),
        "/y43":                 (72, 72, 0, -3740),
        "/y44":                 (72, 72, 0, -3812),
        "/y45":                 (72, 72, 0, -3884),
        "/y46":                 (72, 68, 0, -3956),
        "/y47":                 (70, 72, 0, -4024),
        "/zz11":                (60, 68, 0, -4096),
        "/zz12":                (60, 68, -60, -4096),
        "/zz13":                (72, 68, 0, -4164),
        "/zz20":                (62, 68, 0, -4232),
        "/zz21":                (56, 62, -62, -4232),
        "/zz22":                (64, 64, 0, -4300),
        "/zz23":                (66, 68, 0, -4364),
        "/zz30":                (70, 64, 0, -4432),
        "/zz31":                (60, 68, 0, -4496),
        "/zz32":                (60, 64, -60, -4496),
        "/zz33":                (62, 68, 0, -4564),
        "/zz40":                (60, 68, -62, -4564),
        "/zz41":                (60, 68, 0, -4632),
        "/zz42":                (58, 64, -60, -4632),
        "/zz43":                (56, 66, 0, -4700)
        })),

    # Misc stuff.
    Spritesheet("mylittleandysonic1_misc15", "http://a.thumbs.redditmedia.com/w8xAboodMKeO8t4r.png", emote_list({
        "/abshocked":           (100, 106, 0, 0),
        "/ajdemon":             (137, 156, -100, 0),
        "/ch14":                (156, 156, 0, -156),
        "/ch24":                (190, 156, 0, -312),
        "/dapper":              (75, 106, 0, -468),
        "/flutterlean":         (113, 156, -75, -468),
        "/ftia":                (74, 72, 0, -624),
        "/z25":                 (74, 72, 0, -624),
        "/ppgummy":             (171, 156, -74, -624),
        "/rdawesome":           (70, 81, 0, -780),
        "/rdgrin":              (75, 81, -70, -780),
        "/rdlean":              (125, 156, 0, -861),
        "/rdwizard":            (113, 156, -125, -861),
        "/sadtiara":            (80, 106, 0, -1017),
        "/sbsad":               (85, 106, -80, -1017),
        "/who":                 (72, 81, -165, -1017),
        "/z00":                 (65, 76, 0, -1123),
        "/z01":                 (66, 76, -65, -1123),
        "/z02":                 (62, 76, -131, -1123),
        "/z03":                 (68, 76, 0, -1199),
        "/z04":                 (76, 76, -68, -1199),
        "/z05":                 (74, 76, -144, -1199),
        "/z06":                 (72, 76, 0, -1275),
        "/z07":                 (76, 76, -72, -1275),
        "/z10":                 (76, 76, -148, -1275),
        "/z11":                 (76, 76, 0, -1351),
        "/z12":                 (76, 72, -76, -1351),
        "/z13":                 (60, 76, -152, -1351),
        "/z14":                 (76, 76, 0, -1427),
        "/z15":                 (76, 76, -76, -1427),
        "/z16":                 (70, 76, -152, -1427),
        "/z17":                 (76, 76, 0, -1503),
        "/z20":                 (76, 76, -76, -1503),
        "/z21":                 (76, 74, -152, -1503),
        "/z22":                 (76, 76, 0, -1579),
        "/z23":                 (76, 76, -76, -1579),
        "/z24":                 (76, 76, -152, -1579),
        "/z26":                 (74, 76, 0, -1655),
        "/z27":                 (76, 76, -74, -1655),
        "/z30":                 (76, 76, -150, -1655),
        "/z31":                 (76, 76, 0, -1731),
        "/z32":                 (76, 76, -76, -1731),
        "/z33":                 (76, 76, -152, -1731),
        "/z34":                 (72, 76, 0, -1807),
        "/z35":                 (76, 76, -72, -1807),
        "/z36":                 (76, 76, -148, -1807),
        "/z37":                 (76, 76, 0, -1883),
        "/z40":                 (76, 76, -76, -1883),
        "/z41":                 (70, 76, -152, -1883),
        "/z42":                 (76, 76, 0, -1959),
        "/z43":                 (76, 76, -76, -1959),
        "/z44":                 (76, 76, -152, -1959),
        "/z45":                 (76, 76, 0, -2035),
        "/z46":                 (72, 76, -76, -2035),
        "/z47":                 (76, 76, -148, -2035)
        })),

    # Clop table.
    Spritesheet("mylittleandysonic1_clop", "http://b.thumbs.redditmedia.com/fbgZb0jhgTvSQMWC.png", emote_list({
        "/clop10":              (66, 74, -77, 0),
        "/clop20":              (70, 75, -153, 0),
        "/clop30":              (71, 74, -227, 0),
        "/clop40":              (69, 75, -306, 0),
        "/clop00":              (67, 73, -4, -2),
        "/clop11":              (71, 77, -68, -73),
        "/clop01":              (64, 76, -2, -75),
        "/clop31":              (68, 75, -215, -75),
        "/clop41":              (71, 76, -295, -76),
        "/clop21":              (64, 67, -142, -84),
        "/clop12":              (76, 76, -76, -151),
        "/clop22":              (76, 76, -151, -151),
        "/clop02":              (66, 75, -7, -153),
        "/clop32":              (69, 72, -235, -155),
        "/clop42":              (66, 74, -312, -158),
        "/clop23":              (68, 74, -153, -229),
        "/clop33":              (64, 73, -230, -230),
        "/clop13":              (71, 72, -76, -231),
        "/clop03":              (63, 72, -10, -232),
        "/clop43":              (63, 73, -303, -236),
        "/clop14":              (63, 77, -83, -304),
        "/clop34":              (75, 76, -217, -304),
        "/clop04":              (70, 76, -5, -305),
        "/clop24":              (64, 75, -150, -305),
        "/clop44":              (64, 66, -306, -314),
        "/clop45":              (70, 75, -3, -382),
        "/sur26":               (70, 75, -3, -382),
        "/clop46":              (70, 75, -80, -382),
        "/rsur26":              (70, 75, -80, -382)
        })),

    # Filly table and misc stuff.
    Spritesheet("mylittleandysonic1_misc16", "http://d.thumbs.redditmedia.com/OODIcUkVM2hyCSyi.png", emote_list({
        "/fillyab":             (70, 52, 0, 0),
        "/fillyaj":             (70, 58, -52, 0),
        "/fillybonbon":         (70, 62, -110, 0),
        "/fillycelestia":       (70, 65, -172, 0),
        "/fillydashready":      (70, 113, -237, 0),
        "/fillyderpy":          (70, 69, -350, 0),
        "/fillycheerile":       (70, 42, 0, -70),
        "/fillydis":            (70, 78, -52, -70),
        "/fillyflirt":          (70, 109, -130, -70),
        "/fillyfluttershysing": (70, 97, -239, -70),
        "/fillylyra":           (70, 65, -336, -70),
        "/fillyspitfire":       (70, 50, 0, -140),
        "/fillyfluttershy":     (70, 76, -52, -140),
        "/fillyoctavia":        (70, 69, -130, -140),
        "/fillypinkie":         (70, 70, -199, -140),
        "/fillyrose":           (70, 71, -269, -140),
        "/fillysbstare":        (70, 72, -340, -140),
        "/fillyfritter":        (70, 67, -52, -210),
        "/fillyrd":             (70, 61, -130, -210),
        "/fillydash":           (70, 61, -130, -210),
        "/fillytwidance":       (70, 74, -199, -210),
        "/scootasmile":         (70, 65, -273, -210),
        "/fillykarma":          (70, 78, -52, -280),
        "/fillystrudel":        (70, 68, -130, -280),
        "/fillyvinyl":          (70, 57, -199, -280),
        "/ppwhat":              (109, 116, -285, -304),
        "/fillyluna":           (70, 62, -52, -350),
        "/fillytrixie":         (70, 61, -130, -350),
        "/rarityfilly":         (70, 74, -199, -350)
        })),

    # A couple of /fun's split out from the rest.
    Spritesheet("mylittleandysonic1_misc17", "http://a.thumbs.redditmedia.com/oKR1l6L29UAOWRwB.png", emote_list({
        "/artfun":              (212, 166, -2, -2),
        "/bryvoodfun":          (212, 166, -2, -170),
        "/pixelfun":            (212, 166, -2, -338)
        })),

    # FIXME: Omitted from here: the text coloring stuff.

    Spritesheet("mylittleandysonic1_misc18", "http://f.thumbs.redditmedia.com/yncP92ucLKCxJ1t_.png", emote_list({
        "/hoppy":               (105, 157, 0, 0)
        })),

    ########################################################################
    ##
    ## R/MYLITTLEWTF
    ##
    ########################################################################

    # FIXME: Omitted
    # - The -blink! modifier
    # - /ioib (missing)
    # - /ryourface (missing)

    # Various animotes
    Spritesheet("mylittlewtf_shuffle", "http://c.thumbs.redditmedia.com/DO1kW--Q7aOtgd7J.png", emote_list({
        "/shuffle":             (225, 300, 0, 0)
        })),
    Spritesheet("mylittlewtf_nopespin", "http://e.thumbs.redditmedia.com/n-BFOLNGx0d2K49v.png", emote_list({
        "/nopespin":            (300, 301, 0, 0)
        })),
    Spritesheet("mylittlewtf_animote", "http://c.thumbs.redditmedia.com/YaBC0ntaYvWgrkIh.png", emote_list({
        "/animote":             (255, 171, 0, 0)
        })),

    # There's a lot more in this sheet, but they don't have emotes anymore
    Spritesheet("mylittlewtf_spidey", "http://b.thumbs.redditmedia.com/Vxm1zWOFEkWjNz8C.jpg", emote_list({
        "/spidey":              (293, 198, -472, 0),
        "/spidey2":             (197, 299, -4, -2)
        })),

    Spritesheet("mylittlewtf_thefack", "http://f.thumbs.redditmedia.com/0m9p9dtDTXXb_0aq.png", emote_list({
        "/thefack":             (770, 136, 0, 0)
        })),
    Spritesheet("mylittlewtf_orschemote", "http://b.thumbs.redditmedia.com/2Tde7I6xFl9W0aoI.png", emote_list({
        "/orschemote":          (300, 400, 0, 0)
        })),

    # Misc emotes
    Spritesheet("mylittlewtf_misc1", "http://b.thumbs.redditmedia.com/TiiUeMVjYgIblgg1.png", emote_list({
        "/1g":                  (60, 85, -2, -2),
        "/3a":                  (178, 86, -64, -2),
        "/2e":                  (85, 89, -244, -2),
        "/grumpytwi":           (84, 90, -331, -2),
        "/1h":                  (146, 96, -417, -2),
        "/2i":                  (91, 99, -565, -2),
        "/3h":                  (88, 100, -658, -2),
        "/3g":                  (95, 100, -748, -2),
        "/2f":                  (100, 100, -845, -2),
        "/ajraep":              (80, 100, -2, -104),
        "/dashraep":            (93, 100, -84, -104),
        "/twiraep":             (98, 100, -179, -104),
        "/rarraep":             (90, 100, -279, -104),
        "/shyraep":             (104, 100, -371, -104),
        "/pieraep":             (93, 100, -477, -104),
        "/1f":                  (73, 100, -572, -104),
        "/2g":                  (109, 101, -647, -104),
        "/1b":                  (134, 103, -758, -104),
        "/3b":                  (90, 105, -894, -104),
        "/1a":                  (76, 139, -2, -211),
        "/yourface":            (167, 140, -80, -211),
        "/flutterbucket":       (167, 140, -80, -211),
        "/2j":                  (167, 140, -80, -211),
        "/1j":                  (76, 140, -249, -211),
        "/1e":                  (138, 147, -327, -211),
        "/335":                 (138, 147, -327, -211),
        "/2b":                  (132, 149, -467, -211),
        "/1c":                  (102, 150, -601, -211),
        "/2h":                  (69, 150, -705, -211),
        "/3k":                  (135, 150, -776, -211),
        "/3j":                  (110, 150, -2, -363),
        "/3i":                  (140, 150, -114, -363),
        "/2d":                  (125, 150, -256, -363),
        "/3d":                  (108, 150, -383, -363),
        "/3c":                  (105, 150, -493, -363),
        "/3e":                  (78, 150, -600, -363),
        "/3f":                  (76, 150, -680, -363),
        "/1i":                  (134, 151, -758, -363),
        "/ioi":                 (134, 151, -758, -363),
        "/2c":                  (140, 151, -2, -516),
        "/pptoothover":         (158, 151, -144, -516),
        "/2a":                  (158, 151, -144, -516),
        "/1k":                  (136, 154, -304, -516),
        "/2k":                  (88, 154, -442, -516),
        "/1d":                  (81, 154, -532, -516)
        })),
    CustomCss("mylittleandysonic1_misc1", "pptoothover:hover", {
        "background-image": "url(http://b.thumbs.redditmedia.com/LxzHhnJr-rZAeIbU.png)",
        "width": "163px", "height": "153px", "background-position": "-557px -477px"
        }),

    # Misc emotes, and the Halloween ones.
    Spritesheet("mylittlewtf_misc2", "http://a.thumbs.redditmedia.com/5BAxBli-SHRFVODB.png", emote_list({
        "/4a":                  (159, 151, -2, -2),
        "/4b":                  (144, 150, -163, -2),
        "/4c":                  (253, 150, -309, -2),
        "/4d":                  (138, 150, -564, -2),
        "/4e":                  (150, 150, -704, -2),
        "/4f":                  (119, 150, -856, -2),
        "/4g":                  (189, 200, -2, -155),
        "/4h":                  (140, 151, -193, -155),
        "/4i":                  (69, 150, -335, -155),
        "/4j":                  (120, 148, -406, -155),
        "/4k":                  (211, 200, -528, -155),
        "/4l":                  (335, 150, -2, -357),
        "/5a":                  (92, 100, -339, -357),
        "/5b":                  (71, 100, -433, -357),
        "/5c":                  (148, 151, -506, -357),
        "/5d":                  (154, 150, -656, -357),
        "/5e":                  (110, 150, -812, -357),
        "/5f":                  (140, 152, -2, -510),
        "/5g":                  (151, 150, -144, -510),
        "/5h":                  (120, 150, -297, -510),
        "/5i":                  (137, 150, -419, -510),
        "/5j":                  (88, 105, -558, -510),
        "/5k":                  (109, 154, -648, -510),
        "/applehat":            (109, 100, -759, -510),
        "/rdoubledragon":       (70, 70, -870, -510),
        "/doubledragon":        (70, 70, -870, -510),
        "/rdoublespike":        (70, 70, -870, -510),
        "/doublespike":         (70, 70, -870, -510),
        "/rpeckypie":           (70, 70, -942, -510),
        "/rpeckiepie":          (70, 70, -942, -510),
        "/peckypie":            (70, 70, -942, -510),
        "/peckiepie":           (70, 70, -942, -510),
        "/rrdshadowbolt":       (70, 70, -2, -666),
        "/rdshadowbolt":        (70, 70, -2, -666),
        "/rscarecrowjack":      (70, 70, -74, -666),
        "/scarecrowjack":       (70, 70, -74, -666),
        "/rstarswirl":          (70, 70, -146, -666),
        "/starswirl":           (70, 70, -146, -666)
        })),

    # Misc emotes
    Spritesheet("mylittlewtf_misc3", "http://f.thumbs.redditmedia.com/iUX64LF8j-6kbJZq.png", emote_list({
        "/335b":                (74, 149, -2, -2),
        "/335c":                (77, 100, -78, -2),
        "/aboooh":              (65, 125, -157, -2),
        "/adorajack":           (97, 100, -224, -2),
        "/ajcider":             (134, 165, -323, -2),
        "/yopiegimmeafreshbeat": (175, 117, -459, -2),
        "/bootsncats":          (175, 117, -459, -2),
        "/canit":               (150, 119, -636, -2),
        "/cod":                 (150, 150, -788, -2),
        "/dashhfof":            (127, 100, -2, -169),
        "/derpwat":             (75, 150, -131, -169),
        "/deviouspie":          (150, 145, -399, -169),
        "/dgusta":              (70, 72, -551, -169),
        "/duck":                (86, 80, -623, -169),
        "/grinaloo":            (107, 104, -711, -169),
        "/grumpybloom":         (79, 90, -820, -169),
        "/grumpypie":           (75, 90, -901, -169),
        "/grumpyrar":           (78, 90, -2, -321),
        "/grumpyscoot":         (81, 90, -82, -321),
        "/grumpyshy":           (87, 90, -165, -321),
        "/grumpytia":           (107, 90, -254, -321),
        "/hipsterpie":          (84, 100, -363, -321),
        "/oinkoink":            (100, 175, -449, -321),
        "/onewat":              (105, 105, -551, -321),
        "/ppdance":             (150, 125, -658, -321),
        "/pppie":               (137, 100, -810, -321),
        "/ppplot":              (150, 86, -2, -498),
        "/ppsurprise":          (115, 150, -154, -498),
        "/prettypony":          (70, 75, -271, -498),
        "/roseeyes":            (97, 100, -343, -498),
        "/rosetough":           (104, 160, -442, -498),
        "/rppsalute":           (173, 150, -548, -498),
        "/rworstpony":          (70, 100, -723, -498),
        "/scootasad":           (106, 125, -795, -498),
        "/slumberparty":        (97, 76, -903, -498),
        "/sparkwat":            (90, 100, -2, -660),
        "/speedy":              (101, 125, -94, -660),
        "/spikestache":         (66, 100, -197, -660),
        "/spikeyu":             (71, 100, -265, -660),
        "/teehee":              (76, 70, -338, -660),
        "/twipoker":            (118, 110, -416, -660),
        "/umyeah":              (76, 100, -536, -660),
        "/whyhello":            (121, 100, -614, -660),
        "/rzoidberg":           (70, 69, -737, -660),
        "/zoidberg":            (70, 69, -737, -660)
        })),

    # Misc emotes
    Spritesheet("mylittlewtf_misc4", "http://b.thumbs.redditmedia.com/LxzHhnJr-rZAeIbU.png", emote_list({
        "/5ofclubs":            (174, 175, -2, -2),
        "/bonsing":             (127, 151, -178, -2),
        "/derpsess":            (167, 200, -307, -2),
        "/lunasalute":          (186, 155, -476, -2),
        "/lyplay":              (232, 203, -664, -2),
        "/lyrawithit":          (239, 268, -2, -207),
        "/ootdluna":            (127, 155, -243, -207),
        "/parrrtycannon":       (133, 175, -372, -207),
        "/piplean":             (196, 167, -507, -207),
        "/ppjam":               (203, 200, -705, -207),
        "/ppsalute":            (187, 150, -2, -477),
        "/ppshocked":           (250, 168, -191, -477),
        "/ppshock":             (250, 168, -191, -477),
        "/pudding":             (112, 154, -443, -477),
        "/rpptoothover":        (163, 153, -557, -477),
        "/r2a":                 (163, 153, -557, -477),
        "/royalpain":           (203, 175, -722, -477),
        "/shyrose":             (133, 150, -2, -654),
        "/shystrut":            (187, 150, -137, -654),
        "/sursprisesalute":     (195, 150, -326, -654),
        "/sursalute":           (195, 150, -326, -654),
        "/this":                (128, 166, -523, -654),
        "/trix1":               (205, 142, -653, -654)
        })),
    CustomCss("mylittleandysonic1_misc4", "rpptoothover:hover", {
        "background-image": "url(http://b.thumbs.redditmedia.com/TiiUeMVjYgIblgg1.png)",
        "width": "158px", "height": "151px", "background-position": "-144px -516px"
        }),

    # Misc emotes
    Spritesheet("mylittlewtf_misc5", "http://e.thumbs.redditmedia.com/3NoiDkrAVyPz_2hv.png", emote_list({
        "/abchill":             (112, 100, -2, -2),
        "/angrypie":            (169, 154, -116, -2),
        "/berrysmug":           (129, 150, -287, -2),
        "/damusics":            (160, 150, -418, -2),
        "/dashconfused":        (150, 147, -580, -2),
        "/dashhug":             (162, 175, -732, -2),
        "/disdrink":            (174, 160, -2, -179),
        "/flapple":             (150, 142, -178, -179),
        "/flutterdance":        (130, 150, -330, -179),
        "/foreverpie":          (96, 150, -462, -179),
        "/flutterrape":         (207, 203, -560, -179),
        "/molestshy":           (207, 203, -560, -179),
        "/ppoutofnowhere":      (150, 144, -769, -179),
        "/pinkieoutofnowhere":  (150, 144, -769, -179),
        "/ppshiteater":         (134, 150, -2, -384),
        "/rarsalute":           (176, 149, -138, -384),
        "/rartears":            (106, 100, -316, -384),
        "/rflutterbucket":      (154, 152, -424, -384),
        "/rosesmug":            (149, 150, -580, -384),
        "/rosewat":             (203, 150, -731, -384),
        "/shydaw":              (96, 175, -2, -538),
        "/shyexcited":          (211, 150, -100, -538),
        "/stageleft":           (197, 200, -484, -538),
        "/stretch":             (238, 154, -683, -538),
        "/surreally":           (151, 147, -2, -740),
        "/twidance":            (126, 150, -155, -740),
        "/twidrunk":            (145, 160, -283, -740),
        "/twigrimace":          (106, 100, -430, -740),
        "/twisquee":            (108, 175, -538, -740),
        "/twistsalute":         (140, 130, -648, -740)
        })),

    # Misc emotes
    Spritesheet("mylittlewtf_misc6", "http://d.thumbs.redditmedia.com/nUjvozHB3_MDN-3E.png", emote_list({
        "/335a":                (195, 156, -2, -2),
        "/bawkwithit":          (279, 268, -199, -2),
        "/bonwithit":           (243, 268, -480, -2),
        "/ididntputthoseinmybagwithit": (243, 268, -480, -2),
        "/boxedluna":           (247, 152, -725, -2),
        "/brony":               (202, 160, -2, -272),
        "/pinkiehover":         (202, 160, -2, -272),
        "/rpinkiehover":        (185, 160, -206, -272),
        "/brony2":              (185, 160, -206, -272),
        "/dat":                 (209, 150, -393, -272),
        "/dosh":                (160, 141, -604, -272),
        "/ioia":                (160, 150, -766, -272),
        "/rdfriendship":        (149, 201, -2, -434),
        "/mahhorn":             (149, 201, -2, -434),
        "/pants":               (171, 200, -153, -434),
        "/rareew":              (127, 150, -326, -434),
        "/rargrin":             (180, 150, -455, -434),
        "/rbawkwithit":         (279, 268, -637, -434),
        "/sweetcelestia":       (320, 200, -2, -704),
        "/thatswhatisaid":      (175, 175, -324, -704)
        })),
    # These two swap on hover
    CustomCss("mylittleandysonic1_misc6", "pinkiehover:hover", {
        "width": "185px", "height": "160px", "background-position": "-206px -272px"
        }),
    CustomCss("mylittleandysonic1_misc6", "rpinkiehover:hover", {
        "width": "185px", "height": "160px", "background-position": "-206px -272px"
        }),

    # Misc emotes
    Spritesheet("mylittlewtf_misc7", "http://b.thumbs.redditmedia.com/kdJoi5VIytPv5HhO.png", emote_list({
        "/chess":               (306, 150, -2, -2),
        "/dashdrunk":           (255, 175, -310, -2),
        "/lawl":                (330, 128, -567, -2),
        "/darqwolff":           (330, 128, -567, -2),
        "/offthewagon":         (288, 175, -2, -179),
        "/pon3withit":          (246, 268, -292, -179),
        "/ppcandy":             (156, 200, -540, -179),
        "/ppnewhere":           (191, 250, -698, -179),
        "/ppnew":               (191, 250, -698, -179),
        "/ppumad":              (250, 182, -2, -449),
        "/rarhmph":             (269, 150, -254, -449),
        "/tia1":                (204, 200, -525, -449),
        "/twieyes":             (334, 203, -2, -651)
        })),

    # The "NO" sheet and a couple misc emotes.
    Spritesheet("mylittlewtf_no", "http://f.thumbs.redditmedia.com/tjuUEa-adJZDqct_.png", emote_list({
        "/bird":                (167, 250, -2, -2),
        "/lunano":              (198, 200, -171, -2),
        "/tiano":               (198, 200, -371, -2),
        "/ppno":                (220, 200, -571, -2),
        "/rarno":               (220, 200, -793, -2),
        "/sbno":                (220, 200, -2, -254),
        "/scootno":             (220, 200, -224, -254),
        "/lyrano":              (220, 200, -446, -254),
        "/abno":                (220, 200, -668, -254),
        "/bonno":               (220, 200, -2, -456),
        "/wop":                 (220, 200, -224, -456),
        "/dashno":              (220, 200, -446, -456),
        "/flutno":              (220, 200, -668, -456),
        "/ajno":                (222, 200, -2, -658),
        "/derpno":              (227, 200, -226, -658),
        "/rlyrano":             (255, 200, -455, -658),
        "/dontask":             (270, 150, -712, -658)
        })),

    # The tableflip sheet and a couple misc emotes.
    Spritesheet("mylittlewtf_flip", "http://b.thumbs.redditmedia.com/DyA4zhqo3sFazT67.png", emote_list({
        "/allthetables":        (1011, 603, 0, 0),
        "/scootflip":           (179, 130, -2, -2),
        "/sbflip":              (179, 130, -183, -2),
        "/abflip":              (179, 130, -364, -2),
        "/flutflip":            (200, 134, -545, -2),
        "/shyflip":             (200, 134, -545, -2),
        "/octflip":             (200, 134, -747, -2),
        "/rarflip":             (199, 145, -2, -138),
        "/lyraflip":            (199, 145, -203, -138),
        "/rderpflip":           (177, 145, -404, -138),
        "/pieflip":             (200, 145, -583, -138),
        "/lunaflip":            (171, 145, -785, -138),
        "/ajflip":              (187, 145, -2, -285),
        "/berryflip":           (199, 145, -191, -285),
        "/dashflip":            (200, 145, -392, -285),
        "/bonflip":             (199, 145, -594, -285),
        "/karmaflip":           (199, 145, -795, -285),
        "/derpflip":            (200, 145, -2, -432),
        "/disflip":             (199, 145, -204, -432),
        "/dpflip":              (199, 145, -204, -432),
        "/roseflip":            (200, 146, -405, -432),
        "/tiaflip":             (200, 169, -607, -432),
        "/pon3flip":            (200, 145, -812, -451),
        "/scratchflip":         (200, 145, -812, -451),
        "/vsflip":              (200, 145, -812, -451),
        "/hothorn":             (253, 248, -2, -634),
        "/somethingnotretarded": (253, 248, -2, -634),
        "/notone":              (205, 205, -269, -643)
        })),

    Spritesheet("mylittlewtf_misc8", "http://d.thumbs.redditmedia.com/P-kuHC-BgmPMCOlc.png", emote_list({
        "/derpysalute":         (172, 139, -2, -2),
        "/twisalute":           (204, 139, -176, -2),
        "/shysalute":           (162, 139, -382, -2),
        "/ajsalute":            (146, 143, -546, -2),
        "/moar":                (150, 150, -694, -2),
        "/berrygasp":           (119, 150, -846, -2),
        "/rosesit":             (131, 150, -2, -154),
        "/fluffy":              (154, 150, -135, -154),
        "/ppthis":              (178, 150, -291, -154),
        "/roseflirt":           (105, 150, -471, -154),
        "/ppwooo":              (88, 150, -578, -154),
        "/rosestrut":           (188, 150, -668, -154),
        "/ajpose":              (101, 150, -858, -154),
        "/fancyfluff":          (137, 165, -2, -306),
        "/ppelementary":        (162, 175, -141, -306),
        "/surwtf":              (173, 175, -305, -306),
        "/shyrock":             (167, 200, -480, -306),
        "/ninjapie":            (124, 200, -649, -306),
        "/sofresh":             (207, 200, -775, -306)
        })),

    # FimFiction emotes and one misc
    Spritesheet("mylittlewtf_fimfic", "http://d.thumbs.redditmedia.com/nu5cNR2hHVjZXXwi.png", emote_list({
        "/ff00":                (27, 27, -1, -1),
        "/ajbemused":           (27, 27, -1, -1),
        "/ff01":                (27, 27, -29, -1),
        "/ajsleepy":            (27, 27, -29, -1),
        "/ff02":                (27, 27, -57, -1),
        "/fimajsmug":           (27, 27, -57, -1),
        "/ff03":                (34, 27, -85, -1),
        "/applecry":            (34, 27, -85, -1),
        "/ff04":                (27, 27, -120, -1),
        "/applejackconfused":   (27, 27, -120, -1),
        "/ff05":                (27, 27, -148, -1),
        "/applejackunsure":     (27, 27, -148, -1),
        "/coolphoto":           (27, 27, -176, -1),
        "/ff10":                (27, 27, -176, -1),
        "/derpyderp1":          (27, 27, -204, -1),
        "/ff11":                (27, 27, -204, -1),
        "/derpyderp2":          (27, 27, -1, -29),
        "/ff12":                (27, 27, -1, -29),
        "/derpytongue2":        (27, 27, -29, -29),
        "/ff13":                (27, 27, -29, -29),
        "/fimduck":             (27, 27, -57, -29),
        "/ff14":                (27, 27, -57, -29),
        "/fimeeyup":            (27, 27, -85, -29),
        "/ff15":                (27, 27, -85, -29),
        "/fimfacehoof":         (27, 27, -113, -29),
        "/ff20":                (27, 27, -113, -29),
        "/fluttercry":          (27, 27, -141, -29),
        "/ff21":                (27, 27, -141, -29),
        "/flutterrage":         (27, 27, -169, -29),
        "/ff22":                (27, 27, -169, -29),
        "/fluttershbad":        (27, 27, -197, -29),
        "/ff23":                (27, 27, -197, -29),
        "/ff24":                (27, 27, -225, -29),
        "/fluttershyouch":      (27, 27, -225, -29),
        "/fluttershysad":       (27, 27, -1, -57),
        "/ff25":                (27, 27, -1, -57),
        "/ff30":                (27, 27, -29, -57),
        "/heart":               (27, 27, -29, -57),
        "/ff31":                (27, 27, -57, -57),
        "/moustache":           (27, 27, -57, -57),
        "/ff32":                (27, 27, -85, -57),
        "/pinkiecrazy":         (27, 27, -85, -57),
        "/ff33":                (27, 27, -113, -57),
        "/pinkiegasp":          (27, 27, -113, -57),
        "/ff34":                (27, 27, -141, -57),
        "/pinkiehappy":         (27, 27, -141, -57),
        "/ff35":                (27, 27, -169, -57),
        "/pinkiesad2":          (27, 27, -169, -57),
        "/pinkiesick":          (27, 27, -197, -57),
        "/ff40":                (27, 27, -197, -57),
        "/pinkiesmile":         (27, 27, -225, -57),
        "/ff41":                (27, 27, -225, -57),
        "/rainbowderp":         (27, 27, -1, -85),
        "/ff42":                (27, 27, -1, -85),
        "/rainbowdetermined2":  (27, 27, -29, -85),
        "/ff43":                (27, 27, -29, -85),
        "/rainbowhuh":          (27, 27, -57, -85),
        "/ff44":                (27, 27, -57, -85),
        "/rainbowkiss":         (27, 27, -85, -85),
        "/ff45":                (27, 27, -85, -85),
        "/ff50":                (27, 27, -113, -85),
        "/rainbowlaugh":        (27, 27, -113, -85),
        "/ff51":                (27, 27, -141, -85),
        "/rainbowwild":         (27, 27, -141, -85),
        "/raritycry":           (27, 27, -169, -85),
        "/ff52":                (27, 27, -169, -85),
        "/raritydespair":       (27, 27, -197, -85),
        "/ff53":                (27, 27, -197, -85),
        "/raritystarry":        (27, 27, -225, -85),
        "/ff54":                (27, 27, -225, -85),
        "/raritywink":          (27, 27, -1, -113),
        "/ff55":                (27, 27, -1, -113),
        "/ff60":                (27, 27, -29, -113),
        "/scootangel":          (27, 27, -29, -113),
        "/ff61":                (27, 27, -57, -113),
        "/trixieshiftleft":     (27, 27, -57, -113),
        "/ff62":                (27, 27, -85, -113),
        "/trixieshiftright":    (27, 27, -85, -113),
        "/trollestia":          (27, 27, -113, -113),
        "/ff63":                (27, 27, -113, -113),
        "/twilightangry2":      (27, 27, -141, -113),
        "/ff64":                (27, 27, -141, -113),
        "/twilightblush":       (27, 27, -169, -113),
        "/ff65":                (27, 27, -169, -113),
        "/ff70":                (27, 27, -197, -113),
        "/twilightoops":        (27, 27, -197, -113),
        "/ff71":                (27, 27, -225, -113),
        "/twilightsheepish":    (27, 27, -225, -113),
        "/ff72":                (27, 27, -1, -141),
        "/twilightsmile":       (27, 27, -1, -141),
        "/twistnerd":           (27, 27, -29, -141),
        "/ff73":                (27, 27, -29, -141),
        "/ff74":                (27, 27, -57, -141),
        "/unsuresweetie":       (27, 27, -57, -141),
        "/ff75":                (27, 27, -85, -141),
        "/fimyay":              (27, 27, -85, -141),
        "/crash":               (235, 300, -10, -180)
        })),

    ########################################################################
    ##
    ## R/MLAS1ANIMOTES
    ##
    ########################################################################

    Spritesheet("mlas1animotes_twiflap", "http://e.thumbs.redditmedia.com/V6TdoeTKrFPSBjlL.png", emote_list({
        "/twiflap":             (132, 150, 0, 0),
        })),

    Spritesheet("mlas1animotes_twitwitch", "http://e.thumbs.redditmedia.com/338-FevkfSq5Hn-d.png", emote_list({
        "/twitwitch":           (122, 150, 0, 0),
        })),

    Spritesheet("mlas1animotes_ppexcited", "http://a.thumbs.redditmedia.com/HmujMG3EgOuxYDtN.png", emote_list({
        "/ppexcited":           (119, 150, 0, 0),
        "/andyisanasshat":      (119, 150, 0, 0),
        })),

    Spritesheet("mlas1animotes_ajchew", "http://c.thumbs.redditmedia.com/pTE4BmzRuqQPqADV.png", emote_list({
        "/ajchew":              (144, 150, 0, 0),
        })),

    Spritesheet("mlas1animotes_twiexcited", "http://e.thumbs.redditmedia.com/IsUkEo-UQS64IKHv.png", emote_list({
        "/twiexcited":          (194, 150, 0, 0),
        "/twilightsparkle":     (194, 150, 0, 0),
        })),

    Spritesheet("mlas1animotes_raritwitch", "http://e.thumbs.redditmedia.com/10s1wYJ0wz7vpAY4.png", emote_list({
        "/raritwitch":          (154, 150, 0, 0),
        })),

    Spritesheet("mlas1animotes_pphugs", "http://b.thumbs.redditmedia.com/sLXwSaJcbEdv76p7.png", emote_list({
        "/pphugs":              (173, 150, 0, 0),
        })),

    Spritesheet("mlas1animotes_spikewoo", "http://e.thumbs.redditmedia.com/nlSFOkc1ljcWtlhj.png", emote_list({
        "/spikewoo":            (200, 150, 0, 0),
        })),

    Spritesheet("mlas1animotes_derpydance", "http://d.thumbs.redditmedia.com/8TcXcx901sYChQSu.png", emote_list({
        "/derpydance":          (164, 150, 0, 0),
        })),

    Spritesheet("mlas1animotes_rimshot", "http://e.thumbs.redditmedia.com/5wqZ20GOjQg6yr5R.png", emote_list({
        "/rimshot":             (303, 193, 0, 0),
        })),

    Spritesheet("mlas1animotes_twirun", "http://b.thumbs.redditmedia.com/fs0j48KX--XRpppm.png", emote_list({
        "/twirun":              (400, 300, 0, 0),
        })),

    Spritesheet("mlas1animotes_lickiepie", "http://a.thumbs.redditmedia.com/dXxUjfiQmb8yxPrr.png", emote_list({
        "/lickiepie":           (225, 200, 0, 0),
        })),

    Spritesheet("mlas1animotes_derpslide", "http://a.thumbs.redditmedia.com/goAKSOXLP0ILuguf.png", emote_list({
        "/derpslide":           (241, 175, 0, 0),
        })),

    Spritesheet("mlas1animotes_pomf", "http://d.thumbs.redditmedia.com/cTcPFv9lEqs9Nr0K.png", emote_list({
        "/pomf":                (400, 300, 0, 0),
        })),

    Spritesheet("mlas1animotes_twiderp", "http://b.thumbs.redditmedia.com/8FxN4kPpfiuE4pX7.png", emote_list({
        "/twiderp":             (213, 150, 0, 0),
        })),

    Spritesheet("mlas1animotes_giggle", "http://b.thumbs.redditmedia.com/TzIFbSLYpQ65ucMC.png", emote_list({
        "/giggle":              (108, 144, 0, 0),
        })),

    Spritesheet("mlas1animotes_heyyeah", "http://e.thumbs.redditmedia.com/Hv2HmSDtbj2N4_3X.png", emote_list({
        "/heyyeah":             (200, 200, 0, 0),
        })),

    Spritesheet("mlas1animotes_pptwitcha", "http://e.thumbs.redditmedia.com/dVE2Rbx5nq_lXD3v.png", emote_list({
        "/pptwitcha":           (163, 179, 0, 0),
        })),

    Spritesheet("mlas1animotes_fswb", "http://d.thumbs.redditmedia.com/jbMarIOi-_cCQIRW.png", emote_list({
        "/fswb":                (300, 218, 0, 0),
        })),

    Spritesheet("mlas1animotes_twipeck", "http://b.thumbs.redditmedia.com/RA9Zn-msZFd5ZeQs.png", emote_list({
        "/twipeck":             (150, 150, 0, 0),
        })),

    Spritesheet("mlas1animotes_lbspin", "http://b.thumbs.redditmedia.com/FQVAiaNq3kkczVEy.png", emote_list({
        "/lbspin":              (150, 150, 0, 0),
        })),

    Spritesheet("mlas1animotes_ajready", "http://e.thumbs.redditmedia.com/7AEmwnBz23hEWx9F.png", emote_list({
        "/ajready":             (118, 120, 0, 0),
        })),

    Spritesheet("mlas1animotes_twihorror", "http://f.thumbs.redditmedia.com/49mGMFqdpTe_-bLY.png", emote_list({
        "/twihorror":           (171, 175, 0, 0),
        })),

    Spritesheet("mlas1animotes_ajlol", "http://d.thumbs.redditmedia.com/xkP0rhw12lG1H6QQ.png", emote_list({
        "/ajlol":               (156, 175, 0, 0),
        })),

    Spritesheet("mlas1animotes_octcake", "http://b.thumbs.redditmedia.com/Wo8GACMOwWutYTRU.png", emote_list({
        "/octcake":             (150, 200, 0, 0),
        })),

    Spritesheet("mlas1animotes_pprage", "http://a.thumbs.redditmedia.com/iWdDfA389r5vAHAl.png", emote_list({
        "/pprage":              (368, 200, 0, 0),
        })),

    Spritesheet("mlas1animotes_ppshuffle", "http://a.thumbs.redditmedia.com/tEeEaQZOEDKb5sNZ.png", emote_list({
        "/ppshuffle":           (225, 200, 0, 0),
        })),

    Spritesheet("mlas1animotes_twifly", "http://e.thumbs.redditmedia.com/xj0jHJeWLpKvN4LF.png", emote_list({
        "/twifly":              (149, 127, 0, 0),
        })),

    Spritesheet("mlas1animotes_floatyesplin", "http://b.thumbs.redditmedia.com/2npjiT9Fm6QHKshs.png", emote_list({
        "/floatyesplin":        (159, 222, 0, 0),
        })),

    Spritesheet("mlas1animotes_dashcheer", "http://b.thumbs.redditmedia.com/9DPsf8nYEv0KQBig.png", emote_list({
        "/dashcheer":           (350, 200, 0, 0),
        }))

    ########################################################################
    ##
    ## END OF EMOTES
    ##
    ########################################################################
    ]
