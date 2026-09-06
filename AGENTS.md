<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Commands

- `npm run dev` — local dev (Turbopack, default in Next 16)
- `npm run build` / `npm start` — production build/start
- `npm run typecheck` — `next typegen && tsc --noEmit`
- `npm run lint` — eslint with `--max-warnings=0`
- `npm test` — `vitest run`

## Notes

- Self-hosted/trusted-LAN app: Arr writes are CSRF-gated, not authenticated. Do not expose publicly without an auth proxy.
- `POST /api/indexers` refreshes Jackett caps (CSRF required); `GET /api/indexers` reads cache.
- Runtime caches live under `data/` (`caps-cache.json`, `affinity-cache.json`, gitignored).

