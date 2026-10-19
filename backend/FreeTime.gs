/**
 * Free-time finder. No AI here: all date/time logic lives in code.
 *
 * findFreeBlocks('2026-10-19') → {
 *   date, windowStart, windowEnd,
 *   busy:   [{ title, start, end }],
 *   blocks: [{ id: 'b1', start: '09:15', end: '10:10', minutes: 55, startIso, endIso }]
 * }
 */

const MIN_MS = 60 * 1000;

function findFreeBlocks(dateStr) {
  const day = parseDate_(dateStr || formatDate_(new Date()));
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);

  let windowStart = atTime_(day, CONFIG.DAY_START);
  const windowEnd = atTime_(day, CONFIG.SLEEP_CUTOFF);

  // For today, don't offer time that has already passed.
  const now = new Date();
  if (formatDate_(now) === formatDate_(day) && now > windowStart) {
    windowStart = roundUp_(now, CONFIG.ROUND_NOW_TO_MIN);
  }

  const busy = getBusyEvents_(dayStart, dayEnd);
  const dinnerStart = atTime_(day, CONFIG.DINNER_START);
  busy.push({ title: 'Dinner', start: dinnerStart.getTime(), end: dinnerStart.getTime() + CONFIG.DINNER_MIN * MIN_MS, noBuffer: true });

  const free = computeFreeBlocks(busy, windowStart.getTime(), windowEnd.getTime(), {
    bufferMs: CONFIG.WALK_BUFFER_MIN * MIN_MS,
    minBlockMs: CONFIG.MIN_BLOCK_MIN * MIN_MS,
  });

  busy.sort(function (a, b) { return a.start - b.start; });

  return {
    date: formatDate_(day),
    windowStart: formatTime_(windowStart),
    windowEnd: formatTime_(windowEnd),
    busy: busy.map(function (b) {
      return { title: b.title, start: formatTime_(new Date(b.start)), end: formatTime_(new Date(b.end)) };
    }),
    blocks: free.map(function (f, i) {
      const start = new Date(f.start);
      const end = new Date(f.end);
      return {
        id: 'b' + (i + 1),
        start: formatTime_(start),
        end: formatTime_(end),
        minutes: Math.round((f.end - f.start) / MIN_MS),
        startIso: start.toISOString(),
        endIso: end.toISOString(),
      };
    }),
  };
}

/**
 * Pure interval math (no Calendar calls) so it can be tested in Tests.gs.
 * busy: [{ start: ms, end: ms, noBuffer?: bool }]. Returns [{ start: ms, end: ms }].
 */
function computeFreeBlocks(busy, windowStart, windowEnd, opts) {
  const intervals = busy
    .map(function (b) { return { start: b.start, end: b.end + (b.noBuffer ? 0 : opts.bufferMs) }; })
    .filter(function (b) { return b.end > windowStart && b.start < windowEnd; })
    .sort(function (a, b) { return a.start - b.start; });

  const free = [];
  let cursor = windowStart;
  intervals.forEach(function (b) {
    if (b.start > cursor) free.push({ start: cursor, end: b.start });
    if (b.end > cursor) cursor = b.end;
  });
  if (cursor < windowEnd) free.push({ start: cursor, end: windowEnd });

  return free
    .map(function (f) { return { start: f.start, end: Math.min(f.end, windowEnd) }; })
    .filter(function (f) { return f.end - f.start >= opts.minBlockMs; });
}

function getBusyEvents_(dayStart, dayEnd) {
  const busy = [];
  CONFIG.SOURCE_CALENDAR_IDS.forEach(function (id) {
    const cal = id === 'primary' ? CalendarApp.getDefaultCalendar() : CalendarApp.getCalendarById(id);
    if (!cal) throw new Error('Calendar not found: ' + id);
    cal.getEvents(dayStart, dayEnd).forEach(function (ev) {
      if (ev.isAllDayEvent()) return;
      if (ev.getMyStatus() === CalendarApp.GuestStatus.NO) return;
      busy.push({ title: ev.getTitle(), start: ev.getStartTime().getTime(), end: ev.getEndTime().getTime() });
    });
  });
  return busy;
}

// ---- date helpers (all in the script time zone) ----

function parseDate_(str) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(str));
  if (!m) throw new Error('date must be yyyy-MM-dd, got: ' + str);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function atTime_(day, hhmm) {
  const parts = hhmm.split(':').map(Number);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), parts[0], parts[1]);
}

function roundUp_(date, minutes) {
  const step = minutes * MIN_MS;
  return new Date(Math.ceil(date.getTime() / step) * step);
}

function formatDate_(d) {
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function formatTime_(d) {
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'HH:mm');
}

function formatDateTime_(d) {
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
}
