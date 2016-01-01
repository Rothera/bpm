/**
 * Discord integration for Typhos' BetterPonymotes
 * (c) 2015 ByzantineFailure
 * 
 * Injects BPM settings panel into Discord
 * Backend inserts HTML so we can maintain
 * that cleanly without hardcoding the HTML here.
 *
 * Creates and handles subpanel switching
 **/
(function() {
var unimplementedSubpanel = { 
    init: function() { console.log('init unimplemented'); }, 
    teardown: function() { console.log('teardown unimplemented'); } 
};
//Maps subpanel requests to their corresponding init/teardown objects
var subpanelMap = {
    insert_general_settings: BPM_generalSettingsSubpanel,
    insert_emote_settings: BPM_emoteSettingsSubpanel,
    insert_subreddit_settings: unimplementedSubpanel,
    insert_search_settings: unimplementedSubpanel
}

function waitForElement(elementClass, callback) {
    var element = document.getElementsByClassName(elementClass);
    if(element.length == 0) {
        window.setTimeout(function() { waitForElement(elementClass, callback); }, 100);
    } else {
        callback(element[0]);
    }
}
function waitForElementById(id, callback) {
    var element = document.getElementById(id);
    if(!element) {
        window.setTimeout(function() { waitForElement(id, callback); }, 100);
    } else {
        callback(element);
    }

}

//Leaks memory:  Detached event needs to be watched so 
//we can remove listeners
function injectBpmSettingsPanel(settingsButton) {
    function addTabElement(tabBar) {
        var tabElement = document.createElement('div');
        tabElement.className = 'tab-bar-item';
        tabElement.innerHTML = 'BPM';
        tabElement.id = 'bpm-settings-tab-item';
        tabBar.appendChild(tabElement);
    }

    function addTabAndListeners(tabBar) {
        addTabElement(tabBar);
        var items = document.getElementsByClassName('tab-bar-item');
        Array.prototype.forEach.call(items, function(item) {
            item.addEventListener('click', function() { 
                var bpmTab = document.getElementById('bpm-settings-tab-item');
                if(bpmTab && bpmTab.className.indexOf('selected') > -1 && 
                    item.id != 'bpm-settings-tab-item') {
                    cleanBpmSettingsListeners();
                }
                focusTabElement(item); 
                showSettings(item.id == 'bpm-settings-tab-item');
            }, false);
        });
    }

    settingsButton.addEventListener('click', function() {
        waitForElement('tab-bar SIDE', addTabAndListeners);
        waitForElement('settings-inner', sendInjectSettingsPageMessage);
    });
}

//Leaks memory:  When Done is detached remove this listener
function addDoneClickListener(doneButton) {
    function onDoneClick() {
        var settingElement = document.getElementById('bpm-settings-panel');
        if(settingElement) {
            settingElement.parent.removeChild(settingElement);
        }
        cleanSubpanel();
    }
    doneButton.addEventListener('click', onDoneClick);
}

function sendInjectSettingsPageMessage(injectInto) {
    if(document.getElementById('bpm-settings-panel')) return;
     
    var backendEvent = new CustomEvent('bpm_backend_message');
    backendEvent.data = { method: 'insert_settings_wrapper', injectInto: injectInto };
    window.dispatchEvent(backendEvent);
    //TODO: Do this with an event listener
    waitForElementById('bpm-settings-panel', addSubpanelSelectListeners);
}

//Initial setup for subpanels and their listeners
function addSubpanelSelectListeners() {
    function injectWait(injectTarget) {
        function addListeners(topTabs) {
            var subpanelSelectors = htmlCollectionToArray(topTabs.getElementsByTagName('div'));
            var selected = subpanelSelectors.filter(function(li) { return li.className.indexOf('selected') > -1; })[0];
            if(!selected) selected = subpanelSelectors[0];
            
            selectSubpanel(selected, false);

            subpanelSelectors.forEach(function(selector) {
                selector.addEventListener('click', function() { selectSubpanel(selector, true); }); 
            });
        }
        waitForElementById('bpm-options-tab-list', addListeners);
    }
    waitForElementById('bpm-options-inject-target', injectWait);
}

//Clean listeners off of a subpanel
function cleanSubpanel() {
    var topTabs = document.getElementById('bpm-options-tab-list');
    var subpanelSelectors = htmlCollectionToArray(topTabs.getElementsByTagName('div'));
    var selected = subpanelSelectors.filter(function(element) { return element.className.indexOf('selected') > -1; })[0];
    if(!selected) {
        console.log('BPM: called cleanSubpanel but could not find selected subpanel');
        return;
    }
    
    var subpanel = document.getElementById('bpm-settings-subpanel');
    if(!subpanel) {
        console.log('BPM: called cleanSubpanel without a subpanel present!');
            return;
    }
    var subpanelFunctions = getSubpanelFunctions(selected);
    subpanelFunctions.teardown(subpanel);
}

function getSubpanelFunctions(selector) {
    return subpanelMap[selector.getAttribute('data-bpmSubpanelMessage')];
}

//Calls old subpanel's teardown, sends message to
//inject new subpanel contents and sets up response listener
//for init
function selectSubpanel(selector, performTeardown) {
    var subpanelSelectors = htmlCollectionToArray(selector.parentElement.getElementsByTagName('div'));
    var injectTarget = document.getElementById('bpm-options-inject-target');
    if(performTeardown) {
        cleanSubpanel();
    }
    focusTabElement(selector);
    var injectEvent = new CustomEvent('bpm_backend_message');
    injectEvent.data = { method: selector.getAttribute('data-bpmSubpanelMessage'), injectInto: injectTarget};
    while(injectTarget.lastChild) {
        injectTarget.removeChild(injectTarget.lastChild);
    }
    var subpanelFunctions = getSubpanelFunctions(selector);
    function afterSubpanelInject(e) {
        var message = e.data;
        switch(message.method) {
            case 'subpanel_inject_complete':
                var subpanel = message.subpanel;
                subpanelFunctions.init(subpanel);
                window.removeEventListener('bpm_backend_message', afterSubpanelInject);
                break;
        }
    }
    window.addEventListener('bpm_backend_message', afterSubpanelInject, false);
    window.dispatchEvent(injectEvent);
}

function focusTabElement(element) {
    var settingsItems = element.parentElement.getElementsByClassName('tab-bar-item');
    Array.prototype.forEach.call(settingsItems, function(item) {
        item.className = 'tab-bar-item';
    });
    element.className += ' selected';
}

function showSettings(display) {
    var settingsInner = document.getElementsByClassName('settings-inner')[0];
    if(!settingsInner) {
        console.log('BPM: Called showSettings when settingsInner does not exist!');
        return;
    }
    waitForElementById('bpm-settings-panel', toggleSettingsDisplay);
    function toggleSettingsDisplay(settings) {
        if(display) {
            settingsInner.firstChild.style.display = 'none';
            settings.style.display = 'flex';
        } else {
            settingsInner.firstChild.style.display = 'flex';
            settings.style.display = 'none';
        } 
    }
}

waitForElement('btn btn-settings', injectBpmSettingsPanel);
})();

