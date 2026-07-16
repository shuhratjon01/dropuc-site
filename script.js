/**
 * =========================================================================
 * dropuc-sait — Официальный скрипт сайта Dropuc
 * Разработчики: Dropuc & Партнер программиста
 * Назначение: Защищенная авторизация по паролю в облаке Firebase,
 * реальный онлайн-чат и интерактивный блок FAQ.
 * =========================================================================
 */

// =========================================================================
// 1. НАСТРОЙКА И ИНИЦИАЛИЗАЦИЯ GOOGLE FIREBASE
// =========================================================================
const firebaseConfig = {
    apiKey: "AIzaSyDS7bXTTeEgUcKhVrGShqrpT5gQNus6cqI",
    authDomain: "dropuc-sait.firebaseapp.com",
    databaseURL: "https://dropuc-sait-default-rtdb.firebaseio.com",
    projectId: "dropuc-sait",
    storageBucket: "dropuc-sait.firebasestorage.app",
    messagingSenderId: "582601031946",
    appId: "1:582601031946:web:eb9ab0f9163f08accdbaf3",
    measurementId: "G-RDEF8V9W2W"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// =========================================================================
// 2. ПОИСК HTML-ЭЛЕМЕНТОВ (DOM)
// =========================================================================
const authModal = document.getElementById('authModal');
const openAuthBtn = document.getElementById('openAuthBtn');
const closeBtn = document.querySelector('.close-btn');
const regForm = document.getElementById('regForm');
const userStatus = document.getElementById('userStatus');

const regUsernameInput = document.getElementById('regUsername');
const regPasswordInput = document.getElementById('regPassword');

const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');

const chatMessages = document.getElementById('chatMessages');
const chatInputArea = document.getElementById('chatInputArea');
const scrollToChatBtn = document.getElementById('scrollToChat');
const chatBlock = document.getElementById('chatBlock');
const submitBtn = document.getElementById('submitBtn');

// =========================================================================
// 3. ЛОГИКА ЗАЩИЩЕННОЙ АВТОРИЗАЦИИ (ОБЛАЧНАЯ ПРОВЕРКА ПАРОЛЕЙ)
// =========================================================================

function checkUserLogin() {
    const savedUser = localStorage.getItem('registeredUser');
    if (savedUser) {
        userStatus.textContent = `Привет, ${savedUser}!`;
        openAuthBtn.textContent = 'Выйти';
        openAuthBtn.onclick = logout;
        renderChatInput(savedUser);
    } else {
        userStatus.textContent = 'Привет, Гость!';
        openAuthBtn.textContent = 'Войти в аккаунт';
        openAuthBtn.onclick = openModal;
        renderGuestPrompt();
    }
}

function openModal() {
    authModal.style.display = 'flex';
    errorMessage.style.display = 'none';
    successMessage.style.display = 'none';
}

function closeModal() {
    authModal.style.display = 'none';
    regForm.reset();
}

function logout() {
    localStorage.removeItem('registeredUser');
    checkUserLogin();
}

// Защищенная авторизация и регистрация через облако Firebase
regForm.addEventListener('submit', function(e) {
    e.preventDefault();

    const username = regUsernameInput.value.trim();
    const password = regPasswordInput.value;

    errorMessage.style.display = 'none';
    successMessage.style.display = 'none';

    if (username.length < 2) {
        showError('Ник должен быть не менее 2 символов!');
        return;
    }

    if (password.length < 4) {
        showError('Пароль должен быть не менее 4 символов!');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Проверка...';

    // Запрашиваем информацию о пользователе из ветки "users" в Firebase
    database.ref('users/' + username).once('value').then((snapshot) => {
        const userData = snapshot.val();

        if (userData) {
            // Пользователь существует -> проверяем пароль
            if (userData.password === password) {
                // Пароль верный -> Успешный вход!
                successMessage.textContent = 'Успешный вход под ником ' + username + '!';
                successMessage.style.display = 'block';
                localStorage.setItem('registeredUser', username);
                
                setTimeout(() => {
                    closeModal();
                    checkUserLogin();
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Войти / Создать';
                }, 1500);
            } else {
                // Пароль неверный!
                showError('Этот ник занят! Неверный пароль.');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Войти / Создать';
            }
        } else {
            // Пользователь не существует -> Регистрируем новый ник в облаке!
            database.ref('users/' + username).set({
                password: password
            }).then(() => {
                successMessage.textContent = 'Новый аккаунт успешно создан!';
                successMessage.style.display = 'block';
                localStorage.setItem('registeredUser', username);

                setTimeout(() => {
                    closeModal();
                    checkUserLogin();
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Войти / Создать';
                }, 1500);
            }).catch((err) => {
                showError('Ошибка базы данных: ' + err.message);
                submitBtn.disabled = false;
                submitBtn.textContent = 'Войти / Создать';
            });
        }
    }).catch((err) => {
        showError('Ошибка связи с сервером: ' + err.message);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Войти / Создать';
    });
});

function showError(text) {
    errorMessage.textContent = 'Ошибка: ' + text;
    errorMessage.style.display = 'block';
}

// =========================================================================
// 4. ОНЛАЙН-ЧАТ В РЕАЛЬНОМ ВРЕМЕНИ (GOOGLE FIREBASE)
// =========================================================================

function renderChatInput(username) {
    chatInputArea.innerHTML = `
        <form id="chatForm" class="chat-form">
            <input type="text" id="chatInput" class="chat-input" placeholder="Напишите сообщение в общий чат..." required autocomplete="off">
            <button type="submit" class="btn-send">Отправить</button>
        </form>
    `;

    const chatForm = document.getElementById('chatForm');
    chatForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const chatInput = document.getElementById('chatInput');
        const text = chatInput.value.trim();
        
        if (text) {
            sendMessageToFirebase(username, text);
            chatInput.value = ''; 
        }
    });
}

