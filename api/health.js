export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ status: "ok", service: "nuvio-stream", version: "0.4.0" });
}
