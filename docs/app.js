const PASSWORD_KEY = 'planner.password';

const $ = (id) => document.getElementById(id);

function getPassword() {
  try { return localStorage.getItem(PASSWORD_KEY); } catch { return null; }
}

function setPassword(value) {
  try {
    if (value) localStorage.setItem(PASSWORD_KEY, value);
    else localStorage.removeItem(PASSWORD_KEY);
  } catch { /* storage blocked: user will be asked again next visit */ }
}

// Body is a plain string, so fetch sends it as text/plain and the browser
// skips the CORS preflight that Apps Script can't answer.
async function callBackend(action, params = {}) {
  const res = await fetch(window.PLANNER_CONFIG.BACKEND_URL, {
    method: 'POST',
    body: JSON.stringify({ password: getPassword(), action, params }),
  });
  const body = await res.json();
  if (!body.ok) {
    if (body.error === 'unauthorized') {
      setPassword(null);
      showLogin();
    }
    throw new Error(body.error);
  }
  return body.data;
}

function todayString() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function renderList(el, items, format) {
  el.replaceChildren(...items.map((item) => {
    const li = document.createElement('li');
    li.textContent = format(item);
    return li;
  }));
  if (!items.length) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = 'Nothing';
    el.append(li);
  }
}

async function loadDay(date) {
  $('status').textContent = 'Loading…';
  try {
    const data = await callBackend('freeTime', { date });
    const total = data.blocks.reduce((sum, b) => sum + b.minutes, 0);
    $('status').textContent = `${data.blocks.length} free blocks, ${Math.floor(total / 60)}h ${total % 60}m total ` +
      `(window ${data.windowStart}–${data.windowEnd})`;
    renderList($('blocks'), data.blocks, (b) => `${b.start}–${b.end}  ·  ${b.minutes} min`);
    renderList($('busy'), data.busy, (b) => `${b.start}–${b.end}  ${b.title}`);
  } catch (err) {
    $('status').textContent = `Error: ${err.message}`;
  }
}

function showLogin() {
  $('login').hidden = false;
  $('app').hidden = true;
  $('logout').hidden = true;
  $('password').focus();
}

function showApp() {
  $('login').hidden = true;
  $('app').hidden = false;
  $('logout').hidden = false;
  loadDay($('date').value);
}

$('login').addEventListener('submit', (e) => {
  e.preventDefault();
  setPassword($('password').value);
  $('password').value = '';
  showApp();
});

$('logout').addEventListener('click', () => {
  setPassword(null);
  showLogin();
});

$('pick-date').addEventListener('submit', (e) => {
  e.preventDefault();
  loadDay($('date').value);
});

$('date').value = todayString();
if (getPassword()) showApp();
else showLogin();
