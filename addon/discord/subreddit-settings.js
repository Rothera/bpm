/**
 * Discord integration for Typhos' Better Ponymotes
 * (c) 2015-2016 ByzantineFailure
 *
 * Code for initializing and tearing down the subreddits
 * settings page.
 **/

var BPM_subredditSettingsSubpanel = {
    init: null,
    teardown: null
};
(function() {
function BPM_initSubreddits(subpanel) {
    function initSubredditPrefs(prefs) {
        var list = document.getElementById('bpm-subreddit-list');
        Object.keys(prefs.enabledSubreddits2).forEach(function(key) {
            list.appendChild(createCheckbox(key, prefs, !!prefs.enabledSubreddits2[key]));
        });
    }
    BPM_retreivePrefs(initSubredditPrefs);
}
function createCheckbox(subredditName, prefs, checked) {
    var li = document.createElement('li');
    
    var checkboxDiv = document.createElement('div');
    checkboxDiv.className = 'checkbox';
    li.appendChild(checkboxDiv);

    var checkboxInner = document.createElement('div');
    checkboxInner.className = 'checkbox-inner';
    checkboxDiv.appendChild(checkboxInner);

    var checkboxInput = document.createElement('input');
    checkboxInput.type = 'checkbox';
    checkboxInner.appendChild(checkboxInput);
    checkboxInput.checked = checked;

    var checkboxBlankSpan = document.createElement('span');
    checkboxInner.appendChild(checkboxBlankSpan);
    checkboxBlankSpan.addEventListener('click', createClickHandler(subredditName, checkboxInput, prefs));

    var checkboxLabel = document.createElement('span');
    checkboxLabel.appendChild(document.createTextNode(subredditName));
    checkboxDiv.appendChild(checkboxLabel);
    return checkboxDiv;
}

function createClickHandler(subredditName, inputElement, prefs) {
    var handler = function(e) {
        e.preventDefault();
        inputElement.checked = !inputElement.checked;
        var newValue = inputElement.checked ? 1 : 0;
        prefs.enabledSubreddits2[subredditName] = newValue;
        BPM_setOption('enabledSubreddits2', prefs.enabledSubreddits2);
        console.log('clicked on subreddit ' + subredditName);
    };
    return handler;
}

function BPM_teardownSubreddits(subpanel) {
    var list = document.getElementById('bpm-subreddit-list');
    var inputs = htmlCollectionToArray(list.getElementsByTagName('input'));
    inputs.forEach(function(input) {
        input.nextElementSibling.removeEventListener('click');
    });
}

BPM_subredditSettingsSubpanel.init = BPM_initSubreddits;
BPM_subredditSettingsSubpanel.teardown = BPM_teardownSubreddits;
})();
