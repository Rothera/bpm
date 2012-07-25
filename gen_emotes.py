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
## Expected conflict warnings while running this script:
##
##     /gilda: in both r/mylittlepony and r/mylittleandysonic1.
##     /manlytears: same
##         These both work reasonably correctly anyway, because r/mlp uses
##         !important on all their emotes. So they get their /gilda and
##         everywhere else gets mlas1's.
##
##

import argparse
import time
import sys

timestamp = time.strftime("Generated at %c.")

# A map of selectors to dicts of properties, e.g.
#     {".something:hover": {"color": "red"}}
css_bits = {}
# A map of emote names (including /) to CSS classes, e.g.
#     {"/b03": ".betterponymotes-mylittlepony_b-b03"}
emote_map = {}

def make_selector(sheet_name, name):
    """
    Combines a prefix and an emote name and some other stuff to make a
    pretty CSS class. (Includes the initial '.'.)
    """
    # TODO: strip out all chars not valid in CSS, just in case
    return ".betterponymotes-%s-%s" % (sheet_name, name.lstrip("/"))

def add_emote(sheet_name, name, data):
    """
    Adds an emote to the database, along with its associated CSS.

    This does nothing fancy and you probably want add_simple_emote instead.
    """
    assert name[0] == "/"
    selector = make_selector(sheet_name, name)
    assert selector not in css_bits
    if name in emote_map:
        print("Warning: %s defined more than once" % (name))
    css_bits[selector] = data
    emote_map[name] = selector

def add_simple_emote(sheet_name, name, image_url, emote_size, position, extra_properties={}):
    """
    Adds a single emote.

    sheet_name: Name of the sheet, e.g. "mylittlepony_a".
    emote_name: Name of the emote.
    image_url: The background-image address.
    emote_size: The (x, y) size of each emote in the grid.
    position: The (x, y) offset into the image (should be negative, like CSS).
    extra_properties: Any extra CSS you want to apply to be merged in.
    """
    coords = "%spx %spx" % position
    data = {
        "display": "block",
        "clear": "none",
        "float": "left",
        "width": "%spx" % (emote_size[0]),
        "height": "%spx" % (emote_size[1]),
        "background-image": "url(%s)" % (image_url),
        "background-position": coords
        }
    data.update(extra_properties)

    add_emote(sheet_name, name, data)

def add_sheet(sheet_name, image_url, emote_size, emotes, extra_properties={}):
    """
    Adds a spritesheet full of emotes (grid format) all in one go.

    sheet_name: Name of the sheet, e.g. "mylittlepony_a".
    image_url: The background-image address.
    emote_size: The (x, y) size of each emote in the grid.
    emotes: A 2d list of emote aliases. This is laid out the way it is in the
        image; for example:
            ((("topleft", "00"), ("topright", "10")),
             ("bottomleft", "01"), ("bottomright", "11")))
    extra_properties: Any extra CSS you want to apply to be merged in.
    """
    for (y, row) in enumerate(emotes):
        for (x, emote_aliases) in enumerate(row):
            for emote_name in emote_aliases:
                coords = (-emote_size[0] * x, -emote_size[1] * y)
                add_simple_emote(sheet_name, emote_name, image_url, emote_size, coords, extra_properties)

def add_weird_sheet(sheet_name, image_url, emotes, extra_properties={}):
    """
    Adds a spritesheet full of emotes, arbitrarily laid out, all in one go.

    The usage of this function is similar to add_sheet, except "emotes" is a
    dict mapping emote names to (width, height, x_offset, y_offset) tuples.
    (x_offset and y_offset should be negative, just as they are in the CSS.)
    For example, (199, 129, -292, 0)

    (The emote_size paramter is omitted as it is obviously not applicable.)
    """
    common = {
        "display": "block",
        "clear": "none",
        "float": "left",
        "background-image": "url(%s)" % (image_url)
        }
    common.update(extra_properties)

    for (emote_name, positioning) in emotes.items():
        width, height, x_offset, y_offset = positioning
        # Probably correct
        assert x_offset <= 0
        assert y_offset <= 0

        coords = "%spx %spx" % (x_offset, y_offset)
        data = {
            "background-position": coords,
            "width": width,
            "height": height
            }
        data.update(common)
        add_emote(sheet_name, emote_name, data)

def add_custom_css(selector, properties):
    """
    Adds some special custom CSS.

    This does nothing fancy.
    """
    assert selector not in css_bits
    css_bits[selector] = properties

def format_css(selector, properties):
    """
    Formats a property dictionary into a ".class { ... }" string.
    """
    props_str = " ".join("%s: %s;" % (prop, value) for (prop, value) in properties.items())
    return "%s { %s }" % (selector, props_str)

def dump_css(file):
    lines = (format_css(selector, properties) for (selector, properties) in css_bits.items())
    file.write(
"""
/*
 * This file is AUTOMATICALLY GENERATED. DO NOT EDIT.
 * %s
 */

%s
""" % (timestamp, "\n".join(lines)))

def dump_emote_map(file):
    # Strip off leading '.' because the addClass() call we use in the addon JS
    # doesn't expect one.
    strings = ("%r: %r" % (name, selector[1:]) for (name, selector) in emote_map.items())
    file.write(
"""
/*
 * This file is AUTOMATICALLY GENERATED. DO NOT EDIT.
 * %s
 */

var emote_map = {
    %s
}
""" % (timestamp, ",\n    ".join(strings)))

################################################################################
##
## R/MYLITTLEPONY
##
################################################################################

# A sheet
add_sheet("mylittlepony_a", "http://b.thumbs.redditmedia.com/DW12xf1EuQi8VRcI.png", (70, 70), (
    (("/a00", "/ajlie"), ("/a10", "/priceless"), ("/a20", "/flutterjerk")),
    (("/a01", "/twipride"), ("/a11", "/celestiamad"), ("/a21", "/twicrazy")),
    (("/a02", "/lunateehee"), ("/a12", "/lunawait"), ("/a22", "/paperbagderpy", "/paperbagwizard", "/derpwizard")),
    (("/a03", "/ajhappy", "/happlejack"), ("/a13", "/ppfear"), ("/a23", "/twibeam")),
    (("/a04", "/raritydaww"), ("/a14", "/scootacheer", "/lootascoo")), # /a24 and /swagintosh are the third one, but overridden later
    (("/a05", "/ajsup", "/ajwhatsgood"), ("/a15", "/flutterwhoa", "/flutterwoah"), ("/a25", "/rdsad", "/rdcry")),
    (("/a06", "/ohcomeon", "/sbcomeon"), ("/a16", "/ppcute", "/cutiepie"), ("/a26", "/abbored", "/abmerp")),
    (("/a07", "/raritypaper", "/raritynews"), ("/a17", "/sbbook", "/sweetiebook"), ("/a27", "/scootaplease", "/scootappeal", "/scootaplz")),
    (("/a08", "/twiright", "/satistwied"), ("/a18", "/celestiawut", "/wutlestia"), ("/a28", "/grannysmith", "/granny", "/oldmareyellsatcloud")),
    (("/a09", "/shiningarmor", "/shiningarmour"), ("/a19", "/chrysalis", "/queenchrysalis", "/changlingqueen"),
        ("/a29", "/cadence", "/cadance", "/princesscadence", "/princesscadance", "/princessmiamorecadenza"))
    ))


