import http from "node:http";
import { URL } from "node:url";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { getStreams } from "./providers/index.js";

const PORT = Number(process.env.PORT || 7000);
const HOST = process.env.HOST || "0.0.0.0";
const manifest = JSON.parse(await readFile("./manifest.json", "utf8"));

function send(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(body));
}

function parseStream(pathname) {
  const m = pathname.match(/^\/stream\/(movie|series)\/([^/]+)\.json$/);
  return m ? { type: m[1], id: decodeURIComponent(m[2]) } : null;
}

export function createServer() {
  return http.createServer(async (req, res) => {
    try {
      if (req.method === "OPTIONS") {
        res.writeHead(204, {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "*",
          "Access-Control-Allow-Methods": "GET,OPTIONS"
        });
        return res.end();
      }

      if (req.method !== "GET") return send(res, 405, { error: "Method not allowed" });

      const u = new URL(req.url, "http://" + (req.headers.host || "localhost"));

      if (u.pathname === "/") {
        return send(res, 200, {
          name: manifest.name,
          version: manifest.version,
          status: "ok",
          manifest: "/manifest.json",
          endpoints: ["/manifest.json", "/health", "/stream/movie/:id.json", "/stream/series/:id.json"]
        });
      }

      if (u.pathname === "/health") {
        return send(res, 200, { status: "ok", version: manifest.version });
      }

      if (u.pathname === "/manifest.json") return send(res, 200, manifest);

      const route = parseStream(u.pathname);
      if (route) return send(res, 200, { streams: await getStreams(route.type, route.id) });

      return send(res, 404, { error: "Not found" });
    } catch (error) {
      console.error(error);
      return send(res, 500, { error: "Internal server error" });
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  createServer().listen(PORT, HOST, () => {
    console.log(`Nuvio Stream listening on http://${HOST}:${PORT}`);
  });
}
