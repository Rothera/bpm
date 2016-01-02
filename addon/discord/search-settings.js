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

        var searchEnable = document.getElementById('bpm-option-enable-search');
        searchEnable.checked = prefs.enableGlobalSearch;
        searchEnable.nextElementSibling.addEventListener('click', function(e) {
            searchEnable.checked = !searchEnable.checked;
            prefs.enableGlobalEmoteSearch = searchEnable.checked;
            BPM_setOption('enableGlobalSearch', searchEnable.checked);
        });
    }
    BPM_retreivePrefs(initSearchPrefs);
}
function teardownSearchSubpanel(subpanel) {
    var limitInput = document.getElementById('bpm-option-search-limit');
    limitInput.removeEventListener('keydown'); 
        
    var searchEnable = document.getElementById('bpm-option-enable-search');
    searchEnable.nextElementSibling.removeEventListener('click');
}

BPM_searchSubpanel.init = initSearchSubpanel;
BPM_searchSubpanel.teardown = teardownSearchSubpanel;
})();