# Reversed A sheet
# If I were smart, this wouldn't just be a copy&paste.
add_sheet("mylittlepony_a_r", "http://c.thumbs.redditmedia.com/QNdAer5mOCS_f1-J.png", (70, 70), (
    (("/ra00", "/rajlie"), ("/ra10", "/rpriceless"), ("/ra20", "/rflutterjerk")),
    (("/ra01", "/rtwipride"), ("/ra11", "/rcelestiamad"), ("/ra21", "/rtwicrazy")),
    (("/ra02", "/rlunateehee"), ("/ra12", "/rlunawait"), ("/ra22", "/rpaperbagderpy", "/rpaperbagwizard", "/rderpwizard")),
    (("/ra03", "/rajhappy", "/rhapplejack"), ("/ra13", "/rppfear"), ("/ra23", "/rtwibeam")),
    (("/ra04", "/rraritydaww"), ("/ra14", "/rscootacheer", "/rlootascoo")), # /ra24 and /rswagintosh are the third one
    (("/ra05", "/rajsup", "/rajwhatsgood"), ("/ra15", "/rflutterwhoa", "/rflutterwoah"), ("/ra25", "/rrdsad", "/rrdcry")),
    (("/ra06", "/rohcomeon", "/rsbcomeon"), ("/ra16", "/rppcute", "/rcutiepie"), ("/ra26", "/rabbored", "/rabmerp")),
    (("/ra07", "/rraritypaper", "/rraritynews"), ("/ra17", "/rsbbook", "/rsweetiebook"), ("/ra27", "/rscootaplease", "/rscootappeal", "/rscootaplz")),
    (("/ra08", "/rtwiright", "/rsatistwied"), ("/ra18", "/rcelestiawut", "/rwutlestia"), ("/ra28", "/rgrannysmith", "/rgranny", "/roldmareyellsatcloud")),
    (("/ra09", "/rshiningarmor", "/rshiningarmour"), ("/ra19", "/rchrysalis", "/rqueenchrysalis", "/rchanglingqueen"),
        ("/ra29", "/rcadence", "/rcadance", "/rprincesscadence", "/rprincesscadance", "/rprincessmiamorecadenza"))
    ))

# Swagintosh is animated, so in a separate image. It's more or less a sheet.
add_sheet("mylittlepony_a_swagintosh", "http://b.thumbs.redditmedia.com/Kt_jbvLW92C9Fdqg.png", (70, 70), (
    (("/a24", "/swagintosh"),),
    (("/ra24", "/rswagintosh"),)
    ))

# B sheet
add_sheet("mylittlepony_b", "http://e.thumbs.redditmedia.com/SdD3wwCBFtlQDVx4.png", (50, 50), (
    (("/b00", "/flutterfear"), ("/b10", "/ppboring"), ("/b20", "/rarityyell"), ("/b30", "/fluttershy")),
    (("/b01", "/ajcower"), ("/b11", "/ajsly"), ("/b21", "/eeyup"), ("/b31", "/rdsmile")),
    (("/b02", "/fluttersrs"), ("/b12", "/raritydress"), ("/b22", "/takealetter"), ("/b32", "/rdwut")),
    (("/b03", "/ppshrug"), ("/b13", "/spikenervous", "/newrainbowdash"), ("/b23", "/noooo"), ("/b33", "/dj", "/threedog")),
    (("/b04", "/fluttershh"), ("/b14", "/flutteryay"), ("/b24", "/squintyjack"), ("/b34", "/spikepushy")),
    (("/b05", "/ajugh"), ("/b15", "/raritywut"), ("/b25", "/dumbfabric"), ("/b35", "/raritywhy")),
    (("/b06", "/trixiesmug"), ("/b16", "/flutterwink"), ("/b26", "/rarityannoyed"), ("/b36", "/soawesome")),
    (("/b07", "/ajwut"), ("/b17", "/twisquint"), ("/b27", "/raritywhine"), ("/b37", "/rdcool")),
    (("/b08", "/abwut"), ("/b18", "/manspike"), ("/b28", "/cockatrice"), ("/b38", "/facehoof")),
    (("/b09", "/rarityjudge"), ("/b19", "/rarityprimp"), ("/b29", "/twirage"), ("/b39", "/ppseesyou"))
    ))

# Reversed B sheet
add_sheet("mylittlepony_b_r", "http://f.thumbs.redditmedia.com/I7qbwaE3bctckwOk.png", (50, 50), (
    (("/rb00", "/rflutterfear"), ("/rb10", "/rppboring"), ("/rb20", "/rrarityyell"), ("/rb30", "/rfluttershy")),
    (("/rb01", "/rajcower"), ("/rb11", "/rajsly"), ("/rb21", "/reeyup"), ("/rb31", "/rrdsmile")),
    (("/rb02", "/rfluttersrs"), ("/rb12", "/rraritydress"), ("/rb22", "/rtakealetter"), ("/rb32", "/rrdwut")),
    (("/rb03", "/rppshrug"), ("/rb13", "/rspikenervous", "/rnewrainbowdash"), ("/rb23", "/rnoooo"), ("/rb33", "/rdj", "/rthreedog")),
    (("/rb04", "/rfluttershh"), ("/rb14", "/rflutteryay"), ("/rb24", "/rsquintyjack"), ("/rb34", "/rspikepushy")),
    (("/rb05", "/rajugh"), ("/rb15", "/rraritywut"), ("/rb25", "/rdumbfabric"), ("/rb35", "/rraritywhy")),
    (("/rb06", "/rtrixiesmug"), ("/rb16", "/rflutterwink"), ("/rb26", "/rrarityannoyed"), ("/rb36", "/rsoawesome")),
    (("/rb07", "/rajwut"), ("/rb17", "/rtwisquint"), ("/rb27", "/rraritywhine"), ("/rb37", "/rrdcool")),
    (("/rb08", "/rabwut"), ("/rb18", "/rmanspike"), ("/rb28", "/rcockatrice"), ("/rb38", "/rfacehoof")),
    (("/rb09", "/rrarityjudge"), ("/rb19", "/rrarityprimp"), ("/rb29", "/rtwirage"), ("/rb39", "/rppseesyou"))
    ))

# C sheet
add_sheet("mylittlepony_c", "http://d.thumbs.redditmedia.com/YKSDpjdgMQmII9YE.png", (70, 70), (
    (("/c00", "/rdsitting"), ("/c10", "/rdhappy"), ("/c20", "/rdannoyed")),
    (("/c01", "/twismug"), ("/c11", "/twismile"), ("/c21", "/twistare")),
    (("/c02", "/ohhi"), ("/c12", "/party"), ("/c22", "/hahaha")),
    (("/c03", "/flutterblush"), ("/c13", "/gross"), ("/c23", "/derpyhappy")),
    (("/c04", "/ajfrown"), ("/c14", "/hmmm"), ("/c24", "/joy")),
    (("/c05", "/raritysad"), ("/c15", "/fabulous"), ("/c25", "/derp")),
    (("/c06", "/louder"), ("/c16", "/lunasad"), ("/c26", "/derpyshock")),
    (("/c07", "/pinkamina"), ("/c17", "/loveme"), ("/c27", "/lunagasp")),
    (("/c08", "/scootaloo"), ("/c18", "/celestia"), ("/c28", "/angel")),
    (("/c09", "/allmybits"), ("/c19", "/zecora"), ("/c29", "/photofinish"))
    ))

