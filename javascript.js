// ═══════════════════════════════════════════
// EMAIL CONFIG (EmailJS)
// ═══════════════════════════════════════════
// Get these from https://www.emailjs.com/
const EMAIL_CONFIG = {
  PUBLIC_KEY: "",     // Replace with your Public Key
  SERVICE_ID: "",     // Replace with your Service ID
  TEMPLATE_ID: ""     // Replace with your Template ID
};

// ═══════════════════════════════════════════
// GOOGLE CONFIG (Google Identity)
// ═══════════════════════════════════════════
const GOOGLE_CONFIG = {
  CLIENT_ID: "" // Replace with your Google OAuth Client ID
};

if (EMAIL_CONFIG.PUBLIC_KEY) {
  emailjs.init(EMAIL_CONFIG.PUBLIC_KEY);
}

function initGoogleAuth() {
  if (!GOOGLE_CONFIG.CLIENT_ID) {
    console.warn("Google Client ID not configured. Using Demo Mode.");
    renderMockGoogleButtons();
    return;
  }

  google.accounts.id.initialize({
    client_id: GOOGLE_CONFIG.CLIENT_ID,
    callback: handleGoogleCredentialResponse
  });

  renderGoogleButtons();
}

function renderMockGoogleButtons() {
  const signupBtn = document.getElementById('google-signup-btn');
  const recoverBtn = document.getElementById('google-recover-btn');

  const mockBtnHtml = (text) => `
        <button onclick="handleMockGoogleLogin()" style="width:100%; display:flex; align-items:center; justify-content:center; gap:10px; padding:10px; background:white; border:1px solid #ddd; border-radius:8px; cursor:pointer; font-family:'Roboto',sans-serif; color:#444; font-weight:500; font-size:14px;">
          <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_Logo.svg" width="18">
          ${text}
        </button>
      `;

  if (signupBtn) signupBtn.innerHTML = mockBtnHtml("Sign up with Google (Demo)");
  if (recoverBtn) recoverBtn.innerHTML = mockBtnHtml("Recover with Google (Demo)");
}

function handleMockGoogleLogin() {
  const mockPayload = {
    email: "demo@gmail.com",
    name: "Demo User"
  };
  processGoogleLogin(mockPayload.email, mockPayload.name);
}

function renderGoogleButtons() {
  const signupBtn = document.getElementById('google-signup-btn');
  const recoverBtn = document.getElementById('google-recover-btn');

  if (signupBtn) {
    google.accounts.id.renderButton(signupBtn, { theme: "outline", size: "large", width: 340 });
  }
  if (recoverBtn) {
    google.accounts.id.renderButton(recoverBtn, { theme: "filled_blue", size: "large", width: 340 });
  }
}

function handleGoogleCredentialResponse(response) {
  const payload = parseJwt(response.credential);
  processGoogleLogin(payload.email.toLowerCase(), payload.name);
}

function processGoogleLogin(email, name) {
  // Find user by email
  const foundKey = Object.keys(state.users || {}).find(k => state.users[k].email === email);

  if (foundKey) {
    state.currentUser = foundKey;
    saveState();
    enterApp();
    showToast(`👋 Welcome back, ${state.users[foundKey].name}!`, 'success');
  } else {
    // If in recovery mode and no user found
    if (currentAuthTab === 'forgot') {
      showAuthError("No account found with this Google email.");
    } else {
      // Automatic signup for new Google users
      const username = email.split('@')[0] + Math.floor(Math.random() * 1000);
      if (!state.users) state.users = {};
      state.users[username] = { ...defaultUserData(), name, email, _password: 'google-oauth-' + Date.now() };
      state.currentUser = username;
      saveState();
      enterApp();
      showToast(`🎉 Welcome, ${name}! Your account is ready.`, 'success');
    }
  }
}

function parseJwt(token) {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));
  return JSON.parse(jsonPayload);
}
// ═══════════════════════════════════════════
// STATE & STORAGE
// ═══════════════════════════════════════════
const STORAGE_KEY = 'microlearn_v2';
let state = {
  currentUser: null,
  users: {},
  dark: true
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) state = JSON.parse(raw);
  } catch (e) { }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getUserData() {
  const u = state.currentUser;
  if (!u || !state.users[u]) {
    state.users[u] = state.users[u] || defaultUserData();
  }
  return state.users[u];
}

function defaultUserData() {
  return {
    name: 'Learner',
    email: '',
    xp: 0, level: 1,
    goals: [],
    progress: {}, // { "YYYY-MM-DD": { goalId: true/false } }
    notes: {},    // { "goalId-YYYY-MM-DD": "text" }
  };
}

function today() {
  const d = new Date();
  return dateStr(d);
}

function dateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

// ═══════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════
let currentAuthTab = 'login';

function switchAuthTab(tab) {
  currentAuthTab = tab;
  document.querySelectorAll('.auth-tab').forEach((t, i) => t.classList.toggle('active', (i === 0 && tab === 'login') || (i === 1 && tab === 'signup')));

  // Hide all forms first
  document.querySelectorAll('.auth-form').forEach(f => f.style.display = 'none');

  // Show requested form
  if (tab === 'login') document.getElementById('login-form').style.display = 'flex';
  else if (tab === 'signup') document.getElementById('signup-form').style.display = 'flex';
  else if (tab === 'forgot') document.getElementById('forgot-form-1').style.display = 'flex';

  document.getElementById('auth-error').style.display = 'none';
  if (tab !== 'forgot') document.querySelector('.auth-tabs').style.display = 'flex';
  else document.querySelector('.auth-tabs').style.display = 'none';

  // Re-render Google buttons when tab switches to ensure they are visible
  setTimeout(renderGoogleButtons, 10);
}

function showAuthError(msg) {
  const el = document.getElementById('auth-error');
  el.textContent = msg; el.style.display = 'block';
}

