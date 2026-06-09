#!/usr/bin/env node
import { readFileSync } from "node:fs";

const args = process.argv.slice(2);
let base = "http://localhost:8787";
let file = null;
let json = false;
const rawInputs = [];

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === "--base") {
    base = args[++i];
  } else if (arg === "--file") {
    file = args[++i];
  } else if (arg === "--json") {
    json = true;
  } else if (arg === "--help" || arg === "-h") {
    console.log(`Usage: check-detector.mjs [--base http://localhost:8787] [--file candidates.txt] [--json] [email-or-domain ...]\n\nInputs may be email addresses or domains. The script queries /check on a running throwaway Worker and marks domains with disposable:false as add candidates.`);
    process.exit(0);
  } else {
    rawInputs.push(arg);
  }
}

if (file) {
  rawInputs.push(...readFileSync(file, "utf8").split(/[\s,]+/));
}

if (rawInputs.length === 0 && !process.stdin.isTTY) {
  rawInputs.push(...readFileSync(0, "utf8").split(/[\s,]+/));
}

const normalized = rawInputs
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean)
  .map((value) => value.replace(/^mailto:/, ""));

const emails = [];
const domains = [];
for (const value of normalized) {
  if (value.includes("@")) {
    emails.push(value);
  } else {
    domains.push(value);
  }
}

const unique = (items) => [...new Set(items)];

async function postCheck(body) {
  const res = await fetch(`${base.replace(/\/$/, "")}/check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`POST /check failed: ${res.status} ${res.statusText} ${await res.text()}`);
  }
  const data = await res.json();
  if (!Array.isArray(data.results)) {
    throw new Error(`Unexpected response from /check: ${JSON.stringify(data)}`);
  }
  return data.results;
}

const results = [];
if (emails.length > 0) {
  results.push(...(await postCheck({ emails: unique(emails) })).map((r) => ({ input_type: "email", input: r.email, ...r })));
}
if (domains.length > 0) {
  results.push(...(await postCheck({ domains: unique(domains) })).map((r) => ({ input_type: "domain", input: r.domain, ...r })));
}

for (const result of results) {
  result.action = result.disposable
    ? "covered"
    : result.valid_tld
      ? "add-to-supplemental"
      : "invalid-tld-review";
}

const missedDomains = unique(
  results
    .filter((r) => r.action === "add-to-supplemental")
    .map((r) => r.domain)
    .filter(Boolean),
);

if (json) {
  console.log(JSON.stringify({ base, results, missedDomains }, null, 2));
} else {
  console.log(`Checked ${results.length} candidate(s) against ${base}`);
  console.log("");
  console.log("| Input | Domain | Disposable | Valid TLD | Has MX | Action |");
  console.log("|---|---|---:|---:|---:|---|");
  for (const r of results) {
    console.log(`| ${r.input} | ${r.domain ?? ""} | ${r.disposable} | ${r.valid_tld} | ${r.has_mx} | ${r.action} |`);
  }
  console.log("");
  console.log("Missed domains to verify and append:");
  if (missedDomains.length === 0) {
    console.log("(none)");
  } else {
    for (const domain of missedDomains) console.log(domain);
  }
}
