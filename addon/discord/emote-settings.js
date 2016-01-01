/**
 * Discord integration for Typhos' BetterPonymotes
 * (c) 2015 ByzantineFailure
 *
 * Init, teardown for emote settings subpanel
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

        blacklistInput.addEventListener('keyup', function(e) {
            //Do normal stuff for anything but enter
            if(e.keyCode != 13 || !blacklistInput.value) return true;

            var toAdd = blacklistInput.value;
            blacklistInput.value = '';
            prefs.disabledEmotes.push(toAdd);
            BPM_setOption('disabledEmotes', prefs.disabledEmotes);
            BPM_addEmoteListEntry(toAdd, blacklistNode, prefs);
        });

        whitelistInput.addEventListener('keyup', function(e) {
            //Do normal stuff for anything but enter
            if(e.keyCode != 13 || !whitelistInput.value) return true;

            var toAdd = whitelistInput.value;
            whitelistInput.value = '';
            prefs.whitelistedEmotes.push(toAdd);
            BPM_setOption('whitelistedEmotes', prefs.whitelistedEmotes);
            BPM_addEmoteListEntry(toAdd, whitelistNode, prefs);
        });

        var clearBlacklistButton = document.getElementById('bpm-clear-blacklist-button');
        var clearWhitelistButton = document.getElementById('bpm-clear-whitelist-button');
        
        clearBlacklistButton.addEventListener('click', function() {
           BPM_removeEmoteSettingsSpans(blacklistNode); 
           prefs.disabledEmotes = [];
           BPM_setOption('disabledEmotes', []);
        });

        clearWhitelistButton.addEventListener('click', function() {
           BPM_removeEmoteSettingsSpans(whitelistNode); 
           prefs.whitelistedEmotes = [];
           BPM_setOption('whitelistedEmotes', []);
        });
    }
    BPM_retreivePrefs(initEmotePrefs);
}

function BPM_removeEmotePreferenceEntry(name, whitelist, prefs) {
    var prefName = whitelist ? 'whitelistedEmotes' : 'disabledEmotes';
    var index = prefs[prefName].indexOf(name);
    if(index < 0) {
        console.log('Tried to remove nonexistent entry ' + name + 'from emote list ' + prefName);
        return;
    }
    prefs[prefName].splice(index, 1);
    BPM_setOption(name, prefs[prefName]);
}

function BPM_addEmoteListEntry(name, addTo, prefs) {
    var node = document.createElement('span');
    node.className =".bpm-listed-emote";
    node.appendChild(document.createTextElement(name));
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
    //Handlers to remove:  Clear buttons, inputs, spans
    console.log('Called clean emote settings!');
}
BPM_emoteSettingsSubpanel.init = BPM_initEmoteSettings
BPM_emoteSettingsSubpanel.teardown = BPM_cleanEmoteSettings
})();

