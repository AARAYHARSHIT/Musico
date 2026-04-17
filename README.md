# Musico

Musico is a modern AMOLED-styled music search/player website built with Next.js and Materialize CSS.

## Features

- Dark AMOLED UI with transparent hover interactions
- Search input with instant result cards
- Multi-source playback:
  - YouTube embeds when Brave/YouTube APIs are configured
  - Public iTunes song previews without API keys
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

If keys are not provided, the app still works through the public iTunes Search API.

4. Start development:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Notes

- Use the APIs according to provider terms and local regulations.
- This project does not block or bypass ads from YouTube's official platform itself; it provides a clean search-and-play interface around public video content.
- `.gitignore` excludes build artifacts and dependencies so the repository remains lightweight and GitHub-ready.
