# Musico

Musico is a modern AMOLED-styled music search/player website built with Next.js and Materialize CSS.

## Features

- Dark AMOLED UI with transparent hover interactions
- Search input with instant result cards
- Multi-source playback:
  - YouTube embeds with API-key search (`YOUTUBE_API_KEY`)
  - Public YouTube web-search fallback (no key) for full video playback
  - Optional iTunes 30s previews only when explicitly enabled
- Server-side search route with:
  - Brave Search API (for YouTube result discovery)
  - YouTube Data API fallback
  - iTunes Search API fallback (public, no key)

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment file:

```bash
cp .env.example .env.local
```

3. Optional: add API key(s) in `.env.local`:

- `BRAVE_SEARCH_API_KEY`
- `YOUTUBE_API_KEY`

By default, Musico returns YouTube tracks only (full video playback), using:
1. YouTube Data API (if key provided)
2. Public YouTube web-search fallback
3. Brave YouTube search (if Brave key provided)

If you explicitly set `ALLOW_PREVIEW_FALLBACK=true`, it can fall back to iTunes 30-second previews.

4. Start development:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Notes

- Use the APIs according to provider terms and local regulations.
- This project does not block or bypass ads from YouTube's official platform itself; it provides a clean search-and-play interface around public video content.
- `.gitignore` excludes build artifacts and dependencies so the repository remains lightweight and GitHub-ready.
