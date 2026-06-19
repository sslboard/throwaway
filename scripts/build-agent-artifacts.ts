import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
	AGENT_CARD,
	AGENT_SKILL_MD,
	AGENT_SKILLS,
	API_CATALOG,
	API_CATALOG_LINKSET,
	MCP_SERVER_CARD,
	WEBMCP_MANIFEST,
	agentSkillsIndex,
	jsonArtifact,
} from "../src/agent-artifacts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, "../public");
const wellKnownDir = resolve(publicDir, ".well-known");
const agentSkillsDir = resolve(wellKnownDir, "agent-skills/throwaway-email-validation");
const mcpDir = resolve(wellKnownDir, "mcp");
const skillSha256 = createHash("sha256").update(AGENT_SKILL_MD).digest("hex");

const files = [
	["api-catalog.json", API_CATALOG],
	[".well-known/api-catalog", API_CATALOG_LINKSET],
	[".well-known/mcp-server.json", MCP_SERVER_CARD],
	[".well-known/mcp/server-card.json", MCP_SERVER_CARD],
	[".well-known/webmcp", WEBMCP_MANIFEST],
	[".well-known/agent-skills.json", AGENT_SKILLS],
	[".well-known/agent-skills/index.json", agentSkillsIndex(skillSha256)],
	[".well-known/agent-card.json", AGENT_CARD],
] as const;

mkdirSync(wellKnownDir, { recursive: true });
mkdirSync(agentSkillsDir, { recursive: true });
mkdirSync(mcpDir, { recursive: true });

for (const [path, artifact] of files) {
	writeFileSync(resolve(publicDir, path), `${jsonArtifact(artifact)}\n`);
	console.log(`Wrote public/${path}`);
}

writeFileSync(resolve(agentSkillsDir, "SKILL.md"), AGENT_SKILL_MD);
console.log("Wrote public/.well-known/agent-skills/throwaway-email-validation/SKILL.md");
