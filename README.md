# LokSamadhan — Public Issue Resolution Tracker

Hackathon problem WEB03. Citizens report civic issues, see **possible existing reports before
filing a duplicate**, and track public status. Officers assign a department and move issues
through Submitted → Acknowledged → In Progress → Resolved.

## Setup

```bash
# server
cd server && cp .env.example .env   # fill in MONGO_URI + JWT_SECRET
npm install && npm run dev          # :5000

# client
cd client && npm install && npm run dev   # :5173
```

`GET http://localhost:5000/api/health` → `{"ok":true}` means the API is up.

## Plan

- [this-is-the-problem-starry-cosmos.md](this-is-the-problem-starry-cosmos.md) — spec, data model, schedule
- [lanes/](lanes/) — one brief per person

## Hard rules (enforced server-side, not in the UI)

1. Duplicates are linked, never deleted.
2. Resolution requires a note or evidence.
3. Reporter personal info never appears in a public response.
4. No real municipal integration.
