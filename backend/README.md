# EcoTrack API

Node.js / Express / MongoDB backend for EcoTrack, matching the routes and
collections in the project spec.

## Setup

```
npm install
cp .env.example .env      # then fill in MONGO_URI and JWT_SECRET
npm run dev                # starts on http://localhost:5000
```

Requires a running MongoDB instance (local or Atlas) at the URI in `.env`.

## Folder structure

```
config/db.js         mongoose connection
models/               User, WasteReport, PickupRequest, Notification
middleware/auth.js    JWT verification + role checks
middleware/upload.js  multer config for photo uploads
routes/               auth, reports, pickups, admin
uploads/              saved report/proof photos, served at /uploads/<file>
server.js             app entry point
```

## Auth

All routes except `/api/auth/*` require a header:

```
Authorization: Bearer <token>
```

The token comes back from register/login. Role (`citizen`, `collector`,
`admin`) is stored on the user and checked per route.

## Endpoints

**Auth**
- `POST /api/auth/register` — { name, email, password, role?, address? }
- `POST /api/auth/login` — { email, password }

**Waste reports**
- `POST /api/reports` — citizen only; multipart form with `photo` field
- `GET /api/reports` — citizens see their own, collectors see what's assigned
  to them, admins see everything; supports `?status=&wasteType=&search=`
- `GET /api/reports/:id`
- `PUT /api/reports/:id` — citizens can edit while Pending, collectors can
  move Assigned → In Progress → Completed (with an optional `proofPhoto`
  file), admins can edit anything
- `DELETE /api/reports/:id` — owner (while Pending) or admin

**Pickup requests**
- `POST /api/pickups` — { location, scheduledDate }
- `GET /api/pickups`
- `PUT /api/pickups/:id` — admin assigns a collector, collector updates status

**Admin**
- `GET /api/admin/dashboard` — counts by status, waste-type breakdown,
  average resolution time, top reported locations
- `GET /api/admin/reports` — full report list with filters
- `PUT /api/admin/assign` — { reportId, collectorId }

## Notes for connecting the front-end demo

The demo UI (`ecotrack` HTML/CSS/JS) currently keeps everything in
`localStorage` so it runs with no server. To wire it to this API, swap the
`save()`/`load()` calls for `fetch()` calls against these routes, store the
JWT after login, and send it as the `Authorization` header on every request.
The data shapes (waste type, status values, location, description) already
match, so the UI logic mostly carries over as-is.
