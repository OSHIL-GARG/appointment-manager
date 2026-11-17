# Submission summary

## Completed and tested
- **API (13 automated tests, real HTTP, file store) + live smoke test**: list, add with validation, edit (PUT), delete, status change, status filter, name search, stats counts, persistence across restart
- **UI (16 automated tests in jsdom with a fake API)**: grouping, validation messages, add, status change + undo, edit, delete + undo, filter, search + filter, URL restore on reload, week view navigation + edit from a chip, dark-mode toggle, API-down error with retry
- TypeScript on both sides (`npm run typecheck` passes)

## Written but NOT verified in the build environment (check before the demo)
- **MongoDB store**: no MongoDB was available. Run against your Mongo (`docker compose up -d`) and repeat the manual checklist.
- **Real browser**: visuals (fonts, spacing, dark theme, mobile sheet, week grid) were never viewed in a browser; automated UI tests run in jsdom.

## Known limitations
- No auth, pagination, or double-booking / past-date checks (not in the brief)
- Undo after delete re-creates the item with a new id (not a true restore)
- Search is a substring match on customer name only
- Web fonts load from Google Fonts; system fonts are used offline

## Technical decisions
1. Date/time is a wall-clock string `YYYY-MM-DDTHH:mm`, not a UTC Date: the brief gives local times with no timezone, this avoids shifts between browser, server and DB, and ISO strings sort as text. Trade-off: no timezone-aware logic without a migration.
2. Filtering and search run server-side (`?status=&search=`), with counts from `/stats`, so the UI doesn't depend on loading every row.
3. Both storage backends implement one `Store` interface, so the Mongo-unavailable fallback needs no API changes.

## Manual checklist (do this before the demo)
1. Fresh start: 3 seeded rows; counts All 3 / Pending 1 / Confirmed 1 / Cancelled 1
2. Submit empty form: 3 field errors; focus jumps to the first
3. Add an appointment: appears in date order
4. Change its status, then Undo
5. Edit it (list row and Week chip), then Delete and Undo
6. Filter each status; search "alex", "ALEX", "a" with a filter on
7. Refresh: data, filter, search and view stay
8. Week view: prev / next / Today; dark mode toggle
9. Phone width: New appointment opens a bottom sheet