function handleLogin() {
  const u = document.getElementById('login-username').value.trim();
  const p = document.getElementById('login-password').value;
  if (!u || !p) return showAuthError('Please fill in all fields.');
  const users = state.users || {};
  if (!users[u]) return showAuthError('Account not found. Create one!');
  if (users[u]._password !== p) return showAuthError('Incorrect password.');
  state.currentUser = u;
  saveState(); enterApp();
}

function handleSignup() {
  const name = document.getElementById('signup-name').value.trim();
  const u = document.getElementById('signup-username').value.trim().toLowerCase();
  const email = document.getElementById('signup-email').value.trim().toLowerCase();
  const p = document.getElementById('signup-password').value;
  if (!name || !u || !p || !email) return showAuthError('Please fill in all fields.');
  if (!email.includes('@')) return showAuthError('Please enter a valid Gmail address.');
  if (p.length < 4) return showAuthError('Password must be at least 4 characters.');
  if (state.users && state.users[u]) return showAuthError('Username already taken!');

  // Check if email already taken
  const emailTaken = Object.values(state.users || {}).some(user => user.email === email);
  if (emailTaken) return showAuthError('Gmail address already registered!');

  if (!state.users) state.users = {};
  state.users[u] = { ...defaultUserData(), name, email, _password: p };
  state.currentUser = u;
  saveState(); enterApp();
  showToast('🎉 Account created! Welcome, ' + name + '!', 'success');
}

let mockOTP = null;
let recoveryUser = null;

async function sendOTP() {
  const emailInput = document.getElementById('forgot-email').value.trim().toLowerCase();
  const btn = document.getElementById('send-otp-btn');

  if (!emailInput) return showAuthError('Please enter your Gmail address.');

  // Find user by email
  const foundKey = Object.keys(state.users || {}).find(k => state.users[k].email === emailInput);

  if (!foundKey) return showAuthError('Account not found with this Gmail.');

  recoveryUser = foundKey;
  mockOTP = Math.floor(100000 + Math.random() * 900000).toString();

  // If EmailJS is configured, send a real email
  if (EMAIL_CONFIG.PUBLIC_KEY && EMAIL_CONFIG.SERVICE_ID && EMAIL_CONFIG.TEMPLATE_ID) {
    btn.disabled = true;
    btn.textContent = "Sending...";

    try {
      await emailjs.send(EMAIL_CONFIG.SERVICE_ID, EMAIL_CONFIG.TEMPLATE_ID, {
        to_email: emailInput,
        user_name: state.users[foundKey].name,
        otp_code: mockOTP
      });
      showToast(`📧 OTP sent successfully to ${emailInput}!`, 'success');
    } catch (error) {
      console.error("EmailJS Error:", error);
      showToast("❌ Failed to send real email. Check console or config.", "error");
    } finally {
      btn.disabled = false;
      btn.textContent = "Send OTP →";
    }
  } else {
    // Fallback if not configured
    showToast(`📧 OTP (Demo Mode): ${mockOTP}`, 'success');
    console.warn("EmailJS not configured. Using demo mode.");
  }

  document.getElementById('forgot-form-1').style.display = 'none';
  document.getElementById('forgot-form-2').style.display = 'flex';
  document.getElementById('auth-error').style.display = 'none';
}

function verifyOTP() {
  const otp = document.getElementById('forgot-otp').value.trim();
  if (otp === mockOTP) {
    document.getElementById('forgot-form-2').style.display = 'none';
    document.getElementById('forgot-form-3').style.display = 'flex';
    document.getElementById('auth-error').style.display = 'none';
    showToast('✅ OTP Verified!', 'success');
  } else {
    showAuthError('Invalid OTP. Please try again.');
  }
}

function resetPassword() {
  const newP = document.getElementById('forgot-new-password').value;
  if (newP.length < 4) return showAuthError('Password must be at least 4 characters.');

  state.users[recoveryUser]._password = newP;
  saveState();

  showToast('🔐 Password reset successfully! Please login.', 'success');
  switchAuthTab('login');
}

function continueAsGuest() {
  state.currentUser = 'guest';
  if (!state.users.guest) state.users.guest = { ...defaultUserData(), name: 'Guest' };
  saveState(); enterApp();
}

function handleLogout() {
  state.currentUser = null;
  saveState();
  document.getElementById('app').style.display = 'none';
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('user-dropdown').classList.remove('open');
}

function enterApp() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  initApp();
}

// ═══════════════════════════════════════════
// INIT APP
// ═══════════════════════════════════════════
function initApp() {
  const data = getUserData();
  // Update UI with user info
  const initials = data.name ? data.name[0].toUpperCase() : 'G';
  document.getElementById('user-avatar-initials').textContent = initials;
  document.getElementById('user-name-item').textContent = '👤 ' + data.name;
  document.getElementById('greeting-name').textContent = data.name.split(' ')[0];

  // Date
  const now = new Date();
  document.getElementById('greeting-date').textContent = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Theme
  if (!state.dark) document.documentElement.setAttribute('data-theme', 'light');
  else document.documentElement.removeAttribute('data-theme');

  updateXPBar();
  updateNavBadges();
  updateMotivation();
  renderDashboard();
  renderGoalsPage();
  renderAnalytics();
  checkDailyReminder();
}

// ═══════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════
let currentTab = 'dashboard';

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.toggle('active', t.textContent.trim().toLowerCase().startsWith(tab)));
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + tab).classList.add('active');
  if (tab === 'dashboard') { renderDashboard(); }
  if (tab === 'goals') renderGoalsPage();
  if (tab === 'analytics') renderAnalytics();
  document.getElementById('user-dropdown').classList.remove('open');
}

function showTab(tab) { switchTab(tab); document.getElementById('user-dropdown').classList.remove('open'); }

function toggleMobileMenu() {
  document.getElementById('mobile-menu').classList.toggle('open');
}
function closeMobileMenu() {
  document.getElementById('mobile-menu').classList.remove('open');
}

// ═══════════════════════════════════════════
// DARK MODE
// ═══════════════════════════════════════════
function toggleDark() {
  state.dark = !state.dark;
  if (!state.dark) document.documentElement.setAttribute('data-theme', 'light');
  else document.documentElement.removeAttribute('data-theme');
  saveState();
}

