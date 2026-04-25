let authToken = localStorage.getItem('st-gm-bridge-token') || null;
let currentUsername = localStorage.getItem('st-gm-bridge-username') || null;
let displayName = currentUsername;
let authMode = 'register';
let isEditingDisplayName = false;

const authOverlay = document.querySelector('#auth-overlay');
const registerTab = document.querySelector('#register-tab');
const loginTab = document.querySelector('#login-tab');
const authTitle = document.querySelector('#auth-title');
const usernameInput = document.querySelector('#auth-username');
const passwordInput = document.querySelector('#auth-password');
const authSubmitButton = document.querySelector('#auth-submit-button');
const authStatus = document.querySelector('#auth-status');
const playerHeader = document.querySelector('#player-header');
const playerWelcome = document.querySelector('#player-welcome');
const displayNameInput = document.querySelector('#display-name-input');
const displayNameButton = document.querySelector('#display-name-button');
const logoutButton = document.querySelector('#logout-button');

function tryRestoreSession() {
    if (authToken && currentUsername) {
        showAuthenticatedUi(currentUsername);
    } else {
        authOverlay.classList.remove('hidden');
        playerHeader.classList.add('hidden');
    }
}

function setAuthMode(mode) {
    authMode = mode;
    const isRegister = mode === 'register';

    registerTab.classList.toggle('active', isRegister);
    loginTab.classList.toggle('active', !isRegister);
    registerTab.setAttribute('aria-selected', String(isRegister));
    loginTab.setAttribute('aria-selected', String(!isRegister));
    authTitle.textContent = isRegister ? 'Register' : 'Login';
    authSubmitButton.textContent = isRegister ? 'Register' : 'Login';
    authStatus.textContent = isRegister ? 'Register to join the session.' : 'Log in to rejoin the session.';
}

function showAuthenticatedUi(username) {
    currentUsername = username;
    displayName = username;
    playerWelcome.textContent = `Welcome, ${currentUsername}`;
    displayNameInput.value = displayName;
    displayNameInput.disabled = true;
    displayNameButton.textContent = 'Edit';
    isEditingDisplayName = false;

    // Fetch session config and apply RPG panel visibility
    fetch('/session/config')
        .then(res => res.json())
        .then(config => {
            if (!config.rpgCompanionEnabled) {
                document.body.classList.add('rpg-disabled');
            } else {
                document.body.classList.remove('rpg-disabled');
            }
        })
        .catch(err => {
            console.error('[st-gm-bridge] Failed to load session config:', err);
            // Default to hiding RPG panel if config fails
            document.body.classList.add('rpg-disabled');
        });

    authOverlay.classList.add('hidden');
    playerHeader.classList.remove('hidden');
}

async function sendAuthRequest() {
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    const endpoint = authMode === 'register' ? '/auth/register' : '/auth/login';

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    });
    const data = await response.json();

    if (!response.ok) {
        authStatus.textContent = data.error || 'Authentication failed.';
        return;
    }

    authToken = data.token;
    localStorage.setItem('st-gm-bridge-token', authToken);
    currentUsername = data.username;
    localStorage.setItem('st-gm-bridge-username', currentUsername);
    authStatus.textContent = `Logged in as ${data.username}.`;
    showAuthenticatedUi(data.username);
}

function toggleDisplayNameEdit() {
    if (!isEditingDisplayName) {
        isEditingDisplayName = true;
        displayNameInput.disabled = false;
        displayNameInput.focus();
        displayNameButton.textContent = 'Save';
        return;
    }

    displayName = displayNameInput.value.trim() || currentUsername;
    displayNameInput.value = displayName;
    displayNameInput.disabled = true;
    displayNameButton.textContent = 'Edit';
    isEditingDisplayName = false;
}

function logout() {
    localStorage.removeItem('st-gm-bridge-token');
    localStorage.removeItem('st-gm-bridge-username');
    authToken = null;
    currentUsername = null;
    displayName = null;
    playerHeader.classList.add('hidden');
    authOverlay.classList.remove('hidden');
    authStatus.textContent = 'Logged out.';
}

registerTab.addEventListener('click', () => setAuthMode('register'));
loginTab.addEventListener('click', () => setAuthMode('login'));
authSubmitButton.addEventListener('click', sendAuthRequest);
displayNameButton.addEventListener('click', toggleDisplayNameEdit);
if (logoutButton) {
    logoutButton.addEventListener('click', logout);
}

tryRestoreSession();
console.log('[st-gm-bridge] Client page loaded');
