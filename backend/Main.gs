/**
 * Web app entry point. The website POSTs a text/plain body containing JSON:
 *   { "password": "...", "action": "ping", "params": {...} }
 * Apps Script always answers HTTP 200, so every response is
 *   { "ok": true, "data": ... }  or  { "ok": false, "error": "..." }
 */

function getActions_() {
  return {
    ping: function () {
      return { message: 'pong', time: formatDateTime_(new Date()), timeZone: Session.getScriptTimeZone() };
    },
    freeTime: function (params) {
      return findFreeBlocks(params.date);
    },
  };
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) return json_({ ok: false, error: 'empty request' });
    const req = JSON.parse(e.postData.contents);

    if (!checkPassword_(req.password)) return json_({ ok: false, error: 'unauthorized' });

    const handler = getActions_()[req.action];
    if (!handler) return json_({ ok: false, error: 'unknown action: ' + req.action });

    return json_({ ok: true, data: handler(req.params || {}) });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: String((err && err.message) || err) });
  }
}

// Visiting the URL in a browser shows nothing useful on purpose.
function doGet() {
  return json_({ ok: true, data: 'Daily planner backend. Use POST.' });
}

function checkPassword_(given) {
  const expected = PropertiesService.getScriptProperties().getProperty('APP_PASSWORD');
  if (!expected) throw new Error('APP_PASSWORD is not set in Script properties');
  if (typeof given !== 'string' || given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