# Reversed C sheet
add_sheet("mylittlepony_c_r", "http://b.thumbs.redditmedia.com/mRM0EMQwBonm0jT7.png", (70, 70), (
    (("/rc00", "/rrdsitting"), ("/rc10", "/rrdhappy"), ("/rc20", "/rrdannoyed")),
    (("/rc01", "/rtwismug"), ("/rc11", "/rtwismile"), ("/rc21", "/rtwistare")),
    (("/rc02", "/rohhi"), ("/rc12", "/rparty"), ("/rc22", "/rhahaha")),
    (("/rc03", "/rflutterblush"), ("/rc13", "/rgross"), ("/rc23", "/rderpyhappy")),
    (("/rc04", "/rajfrown"), ("/rc14", "/rhmmm"), ("/rc24", "/rjoy")),
    (("/rc05", "/rraritysad"), ("/rc15", "/rfabulous"), ("/rc25", "/rderp")),
    (("/rc06", "/rlouder"), ("/rc16", "/rlunasad"), ("/rc26", "/rderpyshock")),
    (("/rc07", "/rpinkamina"), ("/rc17", "/rloveme"), ("/rc27", "/rlunagasp")),
    (("/rc08", "/rscootaloo"), ("/rc18", "/rcelestia"), ("/rc28", "/rangel")),
    (("/rc09", "/rallmybits"), ("/rc19", "/rzecora"), ("/rc29", "/rphotofinish"))
    ))

# E sheet
add_sheet("mylittlepony_e", "http://b.thumbs.redditmedia.com/xI80gM1JZrHyBlFm.png", (70, 70), (
    (("/e00", "/fillytgap", "/t00"), ("/e10", "/rdhuh"), ("/e20", "/snails")),
    (("/e01", "/lyra", "/100"), ("/e11", "/bonbon"), ("/e21", "/spitfire")),
    (("/e02", "/cutealoo"), ("/e12", "/happyluna", "/lunahappy"), ("/e22", "/sotrue")),
    (("/e03", "/wahaha"), ("/e13", "/sbstare"), ("/e23", "/punchdrunk", "/berry")),
    (("/e04", "/huhhuh"), ("/e14", "/absmile"), ("/e24", "/dealwithit")),
    (("/e05", "/nmm", "/blacksnooty", "/queenmeanie", "/hokeysmokes"), ("/e15", "/whooves"), ("/e25", "/rdsalute")),
    (("/e06", "/octavia", "/whomeverthisis"), ("/e16", "/colgate"), ("/e26", "/cheerilee")),
    (("/e07", "/ajbaffle", "/ajconfused"), ("/e17", "/abhuh"), ("/e27", "/thehorror", "/lily")),
    (("/e08", "/twiponder"), ("/e18", "/spikewtf"), ("/e28", "/awwyeah")),
    # /gilda and /manlytears both CONFLICT with r/mylittleandysonic1
    (("/e09", "/gilda"), ("/e19", "/discentia", "/discentiastare", "/disstare"), ("/e29", "/macintears", "/manlytears", "/bigmactears"))
    ))

# Reversed E sheet
add_sheet("mylittlepony_e_r", "http://e.thumbs.redditmedia.com/UCe9yrEaHepzkgep.png", (70, 70), (
    (("/re00", "/rfillytgap", "/rt00"), ("/re10", "/rrdhuh"), ("/re20", "/rsnails")),
    (("/re01", "/rlyra", "/r100"), ("/re11", "/rbonbon"), ("/re21", "/rspitfire")),
    (("/re02", "/rcutealoo"), ("/re12", "/rhappyluna", "/rlunahappy"), ("/re22", "/rsotrue")),
    (("/re03", "/rwahaha"), ("/re13", "/rsbstare"), ("/re23", "/rpunchdrunk", "/rberry")),
    (("/re04", "/rhuhhuh"), ("/re14", "/rabsmile"), ("/re24", "/rdealwithit")),
    (("/re05", "/rnmm", "/rblacksnooty", "/rqueenmeanie", "/rhokeysmokes"), ("/re15", "/rwhooves"), ("/re25", "/rrdsalute")),
    (("/re06", "/roctavia", "/rwhomeverthisis"), ("/re16", "/rcolgate"), ("/re26", "/rcheerilee")),
    (("/re07", "/rajbaffle", "/rajconfused"), ("/re17", "/rabhuh"), ("/re27", "/rthehorror", "/rlily")),
    (("/re08", "/rtwiponder"), ("/re18", "/rspikewtf"), ("/re28", "/rawwyeah")),
    (("/re09", "/rgilda"), ("/re19", "/rdiscentia", "/rdiscentiastare", "/rdisstare"), ("/re29", "/rmacintears", "/rmanlytears", "/rbigmactears"))
    ))

# Other emote stuff
add_sheet("mylittlepony_misc", "http://c.thumbs.redditmedia.com/5wA7HWAl2WD-UzA8.png", (70, 70), (
    (("/smooze",),),
    (("/rsmooze",),)
    ))

add_emote("mylittlepony_misc", "/sp", {"display": "inline-block", "padding-right": "100%"})

""" # TODO: from r/mlp's CSS, modifiers (not even supported yet)

// in-line emotes -in and -inp, e.g. texttext[](/b24-in)texttext
a[href^="/"][href*="-in-"], a[href^="/"][href$="-in"], a[href^="/"][href*="-inp-"], a[href^="/"][href$="-inp"
    float: none !important;
    display: inline-block !important
}
"""

################################################################################
##
## R/MYLITTLEANDYSONIC1
##
################################################################################

# Various random emotes
add_weird_sheet("mylittleandysonic1_misc1", "http://d.thumbs.redditmedia.com/DUaiuDPgJYWcPwWu.png", {
    "/flutterumm": (146, 152, 0, 0),
    "/flutterwhat": (146, 152, -146, 0),
    "/sackflip": (199, 129, -292, 0),
    "/sackfun": (187, 220, -690, 0),
    "/shitemote": (246, 252, -187, -220)
    })
# These emotes have various hover attributes... TODO: make a better way to do
# this
add_custom_css(".betterponymotes-mylittleandysonic1_misc1-flutterumm:hover", {
    "width": "146px", "height": "152px", "background-position": "-146px -0px"
    })
add_custom_css(".betterponymotes-mylittleandysonic1_misc1-flutterwhat:hover", {
    "width": "146px", "height": "152px", "background-position": "-0px -0px"
    })
add_custom_css(".betterponymotes-mylittleandysonic1_misc1-sackflip:hover", {
    "width": "199px", "height": "129px", "background-position": "-491px -0px"
    })
add_custom_css(".betterponymotes-mylittleandysonic1_misc1-sackfun:hover", {
    "width": "187px", "height": "220px", "background-position": "-0px -220px"
    })
add_custom_css(".betterponymotes-mylittleandysonic1_misc1-shitemote:hover", {
    "width": "270px", "height": "263px", "background-position": "-433px -220px"
    })
add_custom_css(".betterponymotes-mylittleandysonic1_misc1-shitemote:active", {
    "width": "275px", "height": "266px", "background-position": "-703px -220px"
    })

