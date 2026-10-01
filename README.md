# Nuvio Stream

A small self-hosted HTTP streaming addon for Nuvio and other Stremio-compatible clients.

## What it does

- Implements the standard Stremio addon HTTP protocol.
- Supports movie and series stream requests for IMDb tt... and TMDB-style IDs.
- Resolves title metadata through Cinemeta.
- Searches Internet Archive for matching movie items.
- Only returns Internet Archive video files whose item metadata declares a public-domain or Creative Commons-style license.
- Supports your own authorized HTTP streams through streams.json.
- Merges and de-duplicates local and remote results.
- Adds CORS and a health endpoint.
- No torrent/P2P, DRM bypass, paywall bypass, or protected-source scraping.

Nuvio uses the same basic addon protocol as Stremio and requests streams from paths such as /stream/movie/tt1234567.json.

## Run locally

Requires Node.js 20+.

```bash
npm install
npm test
npm start
```

Local manifest:

http://localhost:7000/manifest.json

## Deploy

The repository includes render.yaml for a Render web service. After deployment, your manifest will be:

https://YOUR-RENDER-SERVICE.onrender.com/manifest.json

Nuvio's addon installation flow accepts a public manifest URL.

## Authorized local streams

Edit streams.json:

```json
{
  "tt1234567": [
    {
      "name": "My Provider",
      "title": "1080p • H.264",
      "language": "English",
      "provider": "Authorized source",
      "url": "https://your-authorized-host.example/video.mp4"
    }
  ]
}
```

Use only streams you are authorized to access and redistribute.

## Providers

providers/index.js runs the local provider plus the public-domain/Creative Commons Internet Archive provider. New authorized providers can be added without changing the HTTP protocol.

The Internet Archive exposes public search and metadata APIs; direct file URLs can be derived from an item's metadata and identifier.

## Important

This addon is not a universal scraper for commercial streaming sites. Commercial services generally require their own authorization/API or app-level playback flow. This project deliberately avoids bypassing access controls or redistributing copyrighted streams without permission.

## Nuvio install

1. Deploy the repository as a public HTTPS service.
2. Open Nuvio -> Settings -> Addons -> Add Addon.
3. Paste your deployed /manifest.json URL.
4. Install.

Nuvio's current documentation describes addons as remote HTTP services using the standard Stremio addon protocol.
