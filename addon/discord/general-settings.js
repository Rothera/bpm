/**
 * Discord Integration for Typhos' Better Ponymotes
 * (c) 2015 ByzantineFailure
 *
 * Handlers for the general settings subpanel
 **/
var BPM_generalSettingsSubpanel = {
    init: null,
    teardown: null
};
(function() {
    function BPM_initGeneral(optionsPanel) {
        var inputs = htmlCollectionToArray(optionsPanel.getElementsByTagName('input'));
        var checkboxes = inputs.filter(function(input) { return input.type == 'checkbox'; });

        checkboxes.forEach(function(checkbox) {
            checkbox.nextElementSibling.addEventListener('click', function() {
                var option = checkbox.getAttribute('data-bpmoption');
                BPM_setOption(option, !checkbox.checked);
                checkbox.checked = !checkbox.checked;
            });
        });
        function initPrefs(prefs) {
            checkboxes.forEach(function(checkbox) {
                checkbox.checked = prefs[checkbox.getAttribute('data-bpmoption')];  
            });
        }
        BPM_retreivePrefs(initPrefs);
    }

    function BPM_teardownGeneral(optionsPanel) {
        var inputs = htmlCollectionToArray(optionsPanel.getElementsByTagName('input'));
        var checkboxes = inputs.filter(function(input) { return input.type == 'checkbox'; });
        checkboxes.forEach(function(checkbox) {
            checkbox.nextElementSibling.removeEventListener('click');
        });
    }

    BPM_generalSettingsSubpanel.init = BPM_initGeneral;
    BPM_generalSettingsSubpanel.teardown = BPM_teardownGeneral;
})();

