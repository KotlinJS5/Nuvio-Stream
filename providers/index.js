import { resolveTitle } from "./cinemeta.js";
import { searchInternetArchive } from "./internetarchive.js";
import { getStreams as getLocalStreams } from "./local.js";

function dedupe(streams) {
  const seen = new Set();
  return streams.filter(s => {
    const key = s.url;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function getStreams(type, id) {
  const local = await getLocalStreams(type, id);
  const media = await resolveTitle(type, id);

  if (!media) return local;

  const remote = await searchInternetArchive(media);
  const merged = [...local, ...remote].filter(s => s?.url && /^https?:\/\//i.test(s.url));

  return dedupe(merged).map((s, i) => ({
    name: [s.language, s.provider || s.name].filter(Boolean).join(" • "),
    title: s.title || "HTTP Stream",
    url: s.url,
    behaviorHints: {
      notWebReady: false,
      bingeGroup: `nuvio-${type}-${i}`
    }
  }));
}