// ═══════════════════════════════════════════
// USER MENU
// ═══════════════════════════════════════════
function toggleUserMenu(e) {
  if (e) e.stopPropagation();
  document.getElementById('user-dropdown').classList.toggle('open');
}
document.addEventListener('click', (e) => {
  if (!e.target.closest('.user-menu-container')) {
    document.getElementById('user-dropdown')?.classList.remove('open');
  }
});

// ═══════════════════════════════════════════
// GOAL MANAGEMENT
// ═══════════════════════════════════════════
let activeFilter = 'all';
let selectedCat = 'coding';

function openAddModal(editId = null) {
  document.getElementById('modal-overlay').classList.add('open');
  document.getElementById('editing-goal-id').value = editId || '';
  if (editId) {
    const data = getUserData();
    const g = data.goals.find(x => x.id === editId);
    if (g) {
      document.getElementById('modal-title').textContent = 'Edit Goal';
      document.getElementById('goal-title-input').value = g.title;
      selectCat(g.cat, document.querySelector(`.cat-opt[data-cat="${g.cat}"]`));
    }
  } else {
    document.getElementById('modal-title').textContent = 'Add New Goal';
    document.getElementById('goal-title-input').value = '';
    selectCat('coding', document.querySelector('.cat-opt[data-cat="coding"]'));
  }
  setTimeout(() => document.getElementById('goal-title-input').focus(), 100);
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
}

function selectCat(cat, el) {
  selectedCat = cat;
  document.querySelectorAll('.cat-opt').forEach(o => o.classList.remove('selected'));
  if (el) el.classList.add('selected');
}

function saveGoal() {
  const title = document.getElementById('goal-title-input').value.trim();
  if (!title) { showToast('⚠️ Please enter a goal title', 'warn'); return; }
  const data = getUserData();
  const editId = document.getElementById('editing-goal-id').value;

  if (editId) {
    const g = data.goals.find(x => x.id === editId);
    if (g) { g.title = title; g.cat = selectedCat; }
    showToast('✏️ Goal updated!', 'success');
  } else {
    data.goals.push({
      id: Date.now().toString(),
      title, cat: selectedCat,
      createdAt: today()
    });
    showToast('🎯 Goal added!', 'success');
  }
  saveState(); closeModal();
  renderDashboard(); renderGoalsPage(); renderAnalytics();
}

function deleteGoal(id) {
  const data = getUserData();
  data.goals = data.goals.filter(g => g.id !== id);
  // Clean up progress for this goal
  Object.keys(data.progress).forEach(d => { delete data.progress[d][id]; });
  saveState();
  showToast('🗑️ Goal removed', 'info');
  renderDashboard(); renderGoalsPage(); renderAnalytics();
}

function toggleComplete(goalId) {
  const data = getUserData();
  const d = today();
  if (!data.progress[d]) data.progress[d] = {};
  const wasComplete = data.progress[d][goalId];
  data.progress[d][goalId] = !wasComplete;

  if (!wasComplete) {
    // Add XP
    const oldLevel = data.level;
    data.xp = (data.xp || 0) + 10;
    data.level = Math.floor(data.xp / 100) + 1;
    if (data.level > oldLevel) {
      triggerLevelUp(data.level);
    }
    // Check if all done
    const allDone = data.goals.every(g => data.progress[d][g.id]);
    if (allDone && data.goals.length > 0) {
      triggerAllComplete();
    }
  } else {
    data.xp = Math.max(0, (data.xp || 0) - 10);
    data.level = Math.floor(data.xp / 100) + 1;
  }

  saveState();
  updateXPBar(); updateNavBadges();
  renderDashboard(); renderGoalsPage(); renderAnalytics();
}

function markAllComplete() {
  const data = getUserData();
  const d = today();
  if (!data.progress[d]) data.progress[d] = {};
  let addedAny = false;
  data.goals.forEach(g => {
    if (!data.progress[d][g.id]) {
      data.progress[d][g.id] = true;
      const oldLevel = data.level;
      data.xp = (data.xp || 0) + 10;
      data.level = Math.floor(data.xp / 100) + 1;
      if (data.level > oldLevel) triggerLevelUp(data.level);
      addedAny = true;
    }
  });
  if (addedAny) {
    triggerAllComplete();
    saveState(); updateXPBar(); updateNavBadges();
    renderDashboard(); renderGoalsPage(); renderAnalytics();
    showToast('🎉 All goals completed!', 'success');
  } else {
    showToast('✅ Already all done!', 'info');
  }
}

function setFilter(filter, btn) {
  activeFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderGoalsPage();
}

