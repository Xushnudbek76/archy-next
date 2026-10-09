# Archy Web

[![Frontend checks](https://github.com/Xushnudbek76/archy-next/actions/workflows/ci.yml/badge.svg)](https://github.com/Xushnudbek76/archy-next/actions/workflows/ci.yml)

Archy is a lecture workspace for organizing courses, recordings, transcripts and notes. This repository contains its independently runnable Next.js frontend.

**Stage:** responsive workspace foundation. Overview, Courses, Recordings and Settings routes are present. The overview displays real API connection status; upcoming features have explicit empty states.

**Backend:** [archy](https://github.com/Xushnudbek76/archy).

## Technology and architecture

Next.js App Router, React, TypeScript, Tailwind CSS, Node.js 24, ESLint, Prettier and GitHub Actions.

```text
app/                       Thin route entrypoints and layouts
api/server.ts              Server-only HTTP transport
libs/
  components/
    common/                Shared icons and empty states
    layout/                Workspace navigation and page shell
    homepage/              Overview feature UI
  hooks/                   Reserved for feature hooks
  enums/
  types/                   Public HTTP response types
styles/                    Application styles
public/                    Static assets
```

Routes compose components under `libs/components`. API access stays in server-only transport; domain rules and database access belong to the NestJS backend. Both repositories own their dependencies, lockfiles, environment configuration and CI. No filesystem import or npm workspace connects them.

## Local development

Prerequisites: Node.js 24.14.1, npm 11.11.0 and Git.

```sh
git clone https://github.com/Xushnudbek76/archy-next.git
cd archy-next
npm ci
cp .env.local.example .env.local
npm run dev
```

Open <http://localhost:3000>. Clone and start the [backend](https://github.com/Xushnudbek76/archy) in another terminal with `npm run start:dev`.

The frontend installs and builds without backend source or credentials. If the API is unavailable, the overview displays its unavailable state. Stop each process with Ctrl+C.

## Configuration

`API_BASE_URL` defaults to `http://127.0.0.1:3007` and is read only on the server. Set it in the root `.env.local` if the API address changes. Do not prefix private server configuration with `NEXT_PUBLIC_`.

The health request uses a timeout, bypasses caching and validates the response before showing a connected status.

## Verification and build

```sh
npm run check
npm audit --omit=dev
```

`check` runs formatting, ESLint, route type generation, strict TypeScript and the Next.js production build. Individual commands: `npm run lint`, `npm run typecheck` and `npm run build`. After building, `npm start` serves the production build on port 3000. CI runs checks on pushes and pull requests.

Local browser checks cover all four routes, real backend communication and the mobile layout. See [architecture and verification](https://github.com/Xushnudbek76/archy/blob/main/docs/separated-projects-verification.md) in the backend repository.

## Next milestones

Authentication, owner-scoped course screens, audio uploads, transcripts and AI notes are future work. The current UI contains no persisted course or recording data; its lecture-note illustration is decorative.

## Contributing

Use feature branches and focused pull requests. Include the behavior change, verification and screenshots when UI changes. Run `npm run check` before submitting. Use `feat` for new behavior, `fix` for actual corrections, and other conventional prefixes where appropriate.
