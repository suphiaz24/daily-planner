/**
 * Run setup() once from the Apps Script editor (select it, click Run).
 * Safe to run again: it only creates what is missing.
 */

const SHEETS = {
  Tasks: ['id', 'name', 'type', 'due', 'estimate_min', 'actual_min', 'status', 'created_at', 'done_at'],
  TimeLog: ['task_id', 'start', 'end', 'minutes'],
};

function setup() {
  const props = PropertiesService.getScriptProperties();

  if (!props.getProperty('APP_PASSWORD')) {
    throw new Error('Set APP_PASSWORD first: Project Settings → Script properties → Add script property.');
  }

  if (Session.getScriptTimeZone() !== 'America/New_York') {
    console.warn('Script time zone is ' + Session.getScriptTimeZone() + '. Set it in Project Settings if that is wrong.');
  }

  // Planner calendar
  let calId = props.getProperty('PLANNER_CALENDAR_ID');
  if (!calId || !CalendarApp.getCalendarById(calId)) {
    const cal = CalendarApp.createCalendar(CONFIG.PLANNER_CALENDAR_NAME);
    calId = cal.getId();
    props.setProperty('PLANNER_CALENDAR_ID', calId);
    console.log('Created Planner calendar: ' + calId);
  } else {
    console.log('Planner calendar exists: ' + calId);
  }

  // Data sheet
  const ss = getDataSpreadsheet_(true);
  Object.keys(SHEETS).forEach(function (name) { ensureSheet_(ss, name, SHEETS[name]); });
  console.log('Data sheet: ' + ss.getUrl());
}

function getDataSpreadsheet_(createIfMissing) {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('SHEET_ID');
  if (id) return SpreadsheetApp.openById(id);
  if (!createIfMissing) throw new Error('No data sheet yet. Run setup().');

  const ss = SpreadsheetApp.create(CONFIG.DATA_SHEET_NAME);
  props.setProperty('SHEET_ID', ss.getId());
  console.log('Created data sheet');
  return ss;
}

function ensureSheet_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    // Reuse the default empty "Sheet1" for the first tab.
    const blank = ss.getSheetByName('Sheet1');
    sheet = blank && blank.getLastRow() === 0 ? blank.setName(name) : ss.insertSheet(name);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
  }
  return sheet;
}
