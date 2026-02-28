# JCIN UNIBEN TOYP Dashboard Backend

This simple Node.js (ES module) service provides API endpoints for the TOYP UNIBEN website. It uses Supabase as the database/backend and exposes a minimal Express-powered REST API for nominations, votes, categories, counts, and more.

## Prerequisites

- Node.js 18 or later (includes npm).
- A Supabase project with the tables defined in `schema.sql`.

## Setup

1. Copy `.env.example` to `.env` and fill in the values from your Supabase project. Rotate any keys if they were committed previously.
2. Install dependencies:

```bash
cd jcinunibentoypdashboard
npm install
```

3. You can run the server in production mode:

```bash
npm start
```

or during development with automatic restarts:

```bash
npm run dev
```

The app listens on port `3000` by default (override with `PORT` env).

## Available endpoints

- `GET /api/health` – quick health check, returns `{ status: 'ok' }`.
- `POST /api/nominations` – insert a new nomination.
- `GET /api/nominations` – list recent nominations.
- `GET /api/counts` – return total counts for overview.
- `POST /api/votes` – record a vote.
- `GET /api/categories` – list category records.

> **Note:** the database schema is managed on the Supabase project. You can run SQL commands via the dashboard's SQL editor or using the Supabase CLI.

## Using the API from the frontend

In `JCIN-UNIBEN-TOYP25/scripts/nomination.js` the form now posts to `/api/nominations`. When the backend is running locally, serve the static files from a server or use `npm install -g serve` and run `serve .` inside the static site folder. The backend must be reachable at the same origin or configure CORS accordingly.

## Security & best practices

- Never expose the service role key in client-side code.
- Store secrets in environment variables and keep `.env` out of version control.
- `.gitignore` already excludes `.env` and `databaseCredentials.json`.
- Rotate keys if you lose access to the Supabase dashboard.

## Development notes

- The codebase uses ES module syntax; `package.json` contains `"type": "module"`.
- Use `npm run dev` (requires `nodemon`) to restart automatically on changes.

---

This repo can be deployed anywhere Node.js is supported (Vercel, Heroku, DigitalOcean, etc.) using the same `.env` values.
