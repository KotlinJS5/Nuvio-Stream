import { getStreams } from "../../../providers/index.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();

  const { type, id } = req.query || {};
  if (!["movie", "series"].includes(type) || !id) {
    return res.status(400).json({ error: "Invalid type or id" });
  }

  try {
    const streams = await getStreams(type, id);
    return res.status(200).json({ streams });
  } catch (error) {
    console.error("stream error", error);
    return res.status(200).json({ streams: [] });
  }
}
