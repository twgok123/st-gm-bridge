const extensionName = 'st-gm-bridge';
const extensionFolderPath = 'scripts/extensions/third-party/st-gm-bridge';
const pluginServerUrl = 'http://localhost:8090';

async function loadSessionConfig() {
    const response = await fetch(`${pluginServerUrl}/session/config`);
    const config = await response.json();
    $('#rpg-companion-enabled').prop('checked', Boolean(config.rpgCompanionEnabled));
}

async function saveSessionConfig() {
    const rpgCompanionEnabled = Boolean($('#rpg-companion-enabled').prop('checked'));
    const statusElement = $('#rpg-save-status');

    try {
        const response = await fetch(`${pluginServerUrl}/session/config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rpgCompanionEnabled }),
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        statusElement.text('Saved.');
    } catch (error) {
        statusElement.text('Save failed.');
        console.error(`[${extensionName}] Failed to save RPG setting:`, error);
    }
}

jQuery(async () => {
    console.log(`[${extensionName}] Loading...`);

    try {
        const settingsHtml = await $.get(`${extensionFolderPath}/settings.html`);
        $('#extensions_settings2').append(settingsHtml);
        $(document).on('click', '#rpg-save-btn', saveSessionConfig);
        await loadSessionConfig();
        console.log(`[${extensionName}] Loaded successfully`);
    } catch (error) {
        console.error(`[${extensionName}] Failed to load:`, error);
    }
});
