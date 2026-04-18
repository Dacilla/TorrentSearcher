# Torrent Searcher

A self-hosted Next.js app for searching configured Jackett/Torznab indexers, resolving media metadata through TMDB, and checking or adding matched items in Sonarr or Radarr.

This app is designed for trusted local or self-hosted networks. Do not expose it directly to the public internet without adding authentication, rate limiting, and a durable cache/storage layer.

## Features

- Streams Jackett/Torznab results as indexers finish.
- Detects TV episodes, season packs, and movie/title searches.
- Lets you override TV/Movie detection before searching.
- Resolves TMDB metadata and TVDB/IMDB IDs for more precise tracker queries.
- Shows Sonarr/Radarr library status and protects Add actions with same-origin CSRF checks.
- Groups duplicate releases while preserving alternate tracker sources.
- Filters by resolution, codec, source, freeleech, and minimum seeders.
- Stores search/filter/sort state in the URL for refresh and sharing.

## Requirements

- Node.js compatible with Next `16.2.4`.
- A reachable Jackett instance with configured Torznab indexers.
- A TMDB API key.
- Optional Sonarr and Radarr instances for library status and Add actions.

## Configuration

Copy `.env.example` to `.env` and fill in your local values:

```bash
cp .env.example .env
```

```bash
JACKETT_URL=http://localhost:9117
JACKETT_API_KEY=replace-with-jackett-api-key

TMDB_API_KEY=replace-with-tmdb-api-key

SONARR_URL=http://localhost:8989
SONARR_API_KEY=replace-with-sonarr-api-key

RADARR_URL=http://localhost:7878
RADARR_API_KEY=replace-with-radarr-api-key
```

Sonarr and Radarr are optional. If they are missing, metadata search still works, but library status and Add actions report unavailable.

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Useful checks:

```bash
npm run build
npm run typecheck
npm run lint
npm run test
```

## Runtime State

The app writes local runtime cache files under `data/`:

- `data/caps-cache.json` caches Jackett indexer capabilities for 24 hours.
- `data/affinity-cache.json` stores local tracker affinity signals learned from previous searches.

These files are intentionally ignored by Git because they may contain local indexer names, local usage patterns, and other environment-specific state. The cache directory is created automatically at runtime.

If you deploy somewhere with ephemeral or read-only filesystems, replace the local JSON cache implementation with durable storage such as SQLite, Postgres, or Redis.

## Public Repo Hygiene

The repository is configured to exclude local-only files:

- `.env` and other environment files with secrets.
- `.claude/` and `.playwright-mcp/` local agent/browser state.
- `.next/`, `node_modules/`, `coverage/`, TypeScript build info, and debug logs.
- Runtime cache JSON files under `data/`.
- Root-level manual screenshot captures used during local testing.

Use `.env.example` as the public template for required configuration.

## Troubleshooting

- **No results:** check `/api/config?check=true`, confirm Jackett is reachable, and refresh indexer capabilities from `/api/indexers?refresh=true`.
- **Wrong TV/movie detection:** use the TV/Movie override under the search box before submitting.
- **Arr unavailable:** confirm `SONARR_URL`, `SONARR_API_KEY`, `RADARR_URL`, and `RADARR_API_KEY`, and verify those services are reachable from the Next.js server.
- **Add fails:** the app needs a configured quality profile and root folder in Sonarr/Radarr. The route chooses the first configured values unless explicit values are posted.
- **Serverless deploy issues:** replace local JSON caches with durable storage before deploying to a serverless target.