# /*fun and a couple other things... Most of these are regularly spaced, but
# the width varies, and there are some special cases that wouldn't fit in a
# gridded sheet anyway.
add_weird_sheet("mylittleandysonic1_fun", "http://b.thumbs.redditmedia.com/wLifHPm_phXLE7Ma.png", {
    "/rarfun":          (248, 152, 0, 0),
    "/shyfun":          (234, 167, 0, -152),
    "/dashfun":         (231, 152, 0, -319),
    "/twifun":          (230, 152, 0, -471),
    "/charliefun":      (230, 152, 0, -623),
    "/rcrfun":          (230, 152, 0, -623),
    "/pinkiefun":       (227, 152, 0, -775),
    "/ppfun":           (227, 152, 0, -775),
    "/trixfun":         (226, 152, 0, -927),
    "/derpfun":         (221, 152, 0, -1079),
    "/bonfun":          (217, 152, 0, -1231),
    "/cheerfun":        (216, 152, 0, -1383),
    "/orschfun":        (211, 154, 0, -1535),
    "/ajfun":           (210, 152, 0, -1689),
    "/thunderlanefun":  (208, 152, 0, -1841),
    "/tlfun":           (208, 152, 0, -1841),
    "/darkfun":         (208, 152, 0, -1993),
    "/dolcefun":        (208, 152, 0, -1993),
    "/lyrafun":         (202, 152, 0, -2145),
    "/esplinfun":       (202, 152, 0, -2297),
    "/braefun":         (202, 152, 0, -2449),
    "/rosefun":         (201, 152, 0, -2601),
    "/speedyfun":       (193, 152, 0, -2753),
    "/gildafriendship": (180, 202, 0, -2905),
    "/herhorn":         (180, 202, 0, -2905),
    "/ch35":            (113, 152, 0, -3107),
    "/chnuzzle":        (113, 152, 0, -3107),
    "/twinuzzle":       (112, 152, -113, -3107)
    })

# More misc things, including a lot of Pokemon.
add_weird_sheet("mylittleandysonic1_misc2", "http://b.thumbs.redditmedia.com/h5WgVTaRo_UWI1e1.png", {
    "/a_lot":           (256, 142, 0, 0),
    "/flutalot":        (256, 142, 0, 0),
    "/applepuff":       (99, 102, 0, -142),
    "/bendover":        (152, 152, -99, -142),
    "/cadancewat":      (85, 127, 0, -294),
    "/cadencewat":      (85, 127, 0, -294),
    "/chryswat":        (122, 127, -85, -294),
    "/cmcderp":         (175, 127, 0, -421),
    "/discordwtf":      (154, 152, 0, -548),
    "/doitfilly":       (185, 202, 0, -700),
    "/eeveedash":       (79, 102, 0, -902),
    "/gildafury":       (256, 167, 0, -1004),
    "/hatefuck":        (256, 231, 0, -1171),
    "/pbf":             (66, 82, 0, -1402),
    "/ppchainsaw":      (226, 152, 0, -1484),
    "/ppteeth":         (166, 152, 0, -1636),
    "/raritywooo":      (100, 152, 0, -1788),
    "/rarizee":         (97, 102, -100, -1788),
    "/rubysquee":       (124, 127, 0, -1940),
    "/shyduck":         (91, 102, -124, -1940),
    "/twipoke":         (101, 102, 0, -2067),
    "/twiread":         (256, 108, 0, -2169),
    "/wuna":            (146, 202, 0, -2277)
    })

# More misc things, and a lot of Lyra/Bonbon stuff.
add_weird_sheet("mylittleandysonic1_misc3", "http://c.thumbs.redditmedia.com/b3i1wbSbdriJsld8.png", {
    "/lb06":            (202, 156, 0, 0),
    "/lb25":            (52, 76, -202, 0),
    "/forequestria":    (182, 156, 0, -156),
    "/lb24":            (74, 76, -182, -156),
    "/lb04":            (74, 76, -182, -232),
    "/lb11":            (74, 62, -182, -308),
    "/evilenchantress": (180, 156, 0, -312),
    "/lb31":            (76, 76, -180, -370),
    "/lb30":            (76, 76, -180, -446),
    "/twiwhy":          (179, 152, 0, -468),
    "/lb23":            (76, 76, -179, -522),
    "/lb20":            (76, 76, -179, -598),
    "/flutterhug":      (155, 156, 0, -620),
    "/lb14":            (76, 76, -155, -674),
    "/lb13":            (76, 76, -155, -750),
    "/lywithit":        (153, 156, 0, -776),
    "/ajwtf":           (102, 131, -153, -826),
    "/ch13":            (149, 156, 0, -932),
    "/cheerwithit":     (149, 156, 0, -932),
    "/worstpony":       (107, 106, -149, -957),
    "/sweetiestache":   (104, 89, -149, -1063),
    "/ch23":            (128, 156, 0, -1088),
    "/cheerilean":      (128, 156, 0, -1088),
    "/ch33":            (122, 131, -128, -1152),
    "/scratch":         (121, 156, 0, -1244),
    "/lb03":            (76, 76, -121, -1283),
    "/lb15":            (56, 76, -197, -1283),
    "/lb21":            (76, 74, -121, -1359),
    "/lb34":            (76, 72, 0, -1400),
    "/lb01":            (76, 72, -76, -1433),
    "/lb22":            (76, 70, -152, -1433),
    "/lb00":            (76, 72, 0, -1472),
    "/lb42":            (76, 64, -76, -1505),
    "/lb02":            (76, 68, -152, -1503),
    "/lb32":            (76, 64, 0, -1544),
    "/lb43":            (76, 58, -76, -1569),
    "/lb12":            (76, 56, -152, -1571),
    "/lb10":            (76, 58, 0, -1608),
    "/lb40":            (76, 48, 0, -1666),
    "/lb44":            (76, 50, -76, -1627),
    "/lb45":            (72, 76, -152, -1627),
    "/lb41":            (72, 76, -76, -1677),
    "/lb33":            (72, 76, -148, -1703),
    "/lb35":            (72, 76, 0, -1714),
    "/lb05":            (60, 76, -72, -1753)
    })

# Misc stuff.
add_weird_sheet("mylittleandysonic1_misc4", "http://c.thumbs.redditmedia.com/7uLCsxF3MxmDKvbh.png", {
    "/celestiafun":     (408, 256, 0, 0),
    "/dayblob":         (101, 81, -408, 0),
    "/twilight":        (76, 73, -408, -81),
    "/trixmad":         (74, 76, -408, -154),
    "/wutpie":          (74, 72, -408, -230),
    "/froguedash":      (393, 417, 0, -256),
    "/roguedash":       (393, 417, 0, -256),
    "/brody2":          (118, 117, -393, -302),
    "/rbrodyhover":     (118, 117, -393, -302),
    "/pinkamena":       (106, 117, -393, -419),
    "/brody":           (106, 117, -393, -536),
    "/brodyhover":      (106, 117, -393, -536),
    "/twiokay":         (72, 76, -393, -653),
    "/lunafun":         (328, 181, 0, -673),
    "/wutjack":         (62, 68, -328, -673),
    "/surpriseparty":   (122, 194, -390, -729),
    "/darklewithit":    (249, 269, 0, -854),
    "/twihat":          (131, 151, -249, -854),
    "/faustfun":        (246, 216, -249, -1005),
    "/fleurfun":        (215, 162, 0, -1123),
    "/slutfun":         (215, 162, 0, -1123)
    })
add_custom_css(".betterponymotes-mylittleandysonic1_misc4-brodyhover:hover", {
    "width": "118px", "height": "117px", "background-position": "-393px -302px"
    })
add_custom_css(".betterponymotes-mylittleandysonic1_misc4-rbrodyhover:hover", {
    "width": "106px", "height": "117px", "background-position": "-393px -536px"
    })

