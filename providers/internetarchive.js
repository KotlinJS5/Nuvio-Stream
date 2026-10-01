const SEARCH_URL = "https://archive.org/advancedsearch.php";
const META_URL = "https://archive.org/metadata";
const TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 8000);

function esc(value) {
  return String(value).replace(/([+\-!(){}\[\]^"~*?:\\])/g, "\\$1");
}

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

function publicLicense(value) {
  const s = String(value || "").toLowerCase();
  return s.includes("publicdomain") ||
    s.includes("public domain") ||
    s.includes("creativecommons.org/publicdomain") ||
    s.includes("creativecommons.org/licenses/by") ||
    s.includes("creativecommons.org/licenses/by-sa");
}

function videoFile(file) {
  const name = String(file?.name || "");
  const format = String(file?.format || "").toLowerCase();
  if (file?.private || file?.size && Number(file.size) > 3_000_000_000) return false;
  if (!/\.(mp4|m4v|webm|ogv|mov)$/i.test(name) && !/(mpeg4|h\.264|webm|ogg video)/i.test(format)) return false;
  if (/_(thumb|sample|preview)|\.srt$|\.vtt$|\.jpg$|\.png$/i.test(name)) return false;
  return true;
}

async function itemFiles(identifier) {
  const data = await getJson(`${META_URL}/${encodeURIComponent(identifier)}`);
  if (!data || !Array.isArray(data.files) || !publicLicense(data.metadata?.licenseurl || data.metadata?.license || data.metadata?.rights)) return [];
  const host = data.d1 || data.server || "archive.org";
  return data.files
    .filter(videoFile)
    .map(f => ({
      url: `https://${host}/download/${encodeURIComponent(identifier)}/${String(f.name).split("/").map(encodeURIComponent).join("/")}`,
      title: f.name,
      format: f.format || ""
    }))
    .sort((a, b) => (b.format.includes("h.264") ? 1 : 0) - (a.format.includes("h.264") ? 1 : 0))
    .slice(0, 3);
}

export async function searchInternetArchive(media) {
  if (!media?.title) return [];

  const lang = String(media.language || "").toLowerCase();
  const title = esc(media.title);
  const year = media.year ? ` AND year:${esc(media.year)}` : "";
  const query = `mediatype:movies AND title:(${title})${year}`;

  const params = new URLSearchParams({
    q: query,
    fl: "identifier,title,year,language",
    rows: "8",
    output: "json",
    page: "1"
  });

  const data = await getJson(`${SEARCH_URL}?${params}`);
  const docs = Array.isArray(data?.response?.docs) ? data.response.docs : [];
  const ranked = docs
    .filter(d => !lang || !Array.isArray(d.language) || d.language.some(x => String(x).toLowerCase().includes(lang)))
    .slice(0, 5);

  const results = [];
  for (const doc of ranked) {
    const files = await itemFiles(doc.identifier);
    for (const file of files) {
      results.push({
        name: "Internet Archive • Public Domain/CC",
        title: `${doc.title || media.title}${file.format ? ` • ${file.format}` : ""}`,
        url: file.url,
        language: lang || "English",
        provider: "Internet Archive"
      });
    }
  }
  return results.slice(0, 8);
}
