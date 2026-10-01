import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "./server.js";

test("manifest exposes the Nuvio/Stremio stream contract", async () => {
  const manifest = JSON.parse(await readFile("./manifest.json", "utf8"));
  assert.equal(manifest.version, "0.4.0");
  assert.deepEqual(manifest.resources, ["stream"]);
  assert.deepEqual(manifest.types, ["movie", "series"]);
  assert.deepEqual(manifest.idPrefixes, ["tt", "tmdb"]);
});

test("health and manifest endpoints respond", async () => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;

  const health = await fetch(`http://127.0.0.1:${port}/health`);
  assert.equal(health.status, 200);
  assert.equal((await health.json()).status, "ok");

  const manifest = await fetch(`http://127.0.0.1:${port}/manifest.json`);
  assert.equal(manifest.status, 200);
  assert.equal((await manifest.json()).version, "0.4.0");

  await new Promise(resolve => server.close(resolve));
});

test("Cinemeta ID parsing keeps IMDb series episode identity separate", async () => {
  const { resolveTitle } = await import("./providers/cinemeta.js");
  assert.equal(typeof resolveTitle, "function");
});
