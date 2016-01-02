/**
 * BPM for Discord
 * (c) 2015-2016 ByzantineFailure
 * 
 * Updates panel handlers.  Version number inserted
 * during the build process (see Makefile)
 **/

var codeVersion = /* REPLACE-WITH-DC-VERSION */;
var BPM_updatesSubpanel = {
    init: null,
    teardown: null
};
function BPM_checkForUpdates(silenceIfNone) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://api.github.com/repos/ByzantineFailure/bpm/tags');
    xhr.onreadystatechange = function() {
        if(xhr.readyState != 4) return;
        if(xhr.status !== 200 && xhr.status !== 304) {
           alert('Error checking for updates, HTTP status: ' + xhr.status'.  Is Github down?'); 
           return;
        }
        var response = JSON.parse(xhr.responseText);
        var tags = response.map(function(tag) { return tag.name });
        if(tags[0] !== codeVersion) {
            alert('Current BPM for Discord version is ' + codeVersion + ', found version ' + tags[0] + '\n' +
                    'Link to updates can be found in the Updates panel of BPM settings.');
        } else if(!silenceIfNone) {
            alert('BPM up to date!');
        }
    }
    xhr.send(null);
}

(function() {
    function initUpdates(subpanel) {
        var updateButton = document.getElementById('bpm-check-for-updates-button');
        updateButton.addEventListener('click', function(e) {
            e.preventDefault();
            BPM_checkForUpdates(false);
        });
    }
    function teardownUpdates(subpanel) {
        var updateButton = document.getElementById('bpm-check-for-updates-button');
        updateButton.removeEventListener('click');
    }


    BPM_updatesSubpanel.init = initUpdates;
    BPM_updatesSubpanel.teardown = teardownUpdates;
})();

BPM_checkForUpdates(true);
