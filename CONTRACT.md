# LokSamadhan — API & Data Contract

> **Frozen after foundation commit.** All lanes import models and constants from the shared layer.
> Do NOT modify schema fields, enum values, or route paths without full-team agreement.

---

## Roles & Credentials (Seeded)

| Role    | Email                                | Password     |
|---------|--------------------------------------|-------------|
| Admin   | admin@loksamadhan.gov.in             | password123 |
| Officer | officer.roads@loksamadhan.gov.in     | password123 |
| Officer | officer.water@loksamadhan.gov.in     | password123 |
| Officer | officer.sanitation@loksamadhan.gov.in| password123 |
| Citizen | citizen1@example.com                 | password123 |
| Citizen | citizen2@example.com                 | password123 |

---

## Enums (server/constants.js)

- **CATEGORIES**: Road, Water, Sanitation, Streetlight, Drainage, Other
- **DEPARTMENTS**: Roads & Infrastructure, Water Supply & Sewage, Solid Waste Management, Electricity & Lighting, Public Health & Drainage, General Administration
- **STATUSES**: Submitted → Acknowledged → In Progress → Resolved
- **PRIORITIES**: low, medium, high
- **ROLES**: citizen, officer, admin

---

## API Routes

### Auth (Lane 1)
| Method | Path              | Auth | Description               |
|--------|-------------------|------|---------------------------|
| POST   | /api/auth/register | No   | Citizen self-registration  |
| POST   | /api/auth/login    | No   | Returns JWT token          |
| GET    | /api/auth/me       | Yes  | Current user profile       |

### Issues (Lane 2)
| Method | Path                         | Auth     | Description                            |
|--------|------------------------------|----------|----------------------------------------|
| GET    | /api/issues                  | Optional | List issues (supports multi-filter)    |
| GET    | /api/issues/:id              | Optional | Single issue detail                    |
| POST   | /api/issues                  | Citizen  | Create new issue                       |
| PATCH  | /api/issues/:id/assign       | Officer+ | Assign department & priority           |
| PATCH  | /api/issues/:id/status       | Officer+ | Update status (Rule #2 enforced)       |
| POST   | /api/issues/:id/support      | Citizen  | +1 support an existing issue           |

### Similar / Dedup (Lane 4)
| Method | Path                  | Auth | Description                                     |
|--------|-----------------------|------|-------------------------------------------------|
| GET    | /api/issues/similar   | No   | Find potential duplicates (geo + text similarity)|

### Stats (Lane 1 — Phase 2)
| Method | Path        | Auth | Description                     |
|--------|-------------|------|---------------------------------|
| GET    | /api/stats  | No   | Aggregated counts for dashboard |

---

## Hard Rules (Server-Side Enforced)

1. **Duplicates are linked, never deleted** — `duplicateOf` pointer, both issues remain queryable.
2. **Resolution requires a note or evidence** — PATCH status to `Resolved` returns 400 if `note` and `evidence` are both empty.
3. **Reporter privacy** — `toPublic()` strips reporter name/email from all public responses.
4. **No real municipal integration** — standalone system, no 3rd-party civic API calls.

---

## Challenge Card: WEB-C02(1) — Useful Filters

`GET /api/issues` must support **at least 2 simultaneous filters**:
- `?status=In Progress&category=Road`
- `?status=Submitted&area=Hazara Pukhuri`
- `?category=Water&department=Water Supply & Sewage`

Judges will apply both filters and verify only matching records remain.

---

## Map Center

**Tezpur, Assam** — `[92.7926, 26.6338]` (lng, lat)