// ═══════════════════════════════════════════
// STREAK CALCULATION
// ═══════════════════════════════════════════
function getStreakForGoal(goalId) {
  const data = getUserData();
  const dates = Object.keys(data.progress).sort().reverse();
  let streak = 0;
  let d = new Date(); d.setHours(0, 0, 0, 0);
  for (let i = 0; i < 365; i++) {
    const key = dateStr(d);
    if (data.progress[key] && data.progress[key][goalId]) {
      streak++;
    } else if (i > 0) break; // today is ok to miss
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function getLongestStreak(goalId) {
  const data = getUserData();
  const dates = Object.keys(data.progress).filter(d => data.progress[d][goalId]).sort();
  if (!dates.length) return 0;
  let longest = 1, cur = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    const diff = (curr - prev) / 86400000;
    if (diff === 1) { cur++; longest = Math.max(longest, cur); }
    else cur = 1;
  }
  return longest;
}

function getOverallStreak() {
  const data = getUserData();
  let streak = 0;
  let d = new Date(); d.setHours(0, 0, 0, 0);
  for (let i = 0; i < 365; i++) {
    const key = dateStr(d);
    const prog = data.progress[key] || {};
    const hasAny = Object.values(prog).some(Boolean);
    if (hasAny) streak++;
    else if (i > 0) break;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function getBestOverallStreak() {
  const data = getUserData();
  const days = Object.keys(data.progress).filter(d => {
    return Object.values(data.progress[d]).some(Boolean);
  }).sort();
  if (!days.length) return 0;
  let longest = 1, cur = 1;
  for (let i = 1; i < days.length; i++) {
    const diff = (new Date(days[i]) - new Date(days[i - 1])) / 86400000;
    if (diff === 1) { cur++; longest = Math.max(longest, cur); }
    else cur = 1;
  }
  return longest;
}

// ═══════════════════════════════════════════
// RENDERING
// ═══════════════════════════════════════════
function renderDashboard() {
  const data = getUserData();
  const d = today();
  const todayProg = data.progress[d] || {};
  const doneToday = data.goals.filter(g => todayProg[g.id]).length;
  const totalGoals = data.goals.length;

  document.getElementById('stat-total').textContent = totalGoals;
  document.getElementById('stat-today').textContent = doneToday;
  document.getElementById('stat-today-sub').textContent = `of ${totalGoals} goals`;
  document.getElementById('stat-streak').textContent = getBestOverallStreak();

  // Weekly rate
  let totalSlots = 0, doneSlots = 0;
  for (let i = 0; i < 7; i++) {
    const dd = new Date(); dd.setDate(dd.getDate() - i);
    const key = dateStr(dd);
    const prog = data.progress[key] || {};
    totalSlots += totalGoals;
    doneSlots += data.goals.filter(g => prog[g.id]).length;
  }
  const rate = totalSlots > 0 ? Math.round(doneSlots / totalSlots * 100) : 0;
  document.getElementById('stat-weekly').textContent = rate + '%';

  // Highlight Dashboard Stat Cards
  const totalCard = document.getElementById('stat-total').closest('.stat-card');
  const todayCard = document.getElementById('stat-today').closest('.stat-card');
  const streakCard = document.getElementById('stat-streak').closest('.stat-card');
  const weeklyCard = document.getElementById('stat-weekly').closest('.stat-card');

  if (totalCard) totalCard.classList.toggle('highlighted', totalGoals > 0);
  if (todayCard) todayCard.classList.toggle('highlighted', doneToday === totalGoals && totalGoals > 0);
  if (streakCard) streakCard.classList.toggle('highlighted', getBestOverallStreak() > 0);
  if (weeklyCard) weeklyCard.classList.toggle('highlighted', rate > 50);

  // Today's goals list
  const list = document.getElementById('today-goals-list');
  if (!data.goals.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">🎯</div><h3>No goals yet</h3><p>Add your first learning goal to get started!</p></div>`;
    return;
  }
  const catColors = { coding: 'var(--cat-coding)', reading: 'var(--cat-reading)', fitness: 'var(--cat-fitness)', design: 'var(--cat-design)', other: 'var(--cat-other)' };
  const catEmoji = { coding: '💻', reading: '📚', fitness: '🏃', design: '🎨', other: '⭐' };
  list.innerHTML = data.goals.map(g => {
    const done = !!todayProg[g.id];
    const streak = getStreakForGoal(g.id);
    const emoji = catEmoji[g.cat] || '⭐';
    return `<div class="today-goal-item ${done ? 'completed' : ''}" onclick="toggleComplete('${g.id}')">
      <div class="tgi-check">${done ? '✓' : ''}</div>
      <div class="tgi-emoji" style="font-size: 20px;">${emoji}</div>
      <div class="tgi-info">
        <div class="tgi-name">${escHtml(g.title)}</div>
        <div class="tgi-cat">${g.cat}</div>
      </div>
      ${streak > 1 ? `<div class="tgi-streak">🔥 ${streak}</div>` : ''}
    </div>`;
  }).join('');

  renderBarChart();
  renderHeatmap();
}

function renderGoalsPage() {
  const data = getUserData();
  const d = today();
  const todayProg = data.progress[d] || {};
  const filtered = activeFilter === 'all' ? data.goals : data.goals.filter(g => g.cat === activeFilter);
  const grid = document.getElementById('goals-grid');

  if (!filtered.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">${activeFilter === 'all' ? '🎯' : '🔍'}</div><h3>${activeFilter === 'all' ? 'No goals yet' : 'Nothing here'}</h3><p>${activeFilter === 'all' ? 'Add your first goal to start tracking!' : 'No goals in this category yet.'}</p></div>`;
    return;
  }

  const catColors = { coding: 'var(--cat-coding)', reading: 'var(--cat-reading)', fitness: 'var(--cat-fitness)', design: 'var(--cat-design)', other: 'var(--cat-other)' };
  const catEmoji = { coding: '💻', reading: '📚', fitness: '🏃', design: '🎨', other: '⭐' };

  grid.innerHTML = filtered.map(g => {
    const done = !!todayProg[g.id];
    const streak = getStreakForGoal(g.id);
    const longest = getLongestStreak(g.id);
    const totalDone = Object.values(data.progress).filter(p => p[g.id]).length;
    const noteKey = g.id + '-' + d;
    const note = data.notes[noteKey] || '';

    // Last 7 day dots
    const dots = Array.from({ length: 7 }, (_, i) => {
      const dd = new Date(); dd.setDate(dd.getDate() - 6 + i);
      const key = dateStr(dd);
      const isDone = data.progress[key] && data.progress[key][g.id];
      return `<div class="streak-mini-dot ${isDone ? 'done' : ''}"></div>`;
    }).join('');

    return `<div class="goal-card ${done ? 'completed-today' : ''}" data-cat="${g.cat}" style="animation-delay:${filtered.indexOf(g) * 0.05}s">
      <div class="goal-card-header">
        <div class="goal-card-info">
          <div class="goal-card-title">${escHtml(g.title)}</div>
          <div class="goal-card-cat cat-${g.cat}">${catEmoji[g.cat] || '⭐'} ${g.cat}</div>
        </div>
        <div class="goal-card-actions">
          <button class="card-action-btn" onclick="event.stopPropagation();openAddModal('${g.id}')" title="Edit">✏️</button>
          <button class="card-action-btn delete" onclick="event.stopPropagation();deleteGoal('${g.id}')" title="Delete">🗑️</button>
        </div>
      </div>

      <button class="goal-complete-btn" onclick="toggleComplete('${g.id}')">
        ${done ? '✅ Completed Today!' : '◯ Mark as Complete'}
      </button>

      <div class="goal-stats">
        <div class="goal-stat"><strong>🔥 ${streak}</strong>streak</div>
        <div class="goal-stat"><strong>🏆 ${longest}</strong>longest</div>
        <div class="goal-stat"><strong>📊 ${totalDone}</strong>total done</div>
      </div>

      <div class="streak-mini" title="Last 7 days">${dots}</div>

      <div class="goal-notes">
        <textarea placeholder="📝 What did you learn today? (auto-saved)" oninput="saveNote('${g.id}',this.value)">${escHtml(note)}</textarea>
      </div>
    </div>`;
  }).join('');
}

function saveNote(goalId, text) {
  const data = getUserData();
  const key = goalId + '-' + today();
  data.notes[key] = text;
  saveState();
}

function renderAnalytics() {
  const data = getUserData();
  const activeDays = Object.keys(data.progress || {}).filter(d =>
    data.progress[d] && Object.values(data.progress[d]).some(Boolean)
  ).length;

  // Update Stat Cards
  const totalCompleted = Object.values(data.progress || {}).reduce((sum, day) => {
    return sum + Object.values(day).filter(Boolean).length;
  }, 0);

  const totalPossible = activeDays * (data.goals.length || 1);
  const rate = totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;

  if (document.getElementById('an-xp')) document.getElementById('an-xp').textContent = data.xp || 0;
  if (document.getElementById('an-days')) document.getElementById('an-days').textContent = activeDays;
  if (document.getElementById('an-total')) document.getElementById('an-total').textContent = totalCompleted;
  if (document.getElementById('an-rate')) {
    const rateEl = document.getElementById('an-rate');
    rateEl.textContent = rate + '%';
    const card = rateEl.closest('.stat-card');
    if (card) card.classList.toggle('highlighted', rate === 100 && totalCompleted > 0);
  }

  // Also highlight XP and Total if they have values
  if (document.getElementById('an-xp')) {
    const card = document.getElementById('an-xp').closest('.stat-card');
    if (card) card.classList.toggle('highlighted', (data.xp || 0) > 0);
  }
  if (document.getElementById('an-total')) {
    const card = document.getElementById('an-total').closest('.stat-card');
    if (card) card.classList.toggle('highlighted', totalCompleted > 0);
  }
  if (document.getElementById('an-days')) {
    const card = document.getElementById('an-days').closest('.stat-card');
    if (card) card.classList.toggle('highlighted', activeDays > 0);
  }

  // Goals breakdown
  const container = document.getElementById('analytics-goals');
  if (container) {
    if (!data.goals.length) {
      container.innerHTML = '<p style="color:var(--text-muted);font-size:14px;">No goals yet.</p>';
    } else {
      container.innerHTML = data.goals.map(g => {
        const done = Object.values(data.progress).filter(p => p[g.id]).length;
        const pct = activeDays > 0 ? Math.min(100, Math.round(done / Math.max(1, activeDays) * 100)) : 0;
        const streak = getStreakForGoal(g.id);
        return `<div style="background:var(--glass);border:1px solid var(--glass-border);border-radius:12px;padding:16px;backdrop-filter:blur(12px);">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
            <div>
              <div style="font-weight:600;font-size:15px;">${escHtml(g.title)}</div>
              <div style="font-size:12px;color:var(--text-muted);text-transform:capitalize;">${g.cat} · 🔥 ${streak} streak · ✅ ${done} done</div>
            </div>
            <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:var(--accent)">${pct}%</div>
          </div>
          <div style="height:6px;background:var(--surface2);border-radius:100px;overflow:hidden;">
            <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,var(--accent),var(--accent2));border-radius:100px;transition:width 0.6s cubic-bezier(0.16,1,0.3,1)"></div>
          </div>
        </div>`;
      }).join('');
    }
  }

  // Weekly Breakdown Cards
  const wbContainer = document.getElementById('weekly-breakdown-cards');
  if (wbContainer) {
    let wbHtml = '';
    const totalGoals = data.goals.length || 1;
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    for (let w = 0; w < 4; w++) {
      let doneInWeek = 0;
      let totalPossible = totalGoals * 7;

      for (let d = 0; d < 7; d++) {
        const day = new Date(now);
        day.setDate(day.getDate() - (w * 7 + d));
        const key = dateStr(day);
        const prog = data.progress[key] || {};
        doneInWeek += data.goals.filter(g => prog[g.id]).length;
      }

      const pct = Math.round((doneInWeek / totalPossible) * 100);
      wbHtml += `
            <div class="wb-card">
              <div class="wb-info">
                <div class="wb-label">Week ${w + 1}</div>
                <div style="font-size:11px;color:var(--text-muted)">${w === 0 ? 'Current' : w + ' weeks ago'}</div>
              </div>
              <div class="wb-track">
                <div class="wb-fill" style="width:${pct}%"></div>
              </div>
              <div class="wb-pct">${pct}%</div>
            </div>`;
    }
    wbContainer.innerHTML = wbHtml;
  }

  // 30-day activity chart
  render30DayChart();
}

function renderBarChart() {
  const data = getUserData();
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const chart = document.getElementById('bar-chart');
  if (!chart) return;

  const totalGoals = data.goals.length;
  const maxGoals = Math.max(1, totalGoals);
  const points = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = dateStr(d);
    const prog = data.progress[key] || {};
    const count = data.goals.filter(g => prog[g.id]).length;
    points.push({
      val: count,
      pct: (count / maxGoals) * 100,
      label: days[d.getDay()],
      isToday: i === 0,
      date: key
    });
  }

  const width = 100;
  const height = 100;
  const step = width / (points.length - 1);
  let linePath = `M 0 ${height - points[0].pct}`;
  let areaPath = `M 0 ${height} L 0 ${height - points[0].pct}`;

  for (let i = 1; i < points.length; i++) {
    const x = i * step;
    const y = height - points[i].pct;
    linePath += ` L ${x} ${y}`;
    areaPath += ` L ${x} ${y}`;
  }
  areaPath += ` L ${width} ${height} Z`;

  chart.innerHTML = `
        <svg viewBox="0 0 ${width} ${height}" class="progress-graph-svg" preserveAspectRatio="none">
          <defs>
            <linearGradient id="graph-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.4"/>
              <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
            </linearGradient>
          </defs>
          <path d="${areaPath}" class="graph-area" />
          <path d="${linePath}" class="graph-line" />
          ${points.map((p, i) => `<circle cx="${i * step}" cy="${height - p.pct}" r="4" class="graph-point" title="${p.date}: ${p.val}/${totalGoals}"><title>${p.date}: ${p.val}/${totalGoals} completed</title></circle>`).join('')}
        </svg>
        <div class="graph-labels">
          ${points.map(p => `<div class="graph-label ${p.isToday ? 'today' : ''}">${p.label}</div>`).join('')}
        </div>`;
}

function render30DayChart() {
  const data = getUserData();
  const chart = document.getElementById('bar-chart-30');
  if (!chart) return;

  const totalGoals = data.goals.length || 1;
  const points = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Calculate start of month from 30 days ago
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const startOfRange = new Date(thirtyDaysAgo.getFullYear(), thirtyDaysAgo.getMonth(), 1);

  const diffTime = Math.abs(now - startOfRange);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const range = diffDays + 1;

  for (let i = range - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = dateStr(d);
    const prog = data.progress[key] || {};
    const count = data.goals.filter(g => prog[g.id]).length;
    points.push({
      val: count,
      pct: (count / totalGoals) * 100,
      date: key,
      day: d.getDate()
    });
  }

  const width = 1000;
  const height = 270;
  const paddingLeft = 70;
  const paddingRight = 30;
  const paddingBottom = 60;
  const paddingTop = 30;
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;
  const step = chartWidth / (points.length - 1);

  // Smoothing function (simple cubic bezier)
  function getPath(pts) {
    let d = `M ${paddingLeft} ${height - paddingBottom - (pts[0].pct / 100 * chartHeight)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const x1 = paddingLeft + i * step;
      const y1 = height - paddingBottom - (pts[i].pct / 100 * chartHeight);
      const x2 = paddingLeft + (i + 1) * step;
      const y2 = height - paddingBottom - (pts[i + 1].pct / 100 * chartHeight);
      const cx = (x1 + x2) / 2;
      d += ` C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`;
    }
    return d;
  }

  const linePath = getPath(points);
  const areaPath = linePath + ` L ${width - paddingRight} ${height - paddingBottom} L ${paddingLeft} ${height - paddingBottom} Z`;

  // Gridlines and Y-axis labels
  const maxVal = Math.max(1, totalGoals);
  const steps = maxVal < 4 ? maxVal : 4;
  const gridLinesArr = [];
  for (let i = 0; i <= steps; i++) {
    const val = Math.round((i / steps) * maxVal);
    const pct = (val / maxVal) * 100;
    const y = height - paddingBottom - (pct / 100 * chartHeight);
    gridLinesArr.push(`
          <line x1="${paddingLeft}" y1="${y}" x2="${width - paddingRight}" y2="${y}" stroke="rgba(255,255,255,0.08)" stroke-dasharray="4,4" />
          <text x="${paddingLeft - 10}" y="${y + 4}" text-anchor="end" fill="var(--text-muted)" font-size="11">${val}</text>
        `);
  }
  const gridLines = gridLinesArr.join('');

  // X and Y axis lines
  const axisLines = `
        <line x1="${paddingLeft}" y1="${paddingTop}" x2="${paddingLeft}" y2="${height - paddingBottom}" stroke="var(--text-muted)" stroke-width="1.5" />
        <line x1="${paddingLeft}" y1="${height - paddingBottom}" x2="${width - paddingRight}" y2="${height - paddingBottom}" stroke="var(--text-muted)" stroke-width="1.5" />
      `;

  // Axis Titles
  const yAxisTitle = `<text x="${paddingLeft - 40}" y="${height / 2}" transform="rotate(-90 ${paddingLeft - 40} ${height / 2})" text-anchor="middle" fill="var(--text-muted)" font-size="12" font-weight="600">Goals Completed</text>`;
  const xAxisTitle = `<text x="${paddingLeft + chartWidth / 2}" y="${height - 10}" text-anchor="middle" fill="var(--text-muted)" font-size="12" font-weight="600">Days</text>`;

  // All day labels
  const allLabels = points.map((p, i) => {
    const x = paddingLeft + i * step;
    const dateObj = new Date(p.date);
    const dayLabel = dateObj.getDate();
    const isToday = i === points.length - 1;

    return `<text x="${x}" y="${height - paddingBottom + 20}" text-anchor="middle" fill="${isToday ? 'var(--accent)' : 'var(--text-muted)'}" font-size="11" font-weight="${isToday ? '800' : '600'}">${dayLabel}</text>`;
  }).join('');

  chart.innerHTML = `
        <svg viewBox="0 0 ${width} ${height}" style="width:100%; height:auto; overflow:visible;">
          <defs>
            <linearGradient id="blue-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#4dabff" stop-opacity="0.3"/>
              <stop offset="100%" stop-color="#4dabff" stop-opacity="0"/>
            </linearGradient>
          </defs>
          ${gridLines}
          ${axisLines}
          ${yAxisTitle}
          ${xAxisTitle}
          <path d="${areaPath}" fill="url(#blue-grad)" />
          <path d="${linePath}" fill="none" stroke="#4dabff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
          
          ${points.map((p, i) => {
    const x = paddingLeft + i * step;
    const y = height - paddingBottom - (p.pct / 100 * chartHeight);
    return `<circle cx="${x}" cy="${y}" r="3.5" fill="#4dabff" stroke="var(--bg)" stroke-width="1.5" style="cursor:pointer;">
              <title>${p.date}: ${p.val} goals done</title>
            </circle>`;
  }).join('')}

          ${allLabels}
        </svg>`;
}

function renderHeatmap() {
  const data = getUserData();
  const grid = document.getElementById('heatmap-grid');
  const title = document.getElementById('heatmap-title');
  if (!grid) return;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthName = now.toLocaleString('default', { month: 'long' });

  if (title) {
    title.innerHTML = `${monthName} Tracker <span style="opacity:0.4; font-weight:400; font-size:0.8em; margin-left:8px;">${year}</span>`;
  }

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startOffset = firstDay.getDay();

  const totalGoals = data.goals.length;
  const maxGoals = Math.max(1, totalGoals);

  const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  let html = '<div class="heatmap-header-row">';
  dayNames.forEach(d => html += `<div class="heatmap-day-label">${d}</div>`);
  html += '</div>';

  html += '<div class="monthly-grid">';

  for (let i = 0; i < startOffset; i++) {
    html += '<div class="heatmap-cell" data-level="-1" style="opacity:0"></div>';
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    const key = dateStr(d);
    const prog = data.progress[key] || {};
    const completedCount = data.goals.filter(g => prog[g.id]).length;

    let level = 0;
    if (completedCount > 0) {
      const ratio = completedCount / maxGoals;
      if (ratio <= 0.25) level = 1;
      else if (ratio <= 0.5) level = 2;
      else if (ratio <= 0.75) level = 3;
      else level = 4;
    }

    const isToday = day === now.getDate();
    html += `
          <div class="heatmap-cell" 
               data-level="${level}" 
               style="${isToday ? 'box-shadow: 0 0 0 2px var(--accent2);' : ''}"
               title="${monthName} ${day}: ${completedCount}/${totalGoals} completed">
          </div>`;
  }

  html += '</div>';
  grid.innerHTML = html;
}

// ═══════════════════════════════════════════
// XP & LEVEL
// ═══════════════════════════════════════════
function updateXPBar() {
  const data = getUserData();
  const xp = data.xp || 0;
  const level = data.level || 1;
  const xpInLevel = xp % 100;
  const pct = xpInLevel;

  document.getElementById('xp-fill').style.width = pct + '%';
  document.getElementById('xp-fraction').textContent = `${xpInLevel} / 100 XP`;
  document.getElementById('xp-level-num').textContent = level;
}

function updateNavBadges() {
  const data = getUserData();
  const level = data.level || 1;
  const streak = getOverallStreak();
  document.getElementById('nav-streak').textContent = '🔥 ' + streak;
  document.getElementById('nav-level').textContent = '🧠 Lvl ' + level;
  document.getElementById('nav-streak-mobile').textContent = '🔥 ' + streak;
  document.getElementById('nav-level-mobile').textContent = '🧠 Lvl ' + level;
}

// ═══════════════════════════════════════════
// GAMIFICATION
// ═══════════════════════════════════════════
function triggerLevelUp(level) {
  showToast(`🏆 LEVEL UP! You're now Level ${level}!`, 'success');
  if (typeof confetti !== 'undefined') {
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ['#7c6aff', '#ff6a8a', '#6af5c8', '#ffd96a'] });
  }
}

function triggerAllComplete() {
  showToast('🎉 All goals done today! Amazing!', 'success');
  if (typeof confetti !== 'undefined') {
    setTimeout(() => confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } }), 300);
  }
}

