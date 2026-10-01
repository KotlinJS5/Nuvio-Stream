import { resolveTitle } from "./cinemeta.js";
import { searchInternetArchive } from "./internetarchive.js";
import { getStreams as getLocalStreams } from "./local.js";

function dedupe(streams) {
  const seen = new Set();
  return streams.filter(stream => {
    const key = String(stream?.url || "").trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function qualityScore(stream) {
  const text = `${stream?.title || ""} ${stream?.name || ""}`.toLowerCase();
  if (/2160|4k|uhd/.test(text)) return 2160;
  if (/1440/.test(text)) return 1440;
  if (/1080/.test(text)) return 1080;
  if (/720/.test(text)) return 720;
  if (/576/.test(text)) return 576;
  if (/480/.test(text)) return 480;
  return 0;
}

export async function getStreams(type, id) {
  const localPromise = getLocalStreams(type, id);

  // Local authorized HTTP sources should remain available even when metadata
  // services are unavailable.
  if (type !== "movie") return await localPromise;

  const [local, media] = await Promise.all([
    localPromise,
    resolveTitle(type, id)
  ]);

  if (!media) return local;

  const remote = await searchInternetArchive(media);
  const merged = dedupe(
    [...local, ...remote].filter(s => s?.url && /^https?:\/\//i.test(s.url))
  );

  return merged
    .sort((a, b) => qualityScore(b) - qualityScore(a))
    .map((stream, i) => ({
      name: [stream.language, stream.provider || stream.name].filter(Boolean).join(" • "),
      title: stream.title || "HTTP Stream",
      url: stream.url,
      behaviorHints: {
        notWebReady: false,
        bingeGroup: `nuvio-${type}-${i}`
      }
    }));
}