# Misc stuff.
add_weird_sheet("mylittleandysonic1_misc5", "http://a.thumbs.redditmedia.com/cJ110aNdOQSe_VEB.png", {
    "/dashmad":         (416, 430, 0, 0),
    "/dashmad2":        (416, 430, 0, 0),
    "/hamsters":        (206, 192, -211, -430),
    "/elegance":        (211, 156, 0, -430),
    "/yourhorn":        (206, 120, 0, -586),
    "/fancypants":      (111, 156, -401, -622),
    "/surnope":         (195, 256, -206, -622),
    "/twirobe":         (172, 156, 0, -706),
    "/puddinghead":     (107, 181, -401, -778),
    "/disappoint":      (169, 156, 0, -862),
    "/raritux":         (156, 155, -169, -878),
    "/hatwithit":       (153, 156, -325, -959),
    "/creepymc":        (156, 115, 0, -1018),
    "/mywings":         (146, 146, -156, -1033),
    "/vsguitar":        (101, 156, -302, -1115),
    "/ihaveyounow":     (138, 156, 0, -1133)
    })

# Misc stuff.
add_weird_sheet("mylittleandysonic1_misc6", "http://c.thumbs.redditmedia.com/KTO2hH2v4Pm7JmNJ.png", {
    "/carrotfun":       (234, 162, -269, 0),
    "/carrottopfun":    (234, 162, -269, 0),
    "/dashwithit":      (269, 269, 0, 0),
    "/cerealpie":       (206, 200, -269, -162),
    "/rcerealpie":      (206, 200, -269, -162),
    "/pinkwithit":      (265, 273, 0, -269),
    "/twiflip":         (204, 139, -265, -362),
    "/eng":             (46, 76, -451, -501),
    "/crossfire":       (186, 131, -265, -501),
    "/rcrossfire":      (186, 131, -265, -501),
    "/gummy":           (89, 95, -176, -542),
    "/ppfly":           (176, 92, 0, -542),
    "/ajsmile":         (83, 121, -429, -632),
    "/pptoot":          (164, 147, -265, -632),
    "/rdsax":           (171, 131, 0, -634),
    "/sbevil":          (94, 106, -171, -637),
    "/ajcute":          (91, 81, -171, -743),
    "/heavy":           (76, 76, -429, -753),
    "/lush":            (135, 109, 0, -765),
    "/dramaqueen":      (152, 105, -262, -779),
    "/flutterdash":     (126, 126, -135, -824),
    "/w40":             (76, 74, -414, -829),
    "/bonbonlyra":      (126, 109, 0, -874),
    "/ajsmug":          (125, 155, -261, -884),
    "/rdwhat":          (125, 131, -386, -903),
    "/ppfrown":         (114, 154, -126, -950),
    "/ppstache":        (108, 106, 0, -983),
    "/bonbonlyra2":     (116, 122, -386, -1034),
    "/ppmoney":         (106, 132, -240, -1039),
    "/cake":            (107, 131, 0, -1089),
    "/twitrix":         (106, 95, -107, -1104),
    "/flunam":          (62, 76, -448, -1156),
    "/lunam":           (62, 76, -448, -1156),
    "/ppforever":       (102, 156, -346, -1156),
    "/lyou":            (68, 76, -213, -1171)
    })

# Misc stuff.
add_weird_sheet("mylittleandysonic1_misc7", "http://f.thumbs.redditmedia.com/oFBPBInESuBi6jne.png", {
    "/ch00":            (77, 81, 0, 0),
    "/ch01":            (138, 156, -77, 0),
    "/ch02":            (194, 156, -215, 0),
    "/ch03":            (80, 81, -409, 0),
    "/ch10":            (172, 156, 0, -156),
    "/ch11":            (147, 156, -172, -156),
    "/ch12":            (89, 156, -319, -156),
    "/ch20":            (79, 156, -408, -156),
    "/ch21":            (132, 156, 0, -312),
    "/ch22":            (169, 156, -132, -312),
    "/ch25":            (155, 156, -301, -312),
    "/ch30":            (70, 81, 0, -468),
    "/ch31":            (127, 156, -70, -468),
    "/ch32":            (80, 81, -197, -468),
    "/fscrazy":         (132, 131, -277, -468),
    "/gilda":           (217, 206, 0, -624), # CONFLICT with r/mylittlepony
    "/jackwithit":      (228, 269, -217, -624),
    "/ppahh":           (175, 156, 0, -893),
    "/rarwithit":       (248, 269, -175, -893),
    "/scootie":         (158, 81, 0, -1162),
    "/shywithit":       (262, 269, -158, -1162),
    "/sparklewithit":   (249, 269, 0, -1431),
    "/spitfuck":        (108, 106, -249, -1431),
    "/twino":           (206, 176, 0, -1700)
    })

# Misc stuff.
add_weird_sheet("mylittleandysonic1_misc8", "http://b.thumbs.redditmedia.com/IZ3Pnb_40vz0IYka.png", {
    "/braeburn":        (170, 156, 0, 0),
    "/cluna":           (362, 406, 0, -156),
    "/derpwithit":      (254, 265, 0, -562),
    "/discord":         (101, 131, -254, -562),
    "/discordsmile":    (159, 156, 0, -827),
    "/discordwithit":   (275, 275, -159, -827),
    "/froguewithit":    (390, 417, 0, -1102),
    "/roguewithit":     (390, 417, 0, -1102),
    "/hate":            (284, 188, 0, -1519),
    "/liarmac":         (116, 156, -284, -1519),
    "/QQfYQ":           (156, 142, 0, -1707),
    "/ppfreakout":      (156, 142, 0, -1707),
    "/ppquite":         (106, 106, -156, -1707),
    "/ppscared":        (138, 156, -262, -1707),
    "/thatsnothowyouspellpinkiepie": (73, 76, -400, -1707),
    "/tom":             (76, 76, 0, -1863),
    "/trixwizard":      (124, 156, -76, -1863),
    })

# Misc stuff.
add_weird_sheet("mylittleandysonic1_misc9", "http://f.thumbs.redditmedia.com/jGyqL_Z8cvtVwHww.png", {
    "/abfun":           (132, 143, 0, 0),
    "/ajstache":        (72, 106, -132, 0),
    "/darklefun":       (234, 156, 0, -143),
    "/dashdead":        (174, 156, 0, -299),
    "/derpyzap":        (132, 156, 0, -455),
    "/fivewats":        (121, 121, -132, -455),
    "/flutterwhy":      (132, 131, 0, -611),
    "/rflutterwhy":     (132, 131, 0, -611),
    "/goat":            (116, 156, -132, -611),
    "/gummyfez":        (140, 156, 0, -767),
    "/gypsypie":        (149, 156, 0, -923),
    "/heythere":        (109, 156, 0, -1079),
    "/macsmile":        (76, 81, -109, -1079),
    "/macwink":         (68, 81, -185, -1079),
    "/manlytears":      (112, 131, 0, -1235), # CONFLICT with r/mylittlepony
    "/mav":             (130, 116, -112, -1235),
    "/onesquee":        (121, 121, 0, -1366),
    "/pip":             (63, 81, -121, -1366),
    "/pphello":         (83, 131, 0, -1487),
    "/ppwatching":      (116, 81, -83, -1487),
    "/rdstare":         (103, 106, 0, -1618),
    "/rdwhy":           (73, 81, -103, -1618),
    "/rod":             (116, 106, 0, -1724),
    "/sadtwi":          (93, 106, -116, -1724),
    "/sbfun":           (140, 139, 0, -1830),
    "/scootacake":      (72, 81, -140, -1830),
    "/scootanoms":      (72, 81, -140, -1830),
    "/scootachicken":   (71, 106, 0, -1969),
    "/scootafun":       (143, 141, -71, -1969),
    "/scootidea":       (87, 106, 0, -2110),
    "/spitfetish":      (236, 200, 0, -2216),
    "/spitflyer":       (256, 81, 0, -2416),
    "/spitwithit":      (156, 156, 0, -2497),
    "/spoon":           (137, 136, 0, -2653),
    "/telegram":        (103, 131, -137, -2653),
    "/twicower":        (208, 106, 0, -2789),
    "/twicute":         (82, 81, 0, -2895),
    "/zecorawat":       (93, 106, -82, -2895)
    })

