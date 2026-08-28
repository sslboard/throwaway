#!/usr/bin/env node
// Builds a full-catalog sweep queue: one entry per adapter, minus excluded hosts.
// Usage: node build-full-queue.mjs [--out /tmp/throwaway-full-queue.json]
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const outIdx = args.indexOf("--out");
const outPath = outIdx !== -1 ? args[outIdx + 1] : "/tmp/throwaway-full-queue.json";
const skillDir = dirname(dirname(fileURLToPath(import.meta.url)));

const slugHost = (host) =>
  String(host || "")
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const servicesMd = readFileSync(join(skillDir, "services.md"), "utf8");
const exclusions = JSON.parse(readFileSync(join(skillDir, "service-exclusions.json"), "utf8"));
const excluded = new Set(Object.keys(exclusions.hosts || {}));

// host -> url from the services.md inventory table
const hostToUrl = new Map();
for (const m of servicesMd.matchAll(/^\| `([^`]+)` \| (\S+) \|/gm)) {
  hostToUrl.set(m[1].toLowerCase(), m[2]);
}

const slugs = readdirSync(join(skillDir, "service-adapters"))
  .filter((f) => f.endsWith(".py"))
  .map((f) => f.slice(0, -3))
  .sort();

const queue = [];
const unmatched = [];
const skippedExcluded = [];
for (const slug of slugs) {
  const entry = [...hostToUrl].find(([host]) => slugHost(host) === slug);
  if (!entry) {
    unmatched.push(slug);
    continue;
  }
  const [host, url] = entry;
  if (excluded.has(host)) {
    skippedExcluded.push(host);
    continue;
  }
  queue.push({
    host,
    url,
    normalized_url: url.replace(/\/$/, ""),
    source_queries: ["full-catalog"],
    status: "queued",
  });
}

writeFileSync(outPath, `${JSON.stringify({ queue, source: "full-catalog" }, null, 2)}\n`);
console.log(`Queued ${queue.length} services -> ${outPath}`);
if (skippedExcluded.length) console.log(`Skipped excluded: ${skippedExcluded.join(", ")}`);
if (unmatched.length) console.log(`No services.md URL for adapters (not queued): ${unmatched.join(", ")}`);