// ═══════════════════════════════════════════
// MOTIVATION ENGINE & QUOTES
// ═══════════════════════════════════════════
const QUOTES = {
  default: [
    { t: "Consistency beats intensity. Every single day.", a: "Bruce Lee" },
    { t: "The expert in anything was once a beginner.", a: "Helen Hayes" },
    { t: "Small steps in the right direction can turn into the biggest steps of your life.", a: "" },
    { t: "Don't stop until you're proud.", a: "" },
    { t: "Success is the sum of small efforts, repeated day-in and day-out.", a: "Robert Collier" }
  ],
  low_streak: [
    { t: "The hardest part is starting. You did that. Now keep going.", a: "" },
    { t: "Don't break the chain. Just one more day.", a: "Jerry Seinfeld" },
    { t: "A one-day streak is still a streak. Build on it.", a: "" }
  ],
  high_streak: [
    { t: "You're on fire! Don't let the flame go out.", a: "" },
    { t: "Momentum is your superpower right now.", a: "" },
    { t: "A legend in the making. Keep that streak alive!", a: "" }
  ],
  lazy: [
    { t: "Five minutes of learning is better than zero minutes.", a: "" },
    { t: "Your future self is watching. What will you show them?", a: "" },
    { t: "Discipline is doing what needs to be done, even if you don't want to.", a: "" }
  ]
};