# Misc stuff.
add_weird_sheet("mylittleandysonic1_misc10", "http://d.thumbs.redditmedia.com/BVHoQ0q2bQBOZ80E.png", {
    "/ajhay":           (86, 97, 0, 0),
    "/awesome":         (101, 152, -86, 0),
    "/ch05":            (75, 77, 0, -152),
    "/derpilee":        (75, 77, 0, -152),
    "/cheesemoo":       (113, 102, -75, -152),
    "/dcute":           (75, 77, 0, -254),
    "/derram":          (98, 127, -75, -254),
    "/discordgag":      (152, 152, 0, -381),
    "/emperorgummy":    (205, 202, 0, -533),
    "/grumpydash":      (73, 77, 0, -735),
    "/ww30":            (73, 77, 0, -735),
    "/grumpyjack":      (69, 87, -73, -735),
    "/ww02":            (69, 87, -73, -735),
    "/moongusta":       (152, 152, 0, -822),
    "/parafun":         (78, 77, -152, -822),
    "/pinkachu":        (108, 102, 0, -974),
    "/queenawesome":    (127, 127, -108, -974),
    "/radical":         (101, 152, 0, -1101),
    "/raricute":        (74, 77, -101, -1101),
    "/rarigummy":       (170, 127, 0, -1253),
    "/surcookie":       (165, 202, 0, -1380),
    "/sweetieww":       (112, 127, 0, -1582),
    "/tank":            (125, 102, -112, -1582),
    "/thatswhatshysaid":(142, 127, 0, -1709),
    "/twibook":         (142, 127, 0, -1836),
    "/twistparty":      (153, 127, 0, -1963),
    "/ww00":            (68, 77, -153, -1963),
    "/ww01":            (141, 152, 0, -2090),
    "/ww10":            (102, 102, -141, -2090),
    "/ww11":            (71, 77, 0, -2242),
    "/ww20":            (105, 102, -71, -2242),
    "/ww21":            (140, 152, 0, -2344),
    "/ww31":            (108, 102, -140, -2344),
    "/yes":             (223, 202, 0, -2496)
    })

# A couple misc. emotes, the /v, /w, /x blocks, and some of the /zz block (the
# rest is in misc14). Some of these could probably be gridded, but they're 
# offset a bit (plus they're all random sizes).
add_weird_sheet("mylittleandysonic1_misc11", "http://d.thumbs.redditmedia.com/H0eyI2gKpleBC5s3.png", {
    "/fscute":          (81, 77, 0, 0),
    "/ppohyou":         (94, 102, -81, 0),
    "/rdcute":          (70, 77, -175, 0),
    "/v00":             (72, 56, -245, 0),
    "/v01":             (60, 72, -317, 0),
    "/v02":             (62, 72, -377, 0),
    "/v03":             (60, 70, -439, 0),
    "/v10":             (56, 70, 0, -102),
    "/v11":             (56, 70, -56, -102),
    "/v12":             (62, 72, -112, -102),
    "/v13":             (62, 72, -174, -102),
    "/v20":             (60, 70, -236, -102),
    "/v21":             (58, 72, -296, -102),
    "/v22":             (62, 72, -354, -102),
    "/v23":             (62, 72, -416, -102),
    "/v30":             (52, 72, 0, -174),
    "/v31":             (58, 72, -52, -174),
    "/v32":             (58, 72, -110, -174),
    "/v33":             (66, 72, -168, -174),
    "/v40":             (62, 70, -234, -174),
    "/v41":             (58, 72, -296, -174),
    "/v42":             (64, 72, -354, -174),
    "/v43":             (72, 70, -418, -174),
    "/w00":             (68, 66, 0, -246),
    "/w01":             (72, 70, -68, -246),
    "/w02":             (72, 72, -140, -246),
    "/w03":             (68, 68, -212, -246),
    "/w04":             (68, 70, -280, -246),
    "/w10":             (72, 72, -348, -246),
    "/w11":             (68, 68, -420, -246),
    "/w12":             (72, 72, 0, -318),
    "/w13":             (68, 68, -72, -318),
    "/w14":             (66, 70, -140, -318),
    "/w20":             (68, 66, -206, -318),
    "/w21":             (68, 70, -274, -318),
    "/w22":             (68, 66, -342, -318),
    "/w23":             (68, 66, -410, -318),
    "/w24":             (70, 66, 0, -390),
    "/w30":             (68, 66, -70, -390),
    "/w31":             (66, 66, -138, -390),
    "/w32":             (68, 68, -204, -390),
    "/w33":             (72, 68, -272, -390),
    "/w34":             (68, 66, -344, -390),
    "/x00":             (64, 72, -412, -390),
    "/x01":             (68, 72, 0, -462),
    "/x02":             (68, 72, -68, -462),
    "/x03":             (64, 72, -136, -462),
    "/x04":             (72, 72, -200, -462),
    "/x10":             (72, 70, -272, -462),
    "/x11":             (68, 72, -344, -462),
    "/x12":             (72, 72, -412, -462),
    "/x13":             (66, 72, 0, -534),
    "/x14":             (72, 72, -66, -534),
    "/x20":             (72, 72, -138, -534),
    "/x21":             (64, 70, -210, -534),
    "/x22":             (72, 72, -274, -534),
    "/x23":             (72, 70, -346, -534),
    "/x24":             (70, 66, -418, -534),
    "/x30":             (70, 68, 0, -606),
    "/x31":             (70, 72, -70, -606),
    "/x32":             (72, 72, -140, -606),
    "/x33":             (66, 72, -212, -606),
    "/x34":             (70, 72, -278, -606),
    "/x40":             (68, 68, -348, -606),
    "/x41":             (70, 72, -416, -606),
    "/x42":             (70, 72, 0, -678),
    "/x43":             (72, 72, -70, -678),
    "/x44":             (68, 72, -142, -678),
    "/zz00":            (58, 64, -210, -678),
    "/zz01":            (70, 68, -268, -678),
    "/zz02":            (62, 68, -338, -678),
    "/zz03":            (58, 64, -400, -678),
    "/zz10":            (54, 60, -458, -678)
    })

