// Known spoiler "emotes" to avoid expanding alt-text on. Not all of these are
// known to BPM, and it's not really worth moving this to a data file somewhere.
// - /spoiler is from r/mylittlepony (and copied around like mad)
// - /s is from r/falloutequestria (and r/mylittleanime has a variant)
// - #s is from r/doctorwho
// - /b and /g are from r/dresdenfiles
var spoiler_links = [
    "/spoiler", // r/mylittlepony and many other subreddits
    "/s",       // r/falloutequestria, and a variant in r/mylittleanime
    "/g",       // r/dresdenfiles
    "/b",       // r/dresdenfiles
    "#s",       // r/doctorwho and r/gameofthrones
    "#g",       // r/gameofthrones
    "#b",       // r/gameofthrones
    "/a",       // r/ShingekiNoKyojin
    "/m",       // r/ShingekiNoKyojin
    "/t",       // r/ShingekiNoKyojin
    "#spoiler", // r/gravityfalls
    "#fg",      // r/LearnJapanese
    ];

/*
 * Sets the sourceinfo hover on an emote element.
 */
function add_sourceinfo(element, state, is_emote, is_unknown) {
    var name = element.getAttribute("href");
    var title = "";

    if(is_emote) {
        var subreddit = element.getAttribute("data-bpm_srname");

        if(state.indexOf("d") > -1) {
            title = "Disabled ";
            if(state.indexOf("n") > -1) {
                title += "NSFW ";
            }
            title += "emote ";
        }
        title += name + " from " + subreddit;
    } else if(is_unknown) {
        title = "Unknown emote " + name;
    }

    element.title = title;
}

/*
 * Decides whether or not the alt-text on this element needs to be processed.
 * Returns bpm_state if yes, null if no.
 */
function should_convert_alt_text(element, state, is_emote) {
    // Already processed? Avoid doing silly things like expanding things again
    // (or our sourceinfo hover)
    if(state.indexOf("a") > -1) {
        return false;
    }

    // Avoid spoiler links. We can't rely on any emote data to exist, as
    // of them aren't known as emotes
    var href = element.getAttribute("href");
    if(href && spoiler_links.indexOf(href.split("-")[0]) > -1) {
        return false;
    }

    if(is_emote) {
        // Emotes require a sourceinfo hover, no matter what
        return true;
    }

    if(!element.title) {
        // Note, we don't bother setting state="a" in this case
        return false;
    }

    // Work around RES putting tag links and other things with alt-text on
    // them in the middle of posts- we don't want to expand those.
    if(element.classList.contains("userTagLink") ||
       element.classList.contains("voteWeight") ||
       element.classList.contains("expando-button")) {
        return false;
    }

    return true;
}

/*
 * Generates the actual alt-text element. Handles embedded links.
 */
function generate_alt_text(title, container) {
    // Split on links, so we can turn those into real links. These are rare,
    // but worth handling nicely. Also prepend a space for formatting- it makes
    // the most difference on non-emote elements.
    // (\b doesn't seem to be working when I put it at the end, here??
    // Also, note that we do grab the space at the end for formatting)
    //                                  http://    < domain name >    /url?params#stuff
    var parts = (" " + title).split(/\b(https?:\/\/[a-zA-Z0-9\-.]+(?:\/[a-zA-Z0-9\-_.~'();:+\/?%#]*)?(?:\s|$))/);

    // Handle items in pairs: one chunk of text and one link at a time
    for(var j = 0; j < Math.floor(parts.length / 2); j += 2) {
        if(parts[j]) {
            container.appendChild(document.createTextNode(parts[j]));
        }
        var link_element = document.createElement("a");
        link_element.textContent = parts[j + 1];
        link_element.href = parts[j + 1];
        container.appendChild(link_element);
    }

    // The last bit is just text. (And likely the only chunk there is, anyway.)
    if(parts[parts.length - 1]) {
        container.appendChild(document.createTextNode(parts[parts.length - 1]));
    }
}

function convert_alt_text(element, is_emote, is_unknown) {
    // If this is an image link, try to put the alt-text on the other side
    // of the RES expando button. It looks better that way.
    var before = element.nextSibling; // Thing to put alt-text before
    while(before && before.className !== undefined &&
          before.classList.contains("expando-button")) {
        before = before.nextSibling;
    }

    // As a note: alt-text kinda has to be a block-level element, in order
    // to go in the same place as the emote it's attached to. The chief
    // exception is -in emotes, so as a bit of a hack, we assume the
    // converter has already run and check for known -in flags. The other
    // possibility is that this is just a normal link of some kind, so
    // treat those as special too.
    var element_type = "div";
    if(element.classList.contains("bpflag-in") ||
       element.classList.contains("bpflag-inp") ||
       (!is_emote && !is_unknown)) {
        element_type = "span";
    }

    // Do the actual conversion
    var container = document.createElement(element_type);
    container.classList.add("bpm-alttext");
    generate_alt_text(element.title, container);
    element.parentNode.insertBefore(container, before);
}

/*
 * Converts alt-text on an <a> element as appropriate. Will respond to the emote
 * converter if it has already run on this element.
 */
function process_alt_text(element) {
    var state = element.getAttribute("data-bpm_state") || "";
    var is_emote = state.indexOf("e") > -1;
    var is_unknown = state.indexOf("u") > -1;

    // Early exit- some elements we just ignore completely
    if(!should_convert_alt_text(element, state, is_emote)) {
        return;
    }

    // Actual alt-text conversion
    if(element.title) {
        convert_alt_text(element, is_emote, is_unknown);
    }

    // Special support for emotes- replace the alt-text with source info
    if(is_emote || is_unknown) {
        add_sourceinfo(element, state, is_emote, is_unknown);
    }

    // Mark as handled, so we don't ever run into it again.
    element.setAttribute("data-bpm_state", state + "a");
}
