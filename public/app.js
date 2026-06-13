const input = document.getElementById("emailInput");
const loader = document.getElementById("loader");
const resultInner = document.getElementById("resultInner");
const resultPills =
	document.getElementById("resultPills") ?? document.getElementById("resultPill")?.parentElement;
const resultError = document.getElementById("resultError");

async function callJson(url, options) {
	const res = await fetch(url, options);
	const data = await res.json();
	if (!res.ok || data.error) throw new Error(data.error || `Request failed: ${res.status}`);
	return data;
}

function registerWebMcpTools() {
	if (!("modelContext" in navigator) || !navigator.modelContext?.registerTool) return;

	const readOnlyHint = true;
	const tools = [
		{
			name: "check_email",
			description:
				"Check one email address for valid TLD, MX deliverability, filtered-DNS blocking, and disposable-domain status.",
			inputSchema: {
				type: "object",
				required: ["email"],
				properties: { email: { type: "string" } },
			},
			execute: ({ email }) => callJson(`/check?email=${encodeURIComponent(email)}`),
			annotations: { readOnlyHint },
		},
		{
			name: "check_domain",
			description:
				"Check one domain for valid TLD, MX deliverability, filtered-DNS blocking, and disposable-domain status.",
			inputSchema: {
				type: "object",
				required: ["domain"],
				properties: { domain: { type: "string" } },
			},
			execute: ({ domain }) => callJson(`/check?domain=${encodeURIComponent(domain)}`),
			annotations: { readOnlyHint },
		},
		{
			name: "get_stats",
			description: "Return bloom-filter metadata.",
			inputSchema: { type: "object", properties: {} },
			execute: () => callJson("/stats"),
			annotations: { readOnlyHint },
		},
	];

	for (const tool of tools) navigator.modelContext.registerTool(tool);
}

registerWebMcpTools();

// Prefix API doc URLs with the current origin
const origin = location.origin;
document.getElementById("apiEmail").textContent = origin + "/check?email=user@mailinator.com";
document.getElementById("apiDomain").textContent = origin + "/check?domain=example.com";
document.getElementById("apiBatch").textContent = origin + "/check";

function showLoading() {
	loader.classList.add("active");
	resultInner.classList.remove("visible");
	resultError.textContent = "";
}

function hideLoading() {
	loader.classList.remove("active");
}

function showError(msg) {
	hideLoading();
	resultInner.classList.remove("visible");
	resultError.textContent = msg;
}

function createPill(label, cls) {
	const pill = document.createElement("div");
	pill.className = "result-pill " + cls;

	const dot = document.createElement("span");
	dot.className = "result-pill-dot";

	const text = document.createElement("span");
	text.className = "result-verdict";
	text.textContent = label;

	pill.append(dot, text);
	return pill;
}

function dnsBlockedLabel(data) {
	if (data.dns_blocked_category === "family") return "Blocked: Family";
	if (data.dns_blocked_category === "malware") return "Blocked: Malware";
	return "DNS Blocked";
}

function showResult(data) {
	hideLoading();
	resultError.textContent = "";
	resultPills.replaceChildren();

	if (!data.should_reject) {
		resultPills.append(createPill("Accept", "clean"));
	} else {
		resultPills.append(createPill("Reject", "disposable"));

		if (!data.valid_tld) resultPills.append(createPill("Invalid TLD", "disposable"));
		if (data.valid_tld && !data.has_mx) resultPills.append(createPill("No MX", "disposable"));
		if (data.disposable) resultPills.append(createPill("Disposable", "disposable"));
		if (data.dns_blocked) resultPills.append(createPill(dnsBlockedLabel(data), "disposable"));
	}

	// Trigger reflow for animation restart
	resultInner.classList.remove("visible");
	void resultInner.offsetWidth;
	resultInner.classList.add("visible");
}

async function check(email) {
	email = email.trim();
	if (!email) return;

	showLoading();

	try {
		const res = await fetch("/check?email=" + encodeURIComponent(email));
		const data = await res.json();

		if (data.error) {
			showError(data.error);
			return;
		}

		showResult(data);
	} catch {
		showError("could not reach the server");
	}
}

input.addEventListener("keydown", (e) => {
	if (e.key === "Enter") {
		e.preventDefault();
		check(input.value);
	}
});

input.addEventListener("paste", () => {
	// Check after paste content is inserted
	setTimeout(() => check(input.value), 50);
});

// "try it" links
for (const el of document.querySelectorAll(".api-try")) {
	el.addEventListener("click", async () => {
		const url = el.dataset.url;
		if (!url) return;
		const email = new URL(url, location.origin).searchParams.get("email") || "";
		if (email) {
			input.value = email;
			check(email);
		}
	});
}

// Re-focus input on click, but not when selecting text in the API panel
const apiPanel = document.getElementById("apiPanel");
document.addEventListener("mousedown", (e) => {
	if (apiPanel.contains(e.target)) return;
	if (e.target.tagName === "A") return;
	if (e.target === input) return;
	input.focus();
});
