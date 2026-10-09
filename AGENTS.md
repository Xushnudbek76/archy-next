# Archy frontend development

Archy is a real lecture workspace product. Keep the product name Archy.

- This is the independent Next.js frontend. The Django backend is `../archy-api`; each root owns its dependencies, lockfile and commands.
- Follow Insu/Nestar conventions: thin routes under `app`, UI under `libs/components`, frontend hooks/types/enums under `libs`, and HTTP transport under `api`.
- Preserve the original Archy_V2, Insu and Nestar projects.
- Keep Next.js responsible for presentation and session transport. Keep domain rules in Django feature apps.
- Keep account routes thin, feature components in `libs/components/account`, authentication helpers in `libs/auth`, and shared hooks in `libs/hooks`.
- Use same-origin HttpOnly Django sessions and CSRF protection. Never store authentication tokens in browser storage.
- Check current identity on every protected page; layouts alone can persist across navigation. Keep identity checks uncached and distinguish API outages from signed-out sessions.
- Never import backend source, database clients or worker dependencies into this project. Use public HTTP contracts.
- Use strict TypeScript. Verify changes with the relevant checks in README.md.
- The human authorized initial publication of this working foundation under `Xushnudbek76`. Keep real authorship and commit dates. Future changes follow focused branches and meaningful commits; `fix` describes an actual correction.

## GitHub identity

- The human user's GitHub account is `Xushnudbek76`. Use this account for commit authorship and authenticated writes.
- `0mininseoul` owns an existing repository; it is not the user's identity.
- Before publishing or merging, verify the authenticated account. Do not use another account for writes without explicit authorization.
- Preserve the existing author email when mapped to `Xushnudbek76`; do not fabricate an identity or rewrite published commits for attribution.
