# API notes

Base URL: `http://localhost:4000/api`. JSON in/out. Statuses: `Pending`, `Confirmed`, `Cancelled`.
Appointment: `{ id, customerName, service, dateTime: "YYYY-MM-DDTHH:mm", status }` (wall-clock time, no timezone).

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | `{ ok, storage: "mongodb" \| "json-file" }` |
| GET | `/appointments?status=&search=` | `status`: All/Pending/Confirmed/Cancelled. `search`: partial, case-insensitive customer name. Combine freely. Sorted by date/time ascending. 400 on unknown status. |
| GET | `/appointments/stats?search=` | `{ All, Pending, Confirmed, Cancelled }` counts (respects `search`). |
| POST | `/appointments` | Body: customerName, service, dateTime, status. 201 + created item. 400 `{ error, errors: { field: message } }` on validation failure. |
| PUT | `/appointments/:id` | Replace editable fields (same validation as POST). 200 + item, 400, 404. |
| PATCH | `/appointments/:id/status` | Body: `{ status }`. 200 + updated item, 400 invalid status, 404 unknown id. |
| DELETE | `/appointments/:id` | 204 on success, 404 if unknown. |

Errors: 400 malformed JSON, 404 unknown `/api` route, 500 generic (details only in server log).