function updateMotivation() {
  const data = getUserData();
  const d = today();
  const todayProg = data.progress[d] || {};
  const doneToday = data.goals.filter(g => todayProg[g.id]).length;
  const streak = getOverallStreak();

  let msg;
  if (streak >= 7) msg = '🔥 On fire — ' + streak + ' day streak!';
  else if (doneToday === data.goals.length && data.goals.length > 0) msg = '🎉 All done today — incredible!';
  else if (doneToday === 0) msg = '⚡ Start today to build your streak';
  else msg = "Keep going! You've got this.";

  document.getElementById('motivation-pill').textContent = msg;

  // Update Daily Quote Card
  renderDailyQuote(streak, doneToday === 0);
}

function renderDailyQuote(streak, isLazy) {
  let pool = QUOTES.default;
  if (isLazy) pool = QUOTES.lazy;
  else if (streak >= 5) pool = QUOTES.high_streak;
  else if (streak > 0) pool = QUOTES.low_streak;

  // Use the day of the year to pick a quote so it only changes daily
  const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  const quote = pool[dayOfYear % pool.length];

  document.getElementById('daily-quote-text').textContent = `"${quote.t}"`;
  const authorEl = document.getElementById('daily-quote-author');
  if (quote.a) {
    authorEl.textContent = `— ${quote.a}`;
    authorEl.style.display = 'block';
  } else {
    authorEl.style.display = 'none';
  }
}

