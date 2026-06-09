#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";

const [hostArg, reasonArg, ...evidenceParts] = process.argv.slice(2);
if (!hostArg || !reasonArg) {
  console.error("Usage: add-service-exclusion.mjs <host> <reason> [evidence]");
  process.exit(1);
}

const host = hostArg.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
const file = ".pi/skills/weekly-temp-email-domain-checker/service-exclusions.json";
const data = JSON.parse(readFileSync(file, "utf8"));
data.version ??= 1;
data.hosts ??= {};
data.hosts[host] = {
  reason: reasonArg,
  evidence: evidenceParts.join(" ").trim(),
  added: new Date().toISOString().slice(0, 10),
};
writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Excluded ${host}: ${reasonArg}`);
