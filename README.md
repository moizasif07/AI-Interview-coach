# AI Interview Coach

A full-stack MVP that runs AI-generated mock interviews, scores the candidate's answers,
and emails a professional report — built with **NestJS**, **OpenAI**, **Resend**, **Swagger**,
and **Sentry**.

```
ai-interview-coach/
├── backend/     NestJS API (TypeORM + SQLite, OpenAI, Resend, Swagger, Sentry)
└── frontend/    Static HTML/CSS/JS client (no build step required)
```

## 1. Backend setup

```bash
cd backend
cp .env.example .env      # then fill in your real keys
npm install
npm run build
npm run start:dev         # http://localhost:3000
```

Swagger docs: **http://localhost:3000/api/docs**

### Environment variables (`backend/.env`)

| Variable | Required | Notes |
|---|---|---|
| `OPENAI_API_KEY` | Recommended | Without it, the API still runs and returns clearly-labeled fallback questions/analysis so you can demo the full flow. |
| `OPENAI_MODEL` | No | Defaults to `gpt-4o-mini`. |
| `RESEND_API_KEY` | Recommended | Without it, `send-report` logs the email instead of sending it (dev mode). |
| `RESEND_FROM_EMAIL` | No | Must be a verified sender/domain in your Resend account. |
| `SENTRY_DSN` | No | If set, unhandled exceptions are reported to Sentry. |
| `PORT` | No | Defaults to `3000`. |
| `DATABASE_PATH` | No | SQLite file path, defaults to `./data/interview-coach.sqlite`. |

The database is SQLite via `better-sqlite3` with `synchronize: true`, so no migrations are
needed for the MVP — the schema is created automatically on first boot.

## 2. Frontend setup

The frontend is plain HTML/CSS/JS — no build tooling needed.

```bash
cd frontend
python3 -m http.server 5173     # or any static file server
```

Open **http://localhost:5173**, confirm the "API base" field in the left rail points at your
backend (`http://localhost:3000` by default), and start an interview.

## 3. The 6 required APIs

| # | Method & Path | Purpose |
|---|---|---|
| 1 | `POST /interviews` | Create Interview — registers the candidate and selects role/difficulty |
| 2 | `POST /interviews/:id/questions?count=5` | Generate Questions — AI generates 5-10 role-specific questions |
| 3 | `POST /interviews/:id/answers` | Submit Answers — one at a time or all at once |
| 4 | `POST /interviews/:id/analyze` | Analyze Interview — AI scores and evaluates the transcript |
| 5 | `GET /interviews/:id/report` | Generate/Get Report — full professional report (auto-analyzes if needed) |
| 6 | `POST /interviews/:id/send-report` | Send Report Email — emails the report via Resend |

Plus convenience endpoints: `GET /interviews` (all interviews, or `?email=` for a candidate's
history), `GET /interviews/:id` (single interview with questions/answers/report), and
`GET /interviews/roles/list` (predefined role suggestions for the UI).

## 4. Data models

`User` → `Interview` → `Question[]`, `Answer[]`, `Report` (one-to-one). See
`backend/src/entities/*.entity.ts`.

## 5. Notes on the MVP scope

- **AI fallback**: if `OPENAI_API_KEY` is missing or the OpenAI call fails, the service falls
  back to a generic question set / a clearly-labeled placeholder analysis rather than crashing,
  so the rest of the flow (submit → analyze → report → email) is always demoable.
- **Email fallback**: same idea for Resend — no key means the email is logged, not sent, and
  `send-report` still responds successfully in dev mode.
- **Sentry**: wired globally via `AllExceptionsFilter`; any 5xx (or non-HTTP) exception is
  captured automatically when `SENTRY_DSN` is set.
- **Validation**: every DTO uses `class-validator`; the app has a global `ValidationPipe` with
  `whitelist` + `forbidNonWhitelisted`.
- Bonus features not yet built (roadmap): PDF export, follow-up AI questions based on prior
  answers, interview history UI, custom-role autocomplete beyond the predefined list.
