# Daily Planner

A personal planner: an Apps Script backend finds free time on Google Calendar (and later asks Claude to plan the day), and a static site on GitHub Pages shows it.

```
docs/      → website (GitHub Pages serves this folder)
backend/   → Apps Script files (copied into the Apps Script editor)
```

Full plan: `~/Downloads/daily-planner-plan.md`.

## Status

- [x] Step 1: backend core (free-time finder, password check, `ping`, setup)
- [x] Step 2 (part): website shows free and busy time for any day
- [ ] Step 2 (rest): Claude assigns tasks to blocks, code schedules them onto the Planner calendar
- [ ] Step 3: Add / Check-in pages, Start / Done time tracking

## Backend setup (one time)

1. Go to [script.new](https://script.new) and name the project "Daily Planner".
2. **Project Settings** (gear icon):
   - Time zone: **America/New_York**
   - Turn on **Show "appsscript.json" manifest file in editor**
   - **Script properties → Add script property:** `APP_PASSWORD` = a long random password
3. **Editor:** create one file for each file in `backend/` (same names; `.gs` files are "Script" files) and paste in its contents. Replace the contents of `appsscript.json` too.
4. Edit `Config.gs` if needed: day start, sleep cutoff, walking buffer, dinner time, and extra calendar IDs (for example, a separate class calendar).
5. Run `test_computeFreeBlocks`. Every line in the log should say PASS.
6. Run `setup`. Approve the permission prompt. This creates the **Planner** calendar and the **Daily Planner Data** sheet.
7. Run `test_freeTimeToday`. Check the logged free blocks against your real calendar.
8. **Deploy → New deployment →** type **Web app**, execute as **Me**, access **Anyone**. Copy the URL that ends in `/exec`.

**Updating later:** use **Deploy → Manage deployments → Edit (pencil) → Version: New version**. A *new* deployment gets a new URL.

## Website setup

1. Paste the `/exec` URL into `docs/config.js`.
2. Run it locally: `python -m http.server 8000 --directory docs`, then open http://localhost:8000.
3. Enter the password once. It is saved in this browser only, never in the repo.
4. To host it: push to GitHub, then **Settings → Pages → Deploy from a branch → `main` / `/docs`**.

## API

`POST` the web app URL with a text/plain body:

```json
{ "password": "...", "action": "freeTime", "params": { "date": "2026-10-19" } }
```

Every response is HTTP 200: `{ "ok": true, "data": ... }` or `{ "ok": false, "error": "..." }`.

| action | params | returns |
|---|---|---|
| `ping` | none | server time and time zone |
| `freeTime` | `date` (`yyyy-MM-dd`, defaults to today) | `blocks` (`id`, `start`, `end`, `minutes`) and `busy` |
