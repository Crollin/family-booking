# AGENTS.md

family-booking is a Next.js (App Router) app shipped with its whole backend as a Docker
Compose stack (Postgres, Auth, PostgREST, Realtime, Storage). No external service is
required. See `README.md` and `docs/CONFIGURATION.md`.

## Run

```bash
cp .env.example .env     # only if .env is missing
docker compose up -d
```

The app is served at http://localhost:3000. The first visit to `/login` offers to create
the first administrator.

## Checks

```bash
npm install --legacy-peer-deps
npm run lint
npm test
npm run build
```

`npm run test:e2e` (Playwright) expects the stack to be running; set
`PLAYWRIGHT_BASE_URL` if the app is not on port 3000.

## Notes

- Never commit `.env`; the secrets in `.env.example` are public dev values.
- The DB schema lives in `docker/db/init/` and is applied only when the data volume is
  created (`docker compose down -v` to reset).
