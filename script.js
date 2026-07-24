const firebaseConfig = {
    apiKey: "AIzaSyDS7bXTTeEgUcKhVrGShqrpT5gQNus6cqI",
    authDomain: "dropuc-sait.firebaseapp.com",
    databaseURL: "https://dropuc-sait-default-rtdb.firebaseio.com",
    projectId: "dropuc-sait",
    storageBucket: "dropuc-sait.firebasestorage.app",
    messagingSenderId: "582601031946",
    appId: "1:582601031946:web:eb9ab0f9163f08accdbaf3"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let selectedAvatarUrl = "https://api.dicebear.com/7.x/bottts/svg?seed=1";

const authModal = document.getElementById('authModal');
const openAuthBtn = document.getElementById('openAuthBtn');
const closeBtn = document.querySelector('.close-btn');
const regForm = document.getElementById('regForm');
const userStatus = document.getElementById('userStatus');
const profileNavItem = document.getElementById('profileNavItem');

const chatMessages = document.getElementById('chatMessages');
const chatInputArea = document.getElementById('chatInputArea');
const navItems = document.querySelectorAll('.nav-item');
const tabContents = document.querySelectorAll('.tab-content');

// Переключение вкладок
function switchTab(tabId) {
    tabContents.forEach(tab => tab.classList.remove('active'));
    navItems.forEach(item => item.classList.remove('active'));

    const targetTab = document.getElementById(tabId);
    if (targetTab) targetTab.classList.add('active');

    const targetNavItem = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
    if (targetNavItem) targetNavItem.classList.add('active');
}

navItems.forEach(item => {
    item.addEventListener('click', () => {
        switchTab(item.getAttribute('data-tab'));
    });
});

// Авторизация и статус
function checkUserLogin() {
    const savedUser = localStorage.getItem('registeredUser');
    if (savedUser) {
        userStatus.textContent = `Привет, ${savedUser}!`;
        openAuthBtn.textContent = 'Выйти';
        openAuthBtn.onclick = () => { localStorage.removeItem('registeredUser'); checkUserLogin(); };
        profileNavItem.style.display = 'block';
        renderChatInput(savedUser);
        loadUserProfile(savedUser);
    } else {
        userStatus.textContent = 'Привет, Гость!';
        openAuthBtn.textContent = 'Войти в аккаунт';
        openAuthBtn.onclick = () => authModal.style.display = 'flex';
        profileNavItem.style.display = 'none';
        renderGuestPrompt();
    }
}

function loadUserProfile(username) {
    database.ref('users/' + username).on('value', snapshot => {
        const data = snapshot.val() || {};
        document.getElementById('profileUsernameDisplay').textContent = username;
        document.getElementById('profileXpDisplay').textContent = (data.xp || 0) + ' XP';
        document.getElementById('shopXpBalance').textContent = data.xp || 0;

        if (data.avatar) {
            document.getElementById('profileAvatarPreview').src = data.avatar;
        }
        if (data.equippedFrame) {
            const framePreview = document.getElementById('profileFramePreview');
            framePreview.src = data.equippedFrame;
            framePreview.style.display = 'block';
        }
    });
}

// Галерея аватарок
document.querySelectorAll('.avatar-option').forEach(img => {
    img.addEventListener('click', function() {
        document.querySelectorAll('.avatar-option').forEach(i => i.classList.remove('selected'));
        this.classList.add('selected');
        selectedAvatarUrl = this.getAttribute('data-avatar');
        document.getElementById('profileAvatarPreview').src = selectedAvatarUrl;
    });
});

// Сохранение аватара/пароля
document.getElementById('updateProfileForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const currentUser = localStorage.getItem('registeredUser');
    const newPassword = document.getElementById('editPassword').value;

    const updates = { avatar: selectedAvatarUrl };
    if (newPassword.trim().length >= 4) {
        updates.password = newPassword;
    }

    database.ref('users/' + currentUser).update(updates).then(() => {
        alert('Профиль успешно обновлен!');
    });
});

// Отправка сообщений (+5 XP)
function renderChatInput(username) {
    chatInputArea.innerHTML = `
        <form id="chatForm" style="display:flex; gap:10px;">
            <input type="text" id="chatInput" class="input-group" style="flex-grow:1; margin:0;" placeholder="Напишите сообщение..." required autocomplete="off">
            <button type="submit" class="btn btn-primary">Отправить</button>
        </form>
    `;

    document.getElementById('chatForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const input = document.getElementById('chatInput');
        const text = input.value.trim();
        if (text) {
            const now = new Date();
            const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            database.ref('users/' + username).once('value').then(snap => {
                const userData = snap.val() || {};
                
                database.ref('messages').push({
                    author: username,
                    text: text,
                    avatar: userData.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=1',
                    frame: userData.equippedFrame || '',
                    time: timeString,
                    timestamp: firebase.database.ServerValue.TIMESTAMP
                });

                // Начисление +5 XP
                database.ref('users/' + username + '/xp').transaction(current => (current || 0) + 5);
                input.value = '';
            });
        }
    });
}

function renderGuestPrompt() {
    chatInputArea.innerHTML = `<div style="text-align:center; color:#94a3b8;">Войдите в аккаунт, чтобы писать в чат и зарабатывать XP!</div>`;
}

// Загрузка сообщений в чат
database.ref('messages').orderByChild('timestamp').limitToLast(50).on('value', snapshot => {
    chatMessages.innerHTML = '';
    const data = snapshot.val();
    if (data) {
        Object.keys(data).forEach(key => {
            const msg = data[key];
            const div = document.createElement('div');
            div.className = 'message';
            div.innerHTML = `
                <div style="display:flex; align-items:center;">
                    <div class="message-avatar-wrap">
                        <img src="${msg.avatar}" class="message-avatar">
                        ${msg.frame ? `<img src="${msg.frame}" class="avatar-frame-overlay">` : ''}
                    </div>
                    <span class="message-author">${escapeHTML(msg.author)}</span>
                    <span style="font-size:11px; color:#64748b;">${msg.time || ''}</span>
                </div>
                <div style="margin-top:6px; color:#e2e8f0;">${escapeHTML(msg.text)}</div>
            `;
            chatMessages.appendChild(div);
        });
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
});

// Магазин рамок
document.querySelectorAll('.btn-buy').forEach(button => {
    button.addEventListener('click', function() {
        const currentUser = localStorage.getItem('registeredUser');
        if (!currentUser) return alert('Сначала войдите в аккаунт!');

        const price = parseInt(this.getAttribute('data-price'));
        const itemId = this.getAttribute('data-item-id');
        const frameUrl = this.getAttribute('data-frame-url');

        const userRef = database.ref('users/' + currentUser);
        userRef.once('value').then(snapshot => {
            const userData = snapshot.val() || {};
            const userXp = userData.xp || 0;
            const inventory = userData.inventory || {};

            if (inventory[itemId]) {
                userRef.update({ equippedFrame: frameUrl });
                return alert('Рамка успешно надета!');
            }

            if (userXp >= price) {
                const updates = {};
                updates['xp'] = userXp - price;
                updates['inventory/' + itemId] = true;
                updates['equippedFrame'] = frameUrl;

                userRef.update(updates).then(() => alert('Покупка совершена! Рамка надета.'));
            } else {
                alert('Недостаточно XP! Напишите больше сообщений в чате.');
            }
        });
    });
});

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
}

closeBtn.addEventListener('click', () => authModal.style.display = 'none');
checkUserLogin();
