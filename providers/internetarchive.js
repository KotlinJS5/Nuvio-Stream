const SEARCH_URL = "https://archive.org/advancedsearch.php";
const META_URL = "https://archive.org/metadata";
const TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 7000);
const MAX_FILE_BYTES = 3_000_000_000;
const MAX_ITEMS = 8;
const MAX_FILES_PER_ITEM = 4;

function esc(value) {
  return String(value).replace(/([+\-!(){}\[\]^"~*?:\\])/g, "\\$1");
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function tokenScore(a, b) {
  const left = normalize(a);
  const right = normalize(b);
  if (!left || !right) return 0;
  if (left === right) return 100;
  if (left.includes(right) || right.includes(left)) return 70;
  const aTokens = new Set(left.split(" "));
  const bTokens = new Set(right.split(" "));
  const common = [...aTokens].filter(x => bTokens.has(x)).length;
  return Math.round((common / Math.max(aTokens.size, bTokens.size)) * 60);
}

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

function publicLicense(metadata = {}) {
  const values = [
    metadata.licenseurl,
    metadata.license,
    metadata.rights
  ].filter(Boolean).map(v => String(v).toLowerCase());

  return values.some(s =>
    s.includes("public domain") ||
    s.includes("publicdomain") ||
    s.includes("creativecommons.org/publicdomain") ||
    s.includes("creativecommons.org/licenses/by") ||
    s.includes("creativecommons.org/licenses/by-sa") ||
    s.includes("creativecommons attribution")
  );
}

function resolutionScore(file) {
  const text = `${file?.name || ""} ${file?.format || ""}`.toLowerCase();
  const match = text.match(/(?:^|[^0-9])(2160|1440|1080|720|576|480|360)p?(?:[^0-9]|$)/);
  if (match) return Number(match[1]);
  if (/4k|uhd/.test(text)) return 2160;
  if (/hd/.test(text)) return 720;
  return 0;
}

function videoFile(file) {
  const name = String(file?.name || "");
  const format = String(file?.format || "").toLowerCase();
  const size = Number(file?.size || 0);

  if (file?.private || (size && size > MAX_FILE_BYTES)) return false;
  if (!/^.+\.(mp4|m4v|webm|ogv|mov)$/i.test(name) &&
      !/(mpeg4|h\.264|avc|webm|ogg video)/i.test(format)) return false;
  if (/_(thumb|sample|preview)|\.(srt|vtt|jpg|jpeg|png|gif)$/i.test(name)) return false;
  return true;
}

async function itemFiles(identifier, media) {
  const data = await getJson(`${META_URL}/${encodeURIComponent(identifier)}`);
  if (!data || !Array.isArray(data.files) || !publicLicense(data.metadata || {})) return [];

  const host = data.d1 || data.server || "archive.org";
  return data.files
    .filter(videoFile)
    .map(file => {
      const name = String(file.name);
      const parts = name.split("/").map(encodeURIComponent);
      const format = String(file.format || "");
      return {
        url: `https://${host}/download/${encodeURIComponent(identifier)}/${parts.join("/")}`,
        title: name,
        format,
        size: Number(file.size || 0),
        resolution: resolutionScore(file)
      };
    })
    .filter(file => /^https?:\/\//i.test(file.url))
    .sort((a, b) =>
      b.resolution - a.resolution ||
      Number(/h\.264|avc/i.test(b.format)) - Number(/h\.264|avc/i.test(a.format)) ||
      b.size - a.size
    )
    .slice(0, MAX_FILES_PER_ITEM)
    .map(file => ({
      ...file,
      provider: "Internet Archive",
      language: media.language || "English"
    }));
}

export async function searchInternetArchive(media) {
  if (!media?.title) return [];

  const lang = String(media.language || "").toLowerCase();
  const title = esc(media.title);
  const year = media.year ? ` AND year:${esc(media.year)}` : "";
  const params = new URLSearchParams({
    q: `mediatype:movies AND title:(${title})${year}`,
    fl: "identifier,title,year,language,downloads",
    rows: "20",
    output: "json",
    page: "1"
  });

  const data = await getJson(`${SEARCH_URL}?${params}`);
  const docs = Array.isArray(data?.response?.docs) ? data.response.docs : [];

  const ranked = docs
    .filter(doc => {
      if (!lang || !Array.isArray(doc.language)) return true;
      return doc.language.some(x => String(x).toLowerCase().includes(lang));
    })
    .map(doc => {
      const exact = tokenScore(doc.title, media.title);
      const yearScore = media.year && String(doc.year || "") === String(media.year) ? 25 : 0;
      const popularity = Math.min(10, Math.log10(Math.max(1, Number(doc.downloads || 0))));
      return { doc, score: exact + yearScore + popularity };
    })
    .filter(item => item.score >= 45)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  const groups = await Promise.all(
    ranked.map(({ doc }) => itemFiles(doc.identifier, media))
  );

  const results = [];
  for (let i = 0; i < ranked.length; i++) {
    const doc = ranked[i].doc;
    for (const file of groups[i]) {
      const quality = file.resolution ? `${file.resolution}p` : "HTTP";
      results.push({
        name: `English • Internet Archive`,
        title: `${doc.title || media.title} • ${quality}${file.format ? ` • ${file.format}` : ""}`,
        url: file.url,
        language: file.language,
        provider: file.provider,
        resolution: file.resolution,
        size: file.size
      });
    }
  }

  return results
    .sort((a, b) => (b.resolution || 0) - (a.resolution || 0) || (b.size || 0) - (a.size || 0))
    .slice(0, MAX_ITEMS);
}
