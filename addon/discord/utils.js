/**
 * Discord Integration for Typhos' BetterPonymotes
 * (c) 2015 ByzantineFailure
 *
 * Utility functions
 **/
function htmlCollectionToArray(coll) {
    return [].slice.call(coll);
}

function BPM_setOption(option, value) {
    var bpmEvent = new CustomEvent('bpm_message')
    bpmEvent.data = { method: 'set_pref', pref: option, value: value };
    window.dispatchEvent(bpmEvent);
}

function BPM_retreivePrefs(callback) {
    var prefsListener = function(e) {
        var message = e.data;
        switch(message.method) {
            case 'prefs':
                window.removeEventListener('bpm_message', prefsListener);
                callback(message.prefs);
                break;
        }
    }
    window.addEventListener('bpm_message', prefsListener, false);
    var getPrefs =new CustomEvent('bpm_message');
    getPrefs.data = { method: 'get_prefs' };
    window.dispatchEvent(getPrefs);
}
