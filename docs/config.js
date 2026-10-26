// The Apps Script web app URL (ends in /exec). Not a secret: the backend rejects
// any request without the password, and the password is never stored in this repo.
window.PLANNER_CONFIG = {
  BACKEND_URL: 'https://script.google.com/macros/s/AKfycbwQ0WCWZauJjJC_pHGT2_d9gJDB5IoHfnikKCEegbYD49T2novwHQHe8xr_wyOZ11yi/exec',

  // Hours shown on the calendar grid. Keep in line with DAY_START / SLEEP_CUTOFF in Config.gs.
  GRID_START_HOUR: 8,
  GRID_END_HOUR: 23,
};
