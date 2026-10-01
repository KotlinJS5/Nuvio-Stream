const BASE = process.env.CINEMETA_URL || "https://v3-cinemeta.strem.io";
const TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 8000);

async function getJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, { headers: { accept: "application/json" }, signal: controller.signal });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function resolveTitle(type, id) {
  const cleanId = decodeURIComponent(id);
  const url = `${BASE}/meta/${type}/${encodeURIComponent(cleanId)}.json`;
  const data = await getJson(url);
  const meta = data?.meta;
  if (!meta) return null;

  return {
    id: cleanId,
    title: meta.name || meta.title || "",
    year: meta.year ? String(meta.year) : "",
    imdbId: meta.imdb_id || (cleanId.startsWith("tt") ? cleanId : ""),
    language: meta.language || meta.originalLanguage || "",
  };
}
