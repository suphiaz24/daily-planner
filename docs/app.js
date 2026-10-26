const PASSWORD_KEY = 'planner.password';
const VIEW_KEY = 'planner.view';
const HOUR_PX = 48;

const $ = (id) => document.getElementById(id);

function getStored(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function setStored(key, value) {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch { /* storage blocked: falls back to defaults next visit */ }
}

const getPassword = () => getStored(PASSWORD_KEY);
const setPassword = (value) => setStored(PASSWORD_KEY, value);

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

// ---- dates (yyyy-MM-dd strings, local time) ----

function dateString(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function addDays(str, n) {
  const d = parseDate(str);
  d.setDate(d.getDate() + n);
  return dateString(d);
}

const todayString = () => dateString(new Date());
const formatDay = (str, opts) => parseDate(str).toLocaleDateString(undefined, opts);

// Day and 3-day views start at the picked date; the week view starts on its Monday.
function visibleDates(date, days) {
  const start = days === 7 ? addDays(date, -((parseDate(date).getDay() + 6) % 7)) : date;
  return Array.from({ length: days }, (_, i) => addDays(start, i));
}

function rangeTitle(dates) {
  if (dates.length === 1) {
    return dates[0] === todayString() ? 'Today' : formatDay(dates[0], { weekday: 'long', month: 'short', day: 'numeric' });
  }
  const short = { month: 'short', day: 'numeric' };
  return `${formatDay(dates[0], short)} – ${formatDay(dates[dates.length - 1], short)}`;
}

function minutesOf(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function formatMinutes(total) {
  return `${Math.floor(total / 60)}h ${total % 60}m`;
}

// ---- rendering ----

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function renderList(list, items, format) {
  list.replaceChildren(...items.map((item) => el('li', null, format(item))));
  if (!items.length) list.append(el('li', 'empty', 'Nothing'));
}

function renderGrid(days) {
  const { GRID_START_HOUR = 8, GRID_END_HOUR = 23 } = window.PLANNER_CONFIG;
  const gridTop = GRID_START_HOUR * 60;
  const gridBottom = GRID_END_HOUR * 60;
  const today = todayString();

  const grid = $('grid');
  grid.style.setProperty('--cols', days.length);
  grid.style.setProperty('--hour', `${HOUR_PX}px`);
  grid.style.setProperty('--height', `${(GRID_END_HOUR - GRID_START_HOUR) * HOUR_PX}px`);

  const heads = days.map((day) => {
    const head = el('div', 'grid-head' + (day.date === today ? ' today' : ''));
    head.append(el('span', null, formatDay(day.date, { weekday: 'short' })), el('strong', null, parseDate(day.date).getDate()));
    return head;
  });

  const times = el('div', 'grid-times');
  for (let h = GRID_START_HOUR; h < GRID_END_HOUR; h++) {
    const label = el('span', null, `${h}:00`);
    label.style.top = `${(h - GRID_START_HOUR) * HOUR_PX}px`;
    times.append(label);
  }

  const slot = (kind, start, end, lines) => {
    const top = Math.max(minutesOf(start), gridTop);
    let bottom = minutesOf(end);
    if (bottom <= minutesOf(start)) bottom = 24 * 60; // ends after midnight
    bottom = Math.min(bottom, gridBottom);
    if (bottom <= top) return null;

    const height = ((bottom - top) / 60) * HOUR_PX;
    const node = el('div', `slot ${kind}` + (height < 28 ? ' short' : ''));
    node.style.top = `${((top - gridTop) / 60) * HOUR_PX}px`;
    node.style.height = `${height}px`;
    node.title = lines.join('\n');
    node.append(...lines.map((line) => el('span', null, line)));
    return node;
  };

  const cols = days.map((day) => {
    const col = el('div', 'grid-col');
    const slots = [
      ...day.busy.map((b) => slot('busy', b.start, b.end, [b.title, `${b.start}–${b.end}`])),
      ...day.blocks.map((b) => slot('free', b.start, b.end, [`${b.start}–${b.end}`, `${b.minutes} min free`])),
    ];
    col.append(...slots.filter(Boolean));
    return col;
  });

  grid.replaceChildren(el('div'), ...heads, times, ...cols);
}

// ---- state and loading ----

const state = {
  date: todayString(),
  days: [1, 3, 7].includes(Number(getStored(VIEW_KEY))) ? Number(getStored(VIEW_KEY)) : 1,
};
let loadId = 0;

async function load() {
  const id = ++loadId;
  const dates = visibleDates(state.date, state.days);

  $('title').textContent = rangeTitle(dates);
  $('date').value = state.date;
  document.querySelectorAll('#views button').forEach((b) => {
    b.setAttribute('aria-pressed', String(Number(b.dataset.days) === state.days));
  });
  $('status').textContent = 'Loading…';

  try {
    const days = await Promise.all(dates.map((date) => callBackend('freeTime', { date })));
    if (id !== loadId) return; // a newer load started while this one was in flight

    const blocks = days.flatMap((d) => d.blocks);
    const total = blocks.reduce((sum, b) => sum + b.minutes, 0);
    $('status').textContent = days.length === 1
      ? `${blocks.length} free blocks, ${formatMinutes(total)} total (window ${days[0].windowStart}–${days[0].windowEnd})`
      : `${blocks.length} free blocks, ${formatMinutes(total)} total over ${days.length} days`;

    renderGrid(days);
    $('day-lists').hidden = days.length !== 1;
    if (days.length === 1) {
      renderList($('blocks'), days[0].blocks, (b) => `${b.start}–${b.end}  ·  ${b.minutes} min`);
      renderList($('busy'), days[0].busy, (b) => `${b.start}–${b.end}  ${b.title}`);
    }
  } catch (err) {
    if (id === loadId) $('status').textContent = `Error: ${err.message}`;
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
  load();
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

$('views').addEventListener('click', (e) => {
  const days = Number(e.target.dataset.days);
  if (!days) return;
  state.days = days;
  setStored(VIEW_KEY, String(days));
  load();
});

$('prev').addEventListener('click', () => { state.date = addDays(state.date, -state.days); load(); });
$('next').addEventListener('click', () => { state.date = addDays(state.date, state.days); load(); });
$('today').addEventListener('click', () => { state.date = todayString(); load(); });

$('date').addEventListener('change', () => {
  if (!$('date').value) return;
  state.date = $('date').value;
  load();
});

if (getPassword()) showApp();
else showLogin();
