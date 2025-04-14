// 配置参数
const SESSION_TIMEOUT = 10 * 60 * 1000; // 10分钟会话有效期

// 系统状态
let currentUser = null;
let sessionTimer = null;
let prizes = []; // 獎品資料
let users = {}; // 使用者資料

// 页面初始化
document.addEventListener('DOMContentLoaded', async function () {
    await loadUsers(); // 先載入使用者資料
    await loadPrizes(); // 再載入獎品資料
    
    const savedUser = JSON.parse(localStorage.getItem('yangyang_prize_user'));

    if (savedUser && Date.now() < savedUser.expires) {
        // 自动登录有效会话
        currentUser = savedUser;
        handleSuccessfulLogin(savedUser.username);
    } else {
        // 清除无效会话
        clearLoginState();
    }
});

// 載入使用者資料
async function loadUsers() {
    try {
        const response = await fetch('users.txt');
        if (!response.ok) throw new Error('無法載入使用者資料');
        users = await response.json();
    } catch (error) {
        console.error('載入使用者資料失敗:', error);
        users = {};
        alert('系統初始化失敗，請刷新頁面重試');
    }
}

// 載入獎品資料
async function loadPrizes() {
    try {
        // 顯示載入中提示
        const prizeGrid = document.getElementById('prizeGrid');
        if (prizeGrid) {
            prizeGrid.innerHTML = '<div style="text-align:center;padding:20px;">載入獎品中...⏳</div>';
        }
        
        const response = await fetch('prizes.txt');
        if (!response.ok) throw new Error('無法載入獎品資料');
        prizes = await response.json();
    } catch (error) {
        console.error('載入獎品資料失敗:', error);
        prizes = [];
        // 顯示錯誤訊息
        const prizeGrid = document.getElementById('prizeGrid');
        if (prizeGrid) {
            prizeGrid.innerHTML = '<div style="text-align:center;color:red;padding:20px;">獎品資料載入失敗，請稍後再試</div>';
        }
    }
}

// 登录表单提交
document.getElementById('loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const username = document.getElementById('username').value.toLowerCase();
    const password = document.getElementById('password').value;

    if (authenticateUser(username, password)) {
        currentUser = createUserSession(username);
        saveLoginState(username);
        handleSuccessfulLogin(username);
    } else {
        showLoginError();
    }
});

// 核心功能函数
function authenticateUser(username, password) {
    return users[username] && users[username].pw === password;
}

function createUserSession(username) {
    return {
        username: username,
        points: users[username].points,
        expires: Date.now() + SESSION_TIMEOUT
    };
}

function handleSuccessfulLogin(username) {
    // 更新界面状态
    document.getElementById('loginContainer').style.display = 'none';
    document.getElementById('prizeSection').style.display = 'block';
    document.getElementById('historyBtn').style.display = 'block';
    document.getElementById('logoutBtn').style.display = 'block';
    document.querySelector('.history-link').href = users[username].history;

    // 更新用户信息显示
    updatePointsDisplay();
    showPrizes();

    // 启动会话计时器
    startSessionTimer();
}

function saveLoginState(username) {
    localStorage.setItem('yangyang_prize_user', JSON.stringify({
        username: username,
        expires: Date.now() + SESSION_TIMEOUT,
        points: users[username].points
    }));
}

function clearLoginState() {
    localStorage.removeItem('yangyang_prize_user');
    currentUser = null;

    // 重置界面状态
    document.getElementById('loginContainer').style.display = 'block';
    document.getElementById('prizeSection').style.display = 'none';
    document.getElementById('historyBtn').style.display = 'none';
    document.getElementById('logoutBtn').style.display = 'none';
}

function logout() {
    clearLoginState();
    alert('👋 已成功登出！');
    location.reload();
}

function startSessionTimer() {
    clearTimeout(sessionTimer);
    sessionTimer = setTimeout(() => {
        alert('⏳ 您的登入已過期，請重新登入');
        logout();
    }, SESSION_TIMEOUT);
}

const imageModal = document.getElementById('imageModal');
const expandedImage = document.getElementById('expandedImage');
const closeModal = document.getElementById('closeModal');

function updatePointsDisplay() {
    const display = document.getElementById('userPoints');
    display.innerHTML = `
        <span style="color:var(--text-blue);">👩‍🔬 ${currentUser.username.toUpperCase()}</span><br>
        擁有星星：<span style="font-size:1.5em">${currentUser.points}</span> 顆 🌟
        <div style="font-size:0.8em;color:var(--text-blue);opacity:0.8;">默/測: 100 +2⭐, 90up +1.5⭐, 80up +1⭐</div>
        <div style="font-size:0.8em;color:var(--text-blue);opacity:0.8;">(100分額外送1包卡/額外+1⭐)</div>
    `;
}

async function showPrizes() {
    if (prizes.length === 0) {
        await loadPrizes();
    }
    filterPrizes('all');
    initCategoryFilter();
}

function initCategoryFilter() {
    const buttons = document.querySelectorAll('.category-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', function () {
            buttons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            filterPrizes(this.dataset.category);
        });
    });
}

function filterPrizes(category) {
    const filtered = category === 'all'
        ? prizes
        : prizes.filter(p => p.category === category);
    renderPrizes(filtered);
}

function renderPrizes(prizeList) {
    // 先複製陣列以避免修改原始數據
    const shuffledPrizes = [...prizeList].sort(() => Math.random() - 0.5);

    // 使用 Fisher-Yates 洗牌算法進行隨機排序
    for (let i = shuffledPrizes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledPrizes[i], shuffledPrizes[j]] = [shuffledPrizes[j], shuffledPrizes[i]];
    }

    const grid = document.getElementById('prizeGrid');
    grid.innerHTML = shuffledPrizes.map(prize => `
        <div class="prize-card">
            <img src="${prize.image}" class="prize-image" alt="${prize.name}">
            <h3 style="color:var(--text-blue);">${prize.name}</h3>
            <div class="points">
                ${prize.points} 顆 ⭐
                ${currentUser.points >= prize.points && prize.stock > 0 ?
                    '<div style="color:var(--accent-blue);">✓ 可以兌換</div>' :
                    '<div style="color:var(--text-blue);opacity:0.6;">✗ 無法兌換</div>'}
            </div>
            <div class="stock">剩餘數量：${prize.stock > 0 ? prize.stock : '無存貨'}</div>
        </div>
    `).join('');

    initImageClick();
}

function initImageClick() {
    document.querySelectorAll('.prize-image').forEach(img => {
        img.addEventListener('click', function () {
            expandedImage.src = this.src;
            expandedImage.alt = this.alt;
            imageModal.classList.add('active');
        });
    });
}

closeModal.addEventListener('click', () => imageModal.classList.remove('active'));
imageModal.addEventListener('click', (e) => e.target === imageModal && imageModal.classList.remove('active'));
document.addEventListener('keydown', (e) => e.key === 'Escape' && imageModal.classList.remove('active'));

function showLoginError() {
    alert('❌ 帳號或密碼錯誤！');
}