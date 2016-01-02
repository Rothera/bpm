/**
 * Discord integration for BPM
 * (c) 2015-2016 ByzantineFailure
 *
 * Search panel settings
 **/
var BPM_searchSubpanel = {
    init: null,
    teardown: null
};
(function() {
function initSearchSubpanel(subpanel) {
    function initSearchPrefs(prefs) {
        var limitInput = document.getElementById('bpm-option-search-limit');
        limitInput.value = prefs.searchLimit;
        limitInput.addEventListener('keydown', function(e) {
            if(e.keyCode != 13) return;
            e.preventDefault();
            
            var newValue = parseInt(limitInput.value);
            if(!newValue || newValue < 0) {
                alert('Search limit must be positive integer');
                return;
            }

            prefs.searchLimit = newValue;
            BPM_setOption('searchLimit', newValue);
        });
    }
    BPM_retreivePrefs(initSearchPrefs);
}
function teardownSearchSubpanel(subpanel) {
    var limitInput = document.getElementById('bpm-option-search-limit');
    limitInput.removeEventListener('keydown'); 
}

BPM_searchSubpanel.init = initSearchSubpanel;
BPM_searchSubpanel.teardown = teardownSearchSubpanel;
})();
