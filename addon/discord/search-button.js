/**
 * BPM for Discord
 * (c) 2015-2016 ByzantineFailure
 *
 * Adds the search button to the discord UI
 **/
(function() {
//TODO: Move to utils
function waitForElement(elementClass, callback) {
    var element = document.getElementsByClassName(elementClass);
    if(element.length == 0) {
        window.setTimeout(function() { waitForElement(elementClass, callback); }, 100);
    } else {
        callback(element[0]);
    }
}

function modifyHelpContainer(container) {
    container.className += ' bpm-help-container';
    createSearchButton(container);
}

//We rely on BPM's core code to attach this listener
function createSearchButton(container) {
    var searchButton = document.createElement('div');
    searchButton.className = 'need-help-button bpm-emote-search-button';
    var blankSpan = document.createElement('span');
    blankSpan.className = 'btn-help';
    searchButton.appendChild(blankSpan);
    
    var helpText = document.createElement('span');
    helpText.className = 'help-text';
    helpText.appendChild(document.createTextNode('Emote Search'));
    searchButton.appendChild(helpText);
    
    container.insertBefore(searchButton, container.firstChild);
}

waitForElement('help-container', modifyHelpContainer);
})();

