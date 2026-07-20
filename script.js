/**
 * =========================================================================
 * dropuc-sait — Официальный скрипт сайта Dropuc
 * Разработка: Dropuc & Партнер программиста
 * Технологии: Firebase Realtime Database v8, Вкладки, Адаптивное меню.
 * =========================================================================
 */

// =========================================================================
// 1. ИНИЦИАЛИЗАЦИЯ GOOGLE FIREBASE
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
// 2. ДЕКЛАРАЦИЯ DOM-ПЕРЕМЕННЫХ (HTML ЭЛЕМЕНТЫ)
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
const submitBtn = document.getElementById('submitBtn');

// Переменные навигации разделов и боковой панели
const navItems = document.querySelectorAll('.nav-item');
const tabContents = document.querySelectorAll('.tab-content');
const sidebarMenu = document.getElementById('sidebarMenu');
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const closeMobileMenu = document.getElementById('closeMobileMenu');

// =========================================================================
// 3. МЕНЕДЖЕР ВКЛАДОК И ВЫЕЗДНОГО МЕНЮ ДЛЯ СМАРТФОНОВ
// =========================================================================

// Функция плавного и безопасного переключения страниц
function switchTab(tabId) {
    // Скрываем весь контент
    tabContents.forEach(tab => tab.classList.remove('active'));
    // Убираем подсветку кнопок
    navItems.forEach(item => item.classList.remove('active'));

    // Включаем целевой блок
    const targetTab = document.getElementById(tabId);
    if (targetTab) targetTab.classList.add('active');

    // Подсвечиваем активную кнопку
    const targetNavItem = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
    if (targetNavItem) targetNavItem.classList.add('active');
}

// Отслеживание кликов по кнопкам в левом меню
navItems.forEach(item => {
    item.addEventListener('click', () => {
        const targetTabId = item.getAttribute('data-tab');
        switchTab(targetTabId);
        // Закрываем шторку на смартфонах после клика
        sidebarMenu.classList.remove('open');
    });
});

// Работа мобильного меню
if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener('click', () => {
        sidebarMenu.classList.add('open');
    });
}

if (closeMobileMenu) {
    closeMobileMenu.addEventListener('click', () => {
        sidebarMenu.classList.remove('open');
    });
}

// =========================================================================
// 4. СИСТЕМА ОБЛАЧНОЙ АВТОРИЗАЦИИ ПОЛЬЗОВАТЕЛЕЙ
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

    // Запрос в Firebase для проверки пользователя
    database.ref('users/' + username).once('value').then((snapshot) => {
        const userData = snapshot.val();

        if (userData) {
            if (userData.password === password) {
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
                showError('Этот ник занят! Неверный пароль.');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Войти / Создать';
            }
        } else {
            // Если пользователя нет — создаем новый аккаунт
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
                showError('Ошибка БД: ' + err.message);
                submitBtn.disabled = false;
                submitBtn.textContent = 'Войти / Создать';
            });
        }
    }).catch((err) => {
        showError('Ошибка сервера: ' + err.message);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Войти / Создать';
    });
});

function showError(text) {
    errorMessage.textContent = 'Ошибка: ' + text;
    errorMessage.style.display = 'block';
}

// =========================================================================
// 5. МОДУЛЬ REALTIME ЧАТА (GOOGLE FIREBASE DATABASE)
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

// Чтение и рендеринг последних 50 сообщений в чате
database.ref('messages').orderByChild('timestamp').limitToLast(50).on('value', function(snapshot) {
    chatMessages.innerHTML = '';
    
    const data = snapshot.val();
    if (!data) {
        chatMessages.innerHTML = `<div class="chat-guest-prompt" style="margin-top: 100px; border:none; background:none;">Здесь пока нет сообщений. Будьте первыми!</div>`;
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

    // Автоматическая прокрутка чата вниз при получении сообщений
    chatMessages.scrollTop = chatMessages.scrollHeight;
});

// Защита от XSS-уязвимостей (вредоносных кодов в чате)
function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

// =========================================================================
// 6. МОДУЛЬ АККОРДЕОНА FAQ (ВОПРОСЫ И ОТВЕТЫ)
// =========================================================================
const faqQuestions = document.querySelectorAll('.faq-question');

faqQuestions.forEach(question => {
    question.addEventListener('click', () => {
        const item = question.parentElement;
        const answer = item.querySelector('.faq-answer');
        const isActive = item.classList.contains('active');

        // Закрываем все остальные открытые вкладки FAQ
        document.querySelectorAll('.faq-item').forEach(otherItem => {
            otherItem.classList.remove('active');
            otherItem.querySelector('.faq-answer').style.maxHeight = null;
        });

        // Открываем текущую вкладку плавно по высоте текста
        if (!isActive) {
            item.classList.add('active');
            answer.style.maxHeight = answer.scrollHeight + "px";
        }
    });
});

// Дополнительные обработчики закрытия модального окна
closeBtn.addEventListener('click', closeModal);
window.addEventListener('click', function(e) {
    if (e.target === authModal) {
        closeModal();
    }
});

// Старт проверки состояния входа
checkUserLogin();
