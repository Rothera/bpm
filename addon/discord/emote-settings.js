/**
 * Discord integration for Typhos' BetterPonymotes
 * (c) 2015 ByzantineFailure
 *
 * Init, teardown for emote settings subpanel
 *
 * NOTE: If you do not prevent the default handler
 * from firing on button elements and for enter on input 
 * elements, Discord's bugswat code will detect it and 
 * force a hard refresh of its window.
 **/
var BPM_emoteSettingsSubpanel = {
    init: null,
    teardown: null
};
(function() {
function BPM_initEmoteSettings(subpanel) {
    function initEmotePrefs(prefs) {
        var whitelist = prefs.whitelistedEmotes;
        var blacklist = prefs.disabledEmotes;

        var whitelistNode = document.getElementById('bpm-option-whitelisted-emotes');
        var blacklistNode = document.getElementById('bpm-option-blacklisted-emotes');

        whitelist.forEach(function(entry) {
            BPM_addEmoteListEntry(entry, whitelistNode, prefs);
        });
        blacklist.forEach(function(entry) {
            BPM_addEmoteListEntry(entry, blacklistNode, prefs);
        });
       
        var blacklistInput = document.getElementById('bpm-emote-blacklist-input');
        var whitelistInput = document.getElementById('bpm-emote-whitelist-input');
        
        blacklistInput.addEventListener('keydown', function(e) {
            if(e.keyCode == 13) {
                e.preventDefault();
            }
            if(!blacklistInput.value || e.keyCode != 13) return true;
            
            var toAdd = blacklistInput.value;
            blacklistInput.value = '';
            toAdd = BPM_prepEmoteName(toAdd);
            if(prefs.disabledEmotes.indexOf(toAdd) > -1) {
                return false;
            }

            prefs.disabledEmotes.push(toAdd);
            BPM_setOption('disabledEmotes', prefs.disabledEmotes);
            BPM_addEmoteListEntry(toAdd, blacklistNode, prefs);
            return false;
        });
        whitelistInput.addEventListener('keydown', function(e) {
            if(e.keyCode == 13) {
                e.preventDefault();
            }
            if(!whitelistInput.value || e.keyCode != 13) return true;
            
            var toAdd = whitelistInput.value;
            whitelistInput.value = '';
            toAdd = BPM_prepEmoteName(toAdd);
            if(prefs.whitelistedEmotes.indexOf(toAdd) > -1) {
                return false;
            }

            prefs.whitelistedEmotes.push(toAdd);
            BPM_setOption('whitelistedEmotes', prefs.whitelistedEmotes);
            BPM_addEmoteListEntry(toAdd, whitelistNode, prefs);
            return false;
        });
        
        var clearBlacklistButton = document.getElementById('bpm-clear-blacklist-button');
        var clearWhitelistButton = document.getElementById('bpm-clear-whitelist-button');
        
        clearBlacklistButton.addEventListener('click', function(e) {
            e.preventDefault();
            BPM_removeEmoteSettingsSpans(blacklistNode); 
            prefs.disabledEmotes = [];
            BPM_setOption('disabledEmotes', []);
            return false;
        });

        clearWhitelistButton.addEventListener('click', function(e) {
            e.preventDefault();
            BPM_removeEmoteSettingsSpans(whitelistNode); 
            prefs.whitelistedEmotes = [];
            BPM_setOption('whitelistedEmotes', []);
            return false;
        });
    }
    BPM_retreivePrefs(initEmotePrefs);
}

function BPM_prepEmoteName(name) {
    if(name.charAt(0) != '/') {
        name = '/' + name;
    }
    return name;
}

function BPM_removeEmotePreferenceEntry(name, whitelist, prefs) {
    var prefName = whitelist ? 'whitelistedEmotes' : 'disabledEmotes';
    var index = prefs[prefName].indexOf(name);
    if(index < 0) {
        console.log('Tried to remove nonexistent entry ' + name + 'from emote list ' + prefName);
        return;
    }
    prefs[prefName].splice(index, 1);
    BPM_setOption(prefName, prefs[prefName]);
}

function BPM_addEmoteListEntry(name, addTo, prefs) {
    var node = document.createElement('span');
    node.className ="bpm-listed-emote";
    node.appendChild(document.createTextNode(name));
    node.setAttribute('data-bpmemotename', name);
    node.addEventListener('click', function() {
        var whitelist = node.parentElement.id.indexOf('whitelist') > -1;
        node.parentElement.removeChild(node);
        BPM_removeEmotePreferenceEntry(name, whitelist, prefs);
        node.removeEventListener('click');
    });
    addTo.appendChild(node);
}

function BPM_removeEmoteSettingsSpans(target) {
    var spans = htmlCollectionToArray(target.getElementsByTagName('span'));
    spans.forEach(function(span) {
        span.removeEventListener('click');
        target.removeChild(span);
    });
}

function BPM_cleanEmoteSettings(subpanel) {
    var whitelistNode = document.getElementById('bpm-option-whitelisted-emotes');
    var blacklistNode = document.getElementById('bpm-option-blacklisted-emotes');
    BPM_removeEmoteSettingsSpans(whitelistNode);
    BPM_removeEmoteSettingsSpans(blacklistNode);

    var blacklistInput = document.getElementById('bpm-emote-blacklist-input');
    var whitelistInput = document.getElementById('bpm-emote-whitelist-input');
    blacklistInput.removeEventListener('keydown');
    whitelistInput.removeEventListener('keydown');

    var clearBlacklistButton = document.getElementById('bpm-clear-blacklist-button');
    var clearWhitelistButton = document.getElementById('bpm-clear-whitelist-button');
    clearBlacklistButton.removeEventListener('click');
    clearWhitelistButton.removeEventListener('click');
}

BPM_emoteSettingsSubpanel.init = BPM_initEmoteSettings
BPM_emoteSettingsSubpanel.teardown = BPM_cleanEmoteSettings
})();