# Misc stuff.
add_weird_sheet("mylittleandysonic1_misc12", "http://b.thumbs.redditmedia.com/BLCBKpyVbf7ZNc7m.png", {
    "/xx28":            (153, 106, 0, 0),
    "/xx33":            (151, 106, -153, 0),
    "/xx02":            (148, 106, -304, 0),
    "/xx30":            (59, 106, -452, 0),
    "/xx09":            (141, 106, 0, -106),
    "/xx10":            (134, 106, -141, -106),
    "/xx37":            (133, 106, -275, -106),
    "/xx22":            (102, 106, -408, -106),
    "/xx05":            (132, 106, 0, -212),
    "/xx24":            (127, 106, -132, -212),
    "/xx03":            (125, 106, -259, -212),
    "/xx11":            (121, 106, -384, -212),
    "/xx35":            (120, 106, 0, -318),
    "/xx15":            (120, 106, -120, -318),
    "/xx06":            (117, 106, -240, -318),
    "/xx25":            (116, 106, -357, -318),
    "/xx08":            (115, 106, 0, -424),
    "/xx36":            (114, 106, -115, -424),
    "/xx32":            (113, 106, -229, -424),
    "/xx26":            (113, 106, -342, -424),
    "/xx29":            (112, 106, 0, -530),
    "/xx12":            (106, 106, -112, -530),
    "/xx16":            (100, 106, -218, -530),
    "/xx27":            (99, 106, -318, -530),
    "/xx31":            (91, 106, -417, -530),
    "/xx38":            (111, 106, 0, -636),
    "/xx19":            (109, 106, -111, -636),
    "/xx04":            (89, 106, -220, -636),
    "/xx00":            (81, 106, -309, -636),
    "/xx20":            (74, 106, -390, -636),
    "/xx13":            (111, 106, 0, -742),
    "/xx14":            (97, 106, -111, -742),
    "/xx21":            (91, 106, -208, -742),
    "/xx18":            (81, 106, -299, -742),
    "/xx17":            (73, 106, -380, -742),
    "/xx01":            (111, 106, 0, -848),
    "/xx07":            (97, 106, -111, -848),
    "/xx23":            (85, 106, -208, -848),
    "/xx34":            (82, 106, -293, -848)
    })

# Misc stuff and the /yy block.
add_weird_sheet("mylittleandysonic1_misc13", "http://c.thumbs.redditmedia.com/IXp-LnEZZtrgJJYb.png", {
    "/bblove":          (191, 152, 0, 0),
    "/yy41":            (152, 148, -191, 0),
    "/yy00":            (152, 141, -343, 0),
    "/yy31":            (152, 137, -343, -141),
    "/yy20":            (152, 136, -191, -148),
    "/yy22":            (152, 125, 0, -152),
    "/yy01":            (152, 118, 0, -277),
    "/yy11":            (152, 129, -343, -278),
    "/yy40":            (152, 116, -152, -284),
    "/yy12":            (152, 115, 0, -395),
    "/yy30":            (152, 110, -152, -400),
    "/yy02":            (152, 106, -304, -407),
    "/yy42":            (152, 92, 0, -510),
    "/yy32":            (150, 152, -152, -510),
    "/creepybelle":     (110, 122, -302, -513),
    "/yy21":            (100, 152, -412, -513),
    "/yy10":            (141, 152, 0, -602),
    "/ajwink":          (95, 152, -302, -635),
    "/what":            (94, 109, -141, -662),
    "/tiara":           (94, 127, -397, -665),
    "/abfreakout":      (86, 102, 0, -754),
    "/bbyou":           (72, 72, -86, -771),
    "/guitar":          (78, 137, 0, -856),
    "/abcute":          (81, 102, -78, -856)
    })

# Misc stuff, the /y block (which is more misc stuff), and the /zz block.
add_weird_sheet("mylittleandysonic1_misc14", "http://e.thumbs.redditmedia.com/JnTe98YY8-etIE3p.png", {
    "/ch04":            (102, 102, 0, 0),
    "/ch15":            (127, 102, 0, -102),
    "/cheerihat":       (127, 102, 0, -102),
    "/ch34":            (121, 102, 0, -204),
    "/lexcited":        (102, 102, 0, -306),
    "/llaugh":          (102, 102, 0, -408),
    "/lmad":            (102, 102, 0, -510),
    "/lnotbad":         (102, 102, 0, -612),
    "/lnotimpressed":   (102, 102, 0, -714),
    "/lroyal":          (102, 102, 0, -816),
    "/lshady":          (102, 102, 0, -918),
    "/lsquee":          (102, 102, 0, -1020),
    "/lyes":            (102, 102, 0, -1122),
    "/y00":             (68, 72, 0, -1224),
    "/y01":             (72, 72, 0, -1296),
    "/y02":             (72, 72, 0, -1368),
    "/y03":             (72, 72, 0, -1440),
    "/y04":             (72, 68, 0, -1512),
    "/y05":             (72, 72, 0, -1580),
    "/y06":             (72, 72, 0, -1652),
    "/y07":             (62, 72, 0, -1724),
    "/y10":             (70, 72, 0, -1796),
    "/y11":             (72, 72, 0, -1868),
    "/y12":             (64, 72, 0, -1940),
    "/y13":             (72, 72, 0, -2012),
    "/y14":             (72, 72, 0, -2084),
    "/y15":             (72, 72, 0, -2156),
    "/y16":             (72, 72, 0, -2228),
    "/y17":             (72, 72, 0, -2300),
    "/y20":             (72, 72, 0, -2372),
    "/y21":             (72, 72, 0, -2444),
    "/y22":             (72, 72, 0, -2516),
    "/y23":             (72, 72, 0, -2588),
    "/y24":             (72, 72, 0, -2660),
    "/y25":             (72, 72, 0, -2732),
    "/y26":             (72, 72, 0, -2804),
    "/y27":             (72, 72, 0, -2876),
    "/y30":             (72, 72, 0, -2948),
    "/y31":             (62, 72, 0, -3020),
    "/y32":             (72, 72, 0, -3092),
    "/y33":             (72, 72, 0, -3164),
    "/y34":             (72, 72, 0, -3236),
    "/y35":             (72, 72, 0, -3308),
    "/y36":             (72, 72, 0, -3380),
    "/y37":             (72, 72, 0, -3452),
    "/y40":             (72, 72, 0, -3524),
    "/y41":             (70, 72, 0, -3596),
    "/y42":             (72, 72, 0, -3668),
    "/y43":             (72, 72, 0, -3740),
    "/y44":             (72, 72, 0, -3812),
    "/y45":             (72, 72, 0, -3884),
    "/y46":             (72, 68, 0, -3956),
    "/y47":             (70, 72, 0, -4024),
    "/zz11":            (60, 68, 0, -4096),
    "/zz12":            (60, 68, -60, -4096),
    "/zz13":            (72, 68, 0, -4164),
    "/zz20":            (62, 68, 0, -4232),
    "/zz21":            (56, 62, -62, -4232),
    "/zz22":            (64, 64, 0, -4300),
    "/zz23":            (66, 68, 0, -4364),
    "/zz30":            (70, 64, 0, -4432),
    "/zz31":            (60, 68, 0, -4496),
    "/zz32":            (60, 64, -60, -4496),
    "/zz33":            (62, 68, 0, -4564),
    "/zz40":            (60, 68, -62, -4564),
    "/zz41":            (60, 68, 0, -4632),
    "/zz42":            (58, 64, -60, -4632),
    "/zz43":            (56, 66, 0, -4700)
    })

