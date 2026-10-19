/**
 * Hardcoded personal settings. Secrets do NOT go here; they live in
 * Project Settings → Script properties (APP_PASSWORD, later CLAUDE_API_KEY).
 */
const CONFIG = {
  // Calendars that count as "busy". 'primary' = your default calendar.
  // Add class/club calendar IDs here (Calendar settings → Integrate calendar → Calendar ID).
  SOURCE_CALENDAR_IDS: ['primary'],

  // Name of the calendar the planner writes its own blocks to (created by setup()).
  PLANNER_CALENDAR_NAME: 'Planner',

  // The planning window for each day (24h "HH:mm", script time zone).
  DAY_START: '08:00',
  SLEEP_CUTOFF: '23:00',

  // Walking time added after every busy event.
  WALK_BUFFER_MIN: 15,

  // Free gaps shorter than this are dropped.
  MIN_BLOCK_MIN: 20,

  // Dinner is reserved as busy time. Fixed for now; could be made flexible later.
  DINNER_START: '18:00',
  DINNER_MIN: 60,

  // Today's window starts at "now" rounded up to this many minutes.
  ROUND_NOW_TO_MIN: 5,

  DATA_SHEET_NAME: 'Daily Planner Data',
};