// ═══════════════════════════════════════════
// FOCUS TIMER
// ═══════════════════════════════════════════
let timerInterval = null;
let timeLeft = 25 * 60;
let isTimerRunning = false;

function setTimer(minutes) {
  clearInterval(timerInterval);
  isTimerRunning = false;
  timeLeft = minutes * 60;
  updateTimerDisplay();

  const startBtn = document.getElementById('nav-timer-start');
  if (startBtn) startBtn.textContent = 'Start';

  // Update active state in dropdown
  document.querySelectorAll('.timer-btn-small').forEach(btn => {
    btn.classList.toggle('active', btn.textContent.includes(minutes));
  });
}

function toggleTimer() {
  const startBtn = document.getElementById('nav-timer-start');
  if (isTimerRunning) {
    clearInterval(timerInterval);
    if (startBtn) startBtn.textContent = 'Resume';
  } else {
    timerInterval = setInterval(() => {
      timeLeft--;
      updateTimerDisplay();
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        onTimerComplete();
      }
    }, 1000);
    if (startBtn) startBtn.textContent = 'Pause';
  }
  isTimerRunning = !isTimerRunning;
  updateTimerDisplay(); // Ensure visual state updates immediately
}

function resetTimer() {
  clearInterval(timerInterval);
  isTimerRunning = false;
  const activeBtn = document.querySelector('.timer-btn-small.active');
  const mins = activeBtn ? parseInt(activeBtn.textContent) : 25;
  timeLeft = mins * 60;
  updateTimerDisplay();
  const startBtn = document.getElementById('nav-timer-start');
  if (startBtn) startBtn.textContent = 'Start';
}

