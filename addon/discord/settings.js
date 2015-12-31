/**
 * Discord integration for Typhos' BetterPonymotes
 * (c) 2015 ByzantineFailure
 * 
 * Injects BPM settings panel into Discord
 * Backend inserts HTML so we can maintain
 * that cleanly without hardcoding the HTML here.
 **/
function htmlCollectionToArray(coll) {
    return [].slice.call(coll);
}
(function() {
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

function cleanBpmSettingsListeners() {
    console.log('Called clean settings listeners!');
}

//Leaks memory:  When Done is detached remove this listener
function addDoneClickListener(doneButton) {
    function onDoneClick() {
        var settingElement = document.getElementById('bpm_settings_panel');
        if(settingElement) {
            settingElement.parent.removeChild(settingElement);
        }
    }
    doneButton.addEventListener('click', onDoneClick);
}

function sendInjectSettingsPageMessage(injectInto) {
    if(document.getElementById('bpm_settings_panel')) return;
     
    var backendEvent = new CustomEvent('bpm_backend_message');
    backendEvent.data = { method: 'insert_settings_wrapper', injectInto: injectInto };
    window.dispatchEvent(backendEvent);
    //TODO: Do this with an event listener
    waitForElementById('bpm_settings_panel', addSubpanelSelectListeners);
}

//Initial setup for subpanels and their listeners
function addSubpanelSelectListeners() {
    function injectWait(injectTarget) {
        function addListeners(topTabs) {
            var subpanelSelectors = htmlCollectionToArray(topTabs.getElementsByTagName('div'));
            var selected = subpanelSelectors.filter(function(li) { return li.className.indexOf('selected') > -1; })[0];
            if(!selected) selected = subpanelSelectors[0];
            
            selectSubpanel(selected);

            subpanelSelectors.forEach(function(selector) {
                selector.addEventListener('click', function() { selectSubpanel(selector); }); 
            });
        }
        waitForElementById('bpm-options-tab-list', addListeners);
    }
    waitForElementById('bpm-options-inject-target', injectWait);
}

//Clean listeners off of a subpanel
function cleanSubpanel() {
    var injectTarget = document.getElementById('bpm-options-inject-target');
    if(!injectTarget) {
        console.log('BPM: Called cleanSubpanel without inject target present!');
        return;
    }
    console.log('called clean subpanel!');
}

//Cleans up old subpanel contents, sends message to
//inject new subpanel contents
function selectSubpanel(selector) {
    var subpanelSelectors = htmlCollectionToArray(selector.parentElement.getElementsByTagName('div'));
    cleanSubpanel();
    focusTabElement(selector);
    var injectTarget = document.getElementById('bpm-options-inject-target');
    var injectEvent = new CustomEvent('bpm_backend_message');
    injectEvent.data = { method: selector.getAttribute('data-bpmSubpanelMessage'), injectInto: injectTarget};
    while(injectTarget.lastChild) {
        injectTarget.removeChild(injectTarget.lastChild);
    }
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
    waitForElementById('bpm_settings_panel', toggleSettingsDisplay);
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

function BPM_initOptions(optionsPanel) {
    var inputs = htmlCollectionToArray(optionsPanel.getElementsByTagName('input'));
    var checkboxes = inputs.filter(function(input) { return input.type == 'checkbox'; });
    checkboxes.forEach(function(checkbox) {
        checkbox.nextElementSibling.addEventListener('click', function() {
            var option = checkbox.getAttribute('data-bpmoption');
            BPM_setOption(option, !checkbox.checked);
            checkbox.checked = !checkbox.checked;
        });
    });

    var initListener = function(event) {
        var message = event.data;
        switch(message.method) {
            case 'prefs':
                var prefs = message.prefs; 
                checkboxes.forEach(function(checkbox) {
                    checkbox.checked = prefs[checkbox.getAttribute('data-bpmoption')];  
                });
                window.removeEventListener('bpm_message', initListener);
                break;
        }
    }
    window.addEventListener('bpm_message', initListener, false);
    
    var getPrefs = new CustomEvent('bpm_message');    
    getPrefs.data = { method: 'get_prefs' };
    window.dispatchEvent(getPrefs);
}


function BPM_setOption(option, value) {
    var bpmEvent = new CustomEvent('bpm_message')
    bpmEvent.data = { method: 'set_pref', pref: option, value: value };
    window.dispatchEvent(bpmEvent);
}
