#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
let queuePath = "/tmp/throwaway-serp-services.json";
let outPath = "/tmp/throwaway-adapter-results.json";
let resultsDir = "/tmp/throwaway-adapter-results";
let adaptersDir = ".pi/skills/weekly-temp-email-domain-checker/service-adapters";
let maxServices = Infinity;
let browserHarnessBin = "browser-harness";

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === "--queue") {
    queuePath = args[++i];
  } else if (arg === "--out") {
    outPath = args[++i];
  } else if (arg === "--results-dir") {
    resultsDir = args[++i];
  } else if (arg === "--adapters-dir") {
    adaptersDir = args[++i];
  } else if (arg === "--max") {
    maxServices = Number(args[++i]);
  } else if (arg === "--browser-harness") {
    browserHarnessBin = args[++i];
  } else if (arg === "--help" || arg === "-h") {
    console.log(`Usage: run-service-adapters.mjs [options]\n\nRuns deterministic browser-harness service adapters for each queued service host exactly once.\n\nOptions:\n  --queue PATH             SERP queue JSON path (default: /tmp/throwaway-serp-services.json)\n  --out PATH               Combined output JSON path (default: /tmp/throwaway-adapter-results.json)\n  --results-dir DIR        Per-service JSON output dir (default: /tmp/throwaway-adapter-results)\n  --adapters-dir DIR       Adapter directory (default: .pi/skills/weekly-temp-email-domain-checker/service-adapters)\n  --max N                  Limit queued services processed\n  --browser-harness BIN    browser-harness executable (default: browser-harness)`);
    process.exit(0);
  } else {
    console.error(`Unknown argument: ${arg}`);
    process.exit(1);
  }
}

function slugHost(host) {
  return String(host || "")
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseAdapterJson(stdout) {
  const text = String(stdout || "").trim();
  if (!text) throw new Error("adapter produced no stdout");

  try {
    return JSON.parse(text);
  } catch (_) {
    // browser-harness or site scripts may print incidental text. Adapters are
    // required to print one JSON object, so recover the outermost object.
    const first = text.indexOf("{");
    const last = text.lastIndexOf("}");
    if (first === -1 || last === -1 || last <= first) {
      throw new Error(`could not find JSON object in stdout: ${text.slice(0, 500)}`);
    }
    return JSON.parse(text.slice(first, last + 1));
  }
}

const queuePayload = JSON.parse(readFileSync(queuePath, "utf8"));
const queue = (queuePayload.queue || []).filter((item) => item.status === undefined || item.status === "queued");
mkdirSync(resultsDir, { recursive: true });

const seenHosts = new Set();
const results = [];

for (const item of queue) {
  if (results.length >= maxServices) break;

  const url = item.url || item.normalized_url;
  const host = String(item.host || slugHost(url)).toLowerCase().replace(/^www\./, "");
  if (!url || !host || seenHosts.has(host)) continue;
  seenHosts.add(host);

  const slug = slugHost(host);
  const adapterPath = join(adaptersDir, `${slug}.py`);
  const perServiceOut = join(resultsDir, `${slug}.json`);
  const record = {
    host,
    slug,
    url,
    normalized_url: item.normalized_url,
    source_queries: item.source_queries || [],
    adapter: adapterPath,
    output: perServiceOut,
    status: "started",
  };

  let adapterSource;
  try {
    adapterSource = readFileSync(adapterPath, "utf8");
  } catch (error) {
    record.status = "missing-adapter";
    record.error = error.message;
    writeFileSync(perServiceOut, `${JSON.stringify(record, null, 2)}\n`);
    results.push(record);
    continue;
  }

  const started = Date.now();
  const child = spawnSync(browserHarnessBin, [], {
    input: adapterSource,
    encoding: "utf8",
    env: { ...process.env, SERVICE_URL: url },
    maxBuffer: 20 * 1024 * 1024,
  });
  record.elapsed_ms = Date.now() - started;
  record.exit_code = child.status;
  record.signal = child.signal;

  if (child.error) {
    record.status = "runner-failed";
    record.error = child.error.message;
    record.stderr = child.stderr || "";
  } else if (child.status !== 0) {
    record.status = "adapter-process-failed";
    record.stdout = child.stdout || "";
    record.stderr = child.stderr || "";
  } else {
    try {
      record.status = "completed";
      record.result = parseAdapterJson(child.stdout);
      record.adapter_status = record.result.status;
      record.stderr = child.stderr || "";
    } catch (error) {
      record.status = "adapter-json-parse-failed";
      record.error = error.message;
      record.stdout = child.stdout || "";
      record.stderr = child.stderr || "";
    }
  }

  writeFileSync(perServiceOut, `${JSON.stringify(record, null, 2)}\n`);
  results.push(record);
}

const okResults = results.filter((r) => r.result?.status === "ok");
const domainsFromEmails = [...new Set(okResults.flatMap((r) => r.result.domains_from_emails || []).map((d) => String(d).toLowerCase()).filter(Boolean))].sort();
const emails = [...new Set(okResults.flatMap((r) => r.result.emails || []).map((e) => String(e).toLowerCase()).filter(Boolean))].sort();

const out = {
  queue_path: queuePath,
  adapters_dir: adaptersDir,
  results_dir: resultsDir,
  results,
  emails,
  candidate_domains_from_emails: domainsFromEmails,
  counts: {
    queued_services: queue.length,
    services_attempted: results.length,
    completed: results.filter((r) => r.status === "completed").length,
    missing_adapters: results.filter((r) => r.status === "missing-adapter").length,
    adapter_ok: results.filter((r) => r.result?.status === "ok").length,
    adapter_blocked: results.filter((r) => ["blocked", "captcha", "auth-required", "rate-limited"].includes(r.result?.status)).length,
    adapter_failed: results.filter((r) => ["failed", "needs-implementation"].includes(r.result?.status)).length,
    candidate_domains_from_emails: domainsFromEmails.length,
  },
};

writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`);
console.log(JSON.stringify({ out: outPath, results_dir: resultsDir, counts: out.counts, candidate_domains_from_emails: domainsFromEmails }, null, 2));
