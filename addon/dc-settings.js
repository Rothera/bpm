/**
 * Discord integration for Typhos' BetterPonymotes
 * (c) 2015 ByzantineFailure
 * 
 * Injects BPM settings panel into Discord
 * Backend inserts HTML so we can maintain
 * that cleanly without hardcoding the HTML here.
 **/
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
        window.setTimeout(function() { waitForElement(elementClass, callback); }, 100);
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
            item.addEventListener('click', function() { focusTabElement(item); }, false);
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
    backendEvent.data = { method: 'insert_settings', injectInto: injectInto };
    window.dispatchEvent(backendEvent);
}

function focusTabElement(element) {
    var settingsItems = document.getElementsByClassName('tab-bar-item');
    Array.prototype.forEach.call(settingsItems, function(item) {
        item.className = 'tab-bar-item';
    });
    element.className += ' selected';
    showSettings(element.id == 'bpm-settings-tab-item');
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