function renderGuestPrompt() {
    chatInputArea.innerHTML = `
        <div class="chat-guest-prompt">
            Пожалуйста, <span id="chatRegLink">войдите в аккаунт</span>, чтобы писать в чат.
        </div>
    `;
    document.getElementById('chatRegLink').addEventListener('click', openModal);
}

function sendMessageToFirebase(author, text) {
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    database.ref('messages').push({
        author: author,
        text: text,
        time: timeString,
        timestamp: firebase.database.ServerValue.TIMESTAMP 
    });
}

database.ref('messages').orderByChild('timestamp').limitToLast(50).on('value', function(snapshot) {
    chatMessages.innerHTML = '';
    
    const data = snapshot.val();
    if (!data) {
        chatMessages.innerHTML = `<div class="chat-guest-prompt" style="margin-top: 100px;">Здесь пока нет сообщений. Будьте первыми!</div>`;
        return;
    }

    Object.keys(data).forEach(key => {
        const msg = data[key];
        const messageElement = document.createElement('div');
        messageElement.className = 'message';
        messageElement.innerHTML = `
            <div class="message-header">
                <span class="message-author">${escapeHTML(msg.author)}</span>
                <span class="message-time">${msg.time || ''}</span>
            </div>
            <div class="message-text">${escapeHTML(msg.text)}</div>
        `;
        chatMessages.appendChild(messageElement);
    });

    chatMessages.scrollTop = chatMessages.scrollHeight;
});

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

scrollToChatBtn.addEventListener('click', () => {
    chatBlock.scrollIntoView({ behavior: 'smooth' });
});

// =========================================================================
// 5. ИНТЕРАКТИВНЫЙ БЛОК FAQ (АККОРДЕОН)
// =========================================================================
const faqQuestions = document.querySelectorAll('.faq-question');

faqQuestions.forEach(question => {
    question.addEventListener('click', () => {
        const item = question.parentElement;
        const answer = item.querySelector('.faq-answer');
        const isActive = item.classList.contains('active');

        document.querySelectorAll('.faq-item').forEach(otherItem => {
            otherItem.classList.remove('active');
            otherItem.querySelector('.faq-answer').style.maxHeight = null;
        });

        if (!isActive) {
            item.classList.add('active');
            answer.style.maxHeight = answer.scrollHeight + "px";
        }
    });
});

closeBtn.addEventListener('click', closeModal);
window.addEventListener('click', function(e) {
    if (e.target === authModal) {
        closeModal();
    }
});

checkUserLogin();