# Misc stuff.
add_weird_sheet("mylittleandysonic1_misc15", "http://a.thumbs.redditmedia.com/w8xAboodMKeO8t4r.png", {
    "/abshocked":       (100, 106, 0, 0),
    "/ajdemon":         (137, 156, -100, 0),
    "/ch14":            (156, 156, 0, -156),
    "/ch24":            (190, 156, 0, -312),
    "/dapper":          (75, 106, 0, -468),
    "/flutterlean":     (113, 156, -75, -468),
    "/ftia":            (74, 72, 0, -624),
    "/z25":             (74, 72, 0, -624),
    "/ppgummy":         (171, 156, -74, -624),
    "/rdawesome":       (70, 81, 0, -780),
    "/rdgrin":          (75, 81, -70, -780),
    "/rdlean":          (125, 156, 0, -861),
    "/rdwizard":        (113, 156, -125, -861),
    "/sadtiara":        (80, 106, 0, -1017),
    "/sbsad":           (85, 106, -80, -1017),
    "/who":             (72, 81, -165, -1017),
    "/z00":             (65, 76, 0, -1123),
    "/z01":             (66, 76, -65, -1123),
    "/z02":             (62, 76, -131, -1123),
    "/z03":             (68, 76, 0, -1199),
    "/z04":             (76, 76, -68, -1199),
    "/z05":             (74, 76, -144, -1199),
    "/z06":             (72, 76, 0, -1275),
    "/z07":             (76, 76, -72, -1275),
    "/z10":             (76, 76, -148, -1275),
    "/z11":             (76, 76, 0, -1351),
    "/z12":             (76, 72, -76, -1351),
    "/z13":             (60, 76, -152, -1351),
    "/z14":             (76, 76, 0, -1427),
    "/z15":             (76, 76, -76, -1427),
    "/z16":             (70, 76, -152, -1427),
    "/z17":             (76, 76, 0, -1503),
    "/z20":             (76, 76, -76, -1503),
    "/z21":             (76, 74, -152, -1503),
    "/z22":             (76, 76, 0, -1579),
    "/z23":             (76, 76, -76, -1579),
    "/z24":             (76, 76, -152, -1579),
    "/z26":             (74, 76, 0, -1655),
    "/z27":             (76, 76, -74, -1655),
    "/z30":             (76, 76, -150, -1655),
    "/z31":             (76, 76, 0, -1731),
    "/z32":             (76, 76, -76, -1731),
    "/z33":             (76, 76, -152, -1731),
    "/z34":             (72, 76, 0, -1807),
    "/z35":             (76, 76, -72, -1807),
    "/z36":             (76, 76, -148, -1807),
    "/z37":             (76, 76, 0, -1883),
    "/z40":             (76, 76, -76, -1883),
    "/z41":             (70, 76, -152, -1883),
    "/z42":             (76, 76, 0, -1959),
    "/z43":             (76, 76, -76, -1959),
    "/z44":             (76, 76, -152, -1959),
    "/z45":             (76, 76, 0, -2035),
    "/z46":             (72, 76, -76, -2035),
    "/z47":             (76, 76, -148, -2035)
    })

# Clop table.
add_weird_sheet("mylittleandysonic1_clop", "http://b.thumbs.redditmedia.com/fbgZb0jhgTvSQMWC.png", {
    "/clop10":          (66, 74, -77, 0),
    "/clop20":          (70, 75, -153, 0),
    "/clop30":          (71, 74, -227, 0),
    "/clop40":          (69, 75, -306, 0),
    "/clop00":          (67, 73, -4, -2),
    "/clop11":          (71, 77, -68, -73),
    "/clop01":          (64, 76, -2, -75),
    "/clop31":          (68, 75, -215, -75),
    "/clop41":          (71, 76, -295, -76),
    "/clop21":          (64, 67, -142, -84),
    "/clop12":          (76, 76, -76, -151),
    "/clop22":          (76, 76, -151, -151),
    "/clop02":          (66, 75, -7, -153),
    "/clop32":          (69, 72, -235, -155),
    "/clop42":          (66, 74, -312, -158),
    "/clop23":          (68, 74, -153, -229),
    "/clop33":          (64, 73, -230, -230),
    "/clop13":          (71, 72, -76, -231),
    "/clop03":          (63, 72, -10, -232),
    "/clop43":          (63, 73, -303, -236),
    "/clop14":          (63, 77, -83, -304),
    "/clop34":          (75, 76, -217, -304),
    "/clop04":          (70, 76, -5, -305),
    "/clop24":          (64, 75, -150, -305),
    "/clop44":          (64, 66, -306, -314),
    "/clop45":          (70, 75, -3, -382),
    "/sur26":           (70, 75, -3, -382),
    "/clop46":          (70, 75, -80, -382),
    "/rsur26":          (70, 75, -80, -382)
    })

# Filly table and misc stuff.
add_weird_sheet("mylittleandysonic1_misc16", "http://d.thumbs.redditmedia.com/OODIcUkVM2hyCSyi.png", {
    "/fillyab":                 (70, 52, 0, 0),
    "/fillyaj":                 (70, 58, -52, 0),
    "/fillybonbon":             (70, 62, -110, 0),
    "/fillycelestia":           (70, 65, -172, 0),
    "/fillydashready":          (70, 113, -237, 0),
    "/fillyderpy":              (70, 69, -350, 0),
    "/fillycheerile":           (70, 42, 0, -70),
    "/fillydis":                (70, 78, -52, -70),
    "/fillyflirt":              (70, 109, -130, -70),
    "/fillyfluttershysing":     (70, 97, -239, -70),
    "/fillylyra":               (70, 65, -336, -70),
    "/fillyspitfire":           (70, 50, 0, -140),
    "/fillyfluttershy":         (70, 76, -52, -140),
    "/fillyoctavia":            (70, 69, -130, -140),
    "/fillypinkie":             (70, 70, -199, -140),
    "/fillyrose":               (70, 71, -269, -140),
    "/fillysbstare":            (70, 72, -340, -140),
    "/fillyfritter":            (70, 67, -52, -210),
    "/fillyrd":                 (70, 61, -130, -210),
    "/fillydash":                (70, 61, -130, -210),
    "/fillytwidance":           (70, 74, -199, -210),
    "/scootasmile":             (70, 65, -273, -210),
    "/fillykarma":              (70, 78, -52, -280),
    "/fillystrudel":            (70, 68, -130, -280),
    "/fillyvinyl":              (70, 57, -199, -280),
    "/ppwhat":                  (109, 116, -285, -304),
    "/fillyluna":               (70, 62, -52, -350),
    "/fillytrixie":             (70, 61, -130, -350),
    "/rarityfilly":             (70, 74, -199, -350)
    })

# A couple of /fun's split out from the rest.
add_weird_sheet("mylittleandysonic1_misc17", "http://a.thumbs.redditmedia.com/oKR1l6L29UAOWRwB.png", {
    "/artfun":                   (212, 166, -2, -2),
    "/bryvoodfun":               (212, 166, -2, -170),
    "/pixelfun":                 (212, 166, -2, -338)
    })

# FIXME: Omitted from here: the text coloring stuff.

add_simple_emote("mylittleandysonic1_misc", "/hoppy", "http://f.thumbs.redditmedia.com/yncP92ucLKCxJ1t_.png", (105, 157), (0, 0))

################################################################################
##
## END EMOTES
##
################################################################################

def main():
    parser = argparse.ArgumentParser(description="Generate BetterPonymote's CSS file and JS emote map.")
    parser.add_argument("--css", default="data/betterponymotes.css", type=argparse.FileType("w"), help="CSS output file", required=False)
    parser.add_argument("--js", default="data/emote_map.js", type=argparse.FileType("w"), help="JS output file", required=False)
    args = parser.parse_args()

    dump_css(args.css)
    dump_emote_map(args.js)

if __name__ == "__main__":
    main()