function toggleNavTimerDropdown(e) {
  e.stopPropagation();
  document.getElementById('nav-timer-dropdown').classList.toggle('active');
}

// Close dropdown on click outside
window.addEventListener('click', () => {
  const dropdown = document.getElementById('nav-timer-dropdown');
  if (dropdown) dropdown.classList.remove('active');
});

function updateTimerDisplay() {
  const m = Math.floor(timeLeft / 60);
  const s = timeLeft % 60;
  const timeStr = `${m}:${s.toString().padStart(2, '0')}`;

  const mainDisplay = document.getElementById('timer-display');
  if (mainDisplay) mainDisplay.textContent = timeStr;

  const navText = document.getElementById('nav-timer-text');
  if (navText) navText.textContent = timeStr;

  const navTimer = document.getElementById('nav-timer-display');
  if (navTimer) {
    if (isTimerRunning) navTimer.classList.add('running');
    else navTimer.classList.remove('running');
  }
}

function onTimerComplete() {
  isTimerRunning = false;
  document.getElementById('timer-start-btn').textContent = 'Start Focus';
  showToast('🔔 Focus Session Complete!', 'success');
  if (typeof confetti !== 'undefined') confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });

  // Prompt to mark task done
  setTimeout(() => {
    if (confirm("Great job focusing! Would you like to go to your goals and mark a task as complete?")) {
      switchTab('goals');
    }
  }, 500);
}

// ═══════════════════════════════════════════
// DAILY REMINDER
// ═══════════════════════════════════════════
function checkDailyReminder() {
  const data = getUserData();
  if (!data.goals.length) return;
  const d = today();
  const lastReminder = data._lastReminder;
  if (lastReminder === d) return;
  const hour = new Date().getHours();
  if (hour < 18) return; // only after 6 PM
  const todayProg = data.progress[d] || {};
  const doneToday = data.goals.filter(g => todayProg[g.id]).length;
  if (doneToday === data.goals.length) return;
  // Show reminder
  showReminder(data.goals.length - doneToday);
}

function showReminder(remaining) {
  const overlay = document.createElement('div');
  overlay.className = 'reminder-overlay';
  overlay.innerHTML = `<div class="reminder-card">
    <div style="font-size:48px;margin-bottom:12px;">⏰</div>
    <h3>Daily Check-In</h3>
    <p>You have <strong>${remaining}</strong> goal${remaining > 1 ? 's' : ''} left for today. Keep your streak alive!</p>
    <div class="reminder-actions">
      <button class="btn-secondary" style="flex:1" onclick="this.closest('.reminder-overlay').remove()">Later</button>
      <button class="btn-primary" style="flex:1" onclick="switchTab('goals');this.closest('.reminder-overlay').remove()">Go Complete!</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
  const data = getUserData();
  data._lastReminder = today();
  saveState();
}

// ═══════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════
function showToast(msg, type = 'info') {
  const icons = { success: '✅', warn: '⚠️', info: 'ℹ️', error: '❌' };
  const colors = { success: 'rgba(106,245,200,0.15)', warn: 'rgba(255,217,106,0.15)', info: 'rgba(124,106,255,0.15)', error: 'rgba(255,106,138,0.15)' };
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.style.background = colors[type];
  toast.innerHTML = `<span>${icons[type] || '•'}</span><span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('out');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ═══════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════
function escHtml(str) {
  const d = document.createElement('div');
  d.textContent = str; return d.innerHTML;
}

// Keyboard shortcut
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
  if ((e.ctrlKey || e.metaKey) && e.key === 'n') { e.preventDefault(); openAddModal(); }
});

// Modal backdrop click
document.getElementById('modal-overlay').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
});

// Enter in auth
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    if (document.getElementById('auth-screen').style.display !== 'none') {
      if (currentAuthTab === 'login') handleLogin();
      else handleSignup();
    }
  }
});

// ═══════════════════════════════════════════
// BOOT
// ═══════════════════════════════════════════
loadState();
window.onload = () => {
  initGoogleAuth();
  if (state.currentUser && state.users && state.users[state.currentUser]) {
    enterApp();
  } else {
    // already showing auth screen
    if (state.dark === false) document.documentElement.setAttribute('data-theme', 'light');
  }
};
