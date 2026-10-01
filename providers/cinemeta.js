const BASE = process.env.CINEMETA_URL || "https://v3-cinemeta.strem.io";
const TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 7000);

async function getJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      headers: { accept: "application/json" },
      signal: controller.signal
    });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function normalizeId(id) {
  try {
    return decodeURIComponent(String(id || "")).trim();
  } catch {
    return String(id || "").trim();
  }
}

function baseVideoId(id) {
  const clean = normalizeId(id);
  if (/^tt\d+/.test(clean)) return clean.split(":")[0];
  if (/^tmdb:\d+/.test(clean)) return clean.split(":")[0];
  if (/^tmdb\d+/.test(clean)) return clean;
  return clean;
}

export async function resolveTitle(type, id) {
  if (!["movie", "series"].includes(type)) return null;

  const cleanId = baseVideoId(id);
  if (!cleanId) return null;

  // Cinemeta natively resolves IMDb IDs. TMDB IDs are retained for
  // local-provider matching but are not sent as malformed Cinemeta IDs.
  if (!/^tt\d+$/.test(cleanId)) return null;

  const url = `${BASE}/meta/${type}/${encodeURIComponent(cleanId)}.json`;
  const data = await getJson(url);
  const meta = data?.meta;
  if (!meta) return null;

  return {
    id: cleanId,
    title: meta.name || meta.title || "",
    year: meta.year ? String(meta.year) : "",
    imdbId: meta.imdb_id || cleanId,
    language: meta.language || meta.originalLanguage || "",
    genres: Array.isArray(meta.genre) ? meta.genre : [],
    poster: meta.poster || ""
  };
}
