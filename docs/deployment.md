# Frontend deployment

This repository builds independently from `archy-api`. The Docker build enables Next.js
standalone output and copies its traced runtime, static files and public assets into a
non-root image. Backend source, environment files and model credentials are not copied.
See https://nextjs.org/docs/app/api-reference/config/next-config-js/output.

1. Apply backend migrations and deploy the API with its persistent media volume first.
2. Copy `deploy/environment.example` to private `.env.production` and set the actual HTTPS
   frontend origin and API address. Match `APP_ORIGIN` to FastAPI's `FRONTEND_ORIGIN` exactly.
   These are runtime, server-only values; do not add `NEXT_PUBLIC_` prefixes. The container
   must reach the API through trusted HTTPS; the existing transport permits plain HTTP only
   for loopback addresses. Do not disable that validation for an internal container name.
3. Run `docker compose config --quiet`, then `docker compose up -d --build web`. The host
   receives Next.js on loopback port 3000. Place a trusted TLS reverse proxy in front of it.
4. Adapt `deploy/nginx.conf.example` for that public hostname and existing certificates.
   The example belongs inside NGINX's `http` context and limits account entry routes by
   peer IP. If using a CDN/load balancer, first configure trusted proxy ranges for real IP
   handling; never accept arbitrary client IP headers. The API's peer limiter is still
   shared behind Next.js, so review those quotas for public signup traffic before launch.
5. Verify `/en`, `/demo`, sign-in, confirmation/reset email delivery, session loss and
   owner-checked document/PDF/audio access. Check mobile layout and provider-unavailable
   states. Keep tutor responses unbuffered; the example disables proxy response buffering.

The frontend healthcheck checks its public page, not database readiness. Monitor the API's
`/v1/health/ready` separately. Do not cache protected pages or `/api` responses at an ingress.
The existing private/no-store API policy and HttpOnly, host-scoped session cookies remain
in place. Forward HTTPS requests without rewriting their browser Origin header.

To enable the optional demo, follow `archy-api/docs/demo.md` on a separate sample deployment.
The frontend discovers the backend's availability at request time. No signup or model key
is needed to inspect the seeded material. Live model generation remains a separate release
check, with a private Groq key, account quotas and Korean/English quality verification.

For a local standalone build check, set `NEXT_STANDALONE=true` while running `npm run build`.
Copy `public` and `.next/static` to the generated standalone folder before starting its
`server.js`; Docker performs these copies automatically. Use the original output directory
when setting `NEXT_BUILD_DIR` for an isolated local check. Never copy private `.env` files
alongside the standalone output.
