# Archy Web

[![Frontend checks](https://github.com/Xushnudbek76/archy-next/actions/workflows/ci.yml/badge.svg)](https://github.com/Xushnudbek76/archy-next/actions/workflows/ci.yml)

Archy is a lecture workspace for organizing courses, recordings, transcripts and notes.
This repository contains its independently runnable Next.js frontend.

Next.js App Router · React · TypeScript · Tailwind CSS · Node.js 24

## Implemented

- Responsive workspace navigation and API connection status.
- Signup, email confirmation, login/logout and password recovery.
- Server-checked account identity on every workspace page, with retry states for API outages.
- Same-origin Django sessions with HttpOnly cookies, CSRF protection and restricted HTTP transport.
- Account settings showing the current user's name and email.
- Unit tests, browser flow tests and GitHub Actions checks.

Courses and recordings currently have empty states. The overview illustration is decorative;
course management, audio uploads, transcripts and AI notes follow.

## Structure

```text
app/
  (account)/               Public account pages and their layout
  (workspace)/             Protected workspace pages
  api/                     Thin same-origin HTTP route handlers
api/                       Server transport, identity lookup and browser request handling
libs/
  auth/                    Typed authentication helpers and session provider
  components/
    account/               Account forms, feedback and profile
    common/                Shared icons and empty states
    layout/                Workspace guard and navigation
    homepage/              Overview feature UI
  hooks/                   Shared authentication and form hooks
  types/                   Public HTTP response types
styles/                    Application styles
tests/                     Transport and identity tests
e2e/                       Browser tests and an isolated HTTP fixture
```

Routes compose focused components under `libs/components`, following the same conventions as
Insu and Nestar. Domain rules, passwords and database access belong to the separate
[Django backend](https://github.com/Xushnudbek76/archy-api). Each repository owns its dependencies,
lockfile, environment and CI. The frontend imports no backend source or database clients.

## Local development

Use Node.js 24 and npm 11.

```sh
git clone https://github.com/Xushnudbek76/archy-next.git
cd archy-next
npm ci
cp .env.local.example .env.local
npm run dev
```

Open [Archy locally](http://localhost:3000). In a separate terminal, configure
`archy-api` using its README and start it with:

```sh
python manage.py runserver 127.0.0.1:3007
```

Set the frontend's `APP_ORIGIN` and Django's `FRONTEND_ORIGIN` to the exact browser origin,
including scheme and port. The default is `http://localhost:3000`. Use that browser hostname
consistently so cookies belong to one host.

Development email links are private files under `archy-api/.local/mail`; open the link from
the newest email to confirm an account or reset a password. Configure real email delivery in
the backend before inviting users.

## Configuration

| Variable         | Default                 | Purpose                                                           |
| ---------------- | ----------------------- | ----------------------------------------------------------------- |
| `API_BASE_URL`   | `http://127.0.0.1:3007` | Django origin, accessed only by the Next server                   |
| `APP_ORIGIN`     | `http://localhost:3000` | Exact trusted browser origin                                      |
| `NEXT_BUILD_DIR` | `.next`                 | Optional separate build directory for parallel local verification |

Do not prefix these values with `NEXT_PUBLIC_`. Production origins require HTTPS, except loopback
addresses used for local verification. Set both origins explicitly when deploying.

## Checks

```sh
npm run check
npm audit --omit=dev
npx playwright install chromium
npm run test:e2e
```

`check` runs formatting, ESLint, Node tests, generated route types, strict TypeScript and the
production build. Browser tests automatically start an isolated HTTP fixture on port 3137 and
a separate production build on port 3130. They cover account creation, confirmation, incorrect credentials,
session refresh, failed/successful logout, password reset, invalid links, stale sessions, outage
recovery, keyboard submission and mobile overflow. CI installs Chromium and runs these checks.

For a supported browser already installed on an older Mac, set
`PLAYWRIGHT_CHROMIUM_EXECUTABLE` to its absolute executable path.

Local integration also ran the account flow against the actual Django API and disposable
PostgreSQL, using private test emails. To repeat it, configure an isolated backend on port 3137
with `FRONTEND_ORIGIN=http://127.0.0.1:3130` and file email output, then run:

```sh
REAL_API=1 AUTH_EMAIL_DIR=/absolute/path/to/test/mail npm run test:e2e
```

Use a disposable loopback database for this test; it creates accounts and resets passwords.
The controlled outage test runs against the fixture only. These browser tests do not prove SMTP
delivery or public deployment.

## Session flow

The browser requests `/api/auth/csrf` before each account mutation. Next forwards only allowlisted
JSON endpoints, session/CSRF cookies and the CSRF header to Django. Unsafe requests require the
exact `APP_ORIGIN`; redirects, oversized bodies and upstream failures are rejected or sanitized.
Response cookies are scoped to the frontend, with HttpOnly sessions and Secure cookies on HTTPS.
Identity and CSRF reads have a five-second upstream timeout. Account mutations allow fifteen
seconds for password hashing and database writes; the browser waits twenty seconds for mutations.
Timed-out writes are never replayed automatically. Signup/reset timeout messages explain that
the request may have completed and ask the user to check their email before retrying.

Protected pages read identity from Django on the server. Session loss redirects to sign in with
a safe workspace destination; temporary API failures show a retry screen. The client rechecks
identity when the tab regains focus. Email tokens require explicit submission, use no-referrer
headers, and are removed from the visible address bar after the page loads.
A short-lived cookie remembers only an allowlisted workspace destination through signup and
confirmation. It contains no credential, is never forwarded to Django, and is cleared after
successful login or logout.

Before public launch, configure trusted client-IP handling and edge rate limits: Django currently
sees the Next server's IP, so its authentication quotas are shared behind this transport. Do not
forward arbitrary browser IP headers. Also configure delivery, HTTPS and log redaction for email
link query strings. These are deployment work, separate from the implemented local account flow.

## Contributing

Use focused branches and pull requests. Run the checks before submitting. Keep real authorship
and commit dates; use `feat` for new behavior and `fix` for actual corrections.
