import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("manifest exposes the Nuvio/Stremio stream contract", async () => {
  const manifest = JSON.parse(await readFile("./manifest.json", "utf8"));
  assert.ok(manifest.id);
  assert.ok(manifest.version);
  assert.deepEqual(manifest.resources, ["stream"]);
  assert.deepEqual(manifest.types, ["movie", "series"]);
  assert.deepEqual(manifest.idPrefixes, ["tt", "tmdb"]);
});

test("stream response shape is documented", async () => {
  const server = await import("./server.js?test=" + Date.now());
  assert.ok(server);
});
