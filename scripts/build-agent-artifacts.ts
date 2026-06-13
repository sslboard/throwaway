import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
	AGENT_CARD,
	AGENT_SKILLS,
	API_CATALOG,
	MCP_SERVER_CARD,
	OPENAPI,
	WEBMCP_MANIFEST,
	jsonArtifact,
} from "../src/agent-artifacts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, "../public");
const wellKnownDir = resolve(publicDir, ".well-known");

const files = [
	["openapi.json", OPENAPI],
	["api-catalog.json", API_CATALOG],
	[".well-known/mcp-server.json", MCP_SERVER_CARD],
	[".well-known/webmcp", WEBMCP_MANIFEST],
	[".well-known/agent-skills.json", AGENT_SKILLS],
	[".well-known/agent-card.json", AGENT_CARD],
] as const;

mkdirSync(wellKnownDir, { recursive: true });

for (const [path, artifact] of files) {
	writeFileSync(resolve(publicDir, path), `${jsonArtifact(artifact)}\n`);
	console.log(`Wrote public/${path}`);
}
