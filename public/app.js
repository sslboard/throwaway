const input = document.getElementById("emailInput");
const loader = document.getElementById("loader");
const resultInner = document.getElementById("resultInner");
const resultPill = document.getElementById("resultPill");
const resultVerdict = document.getElementById("resultVerdict");
const resultError = document.getElementById("resultError");

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

function showResult(data) {
	hideLoading();
	resultError.textContent = "";

	let cls, verdict;
	if (!data.valid_tld) {
		cls = "invalid";
		verdict = "invalid";
	} else if (data.disposable) {
		cls = "disposable";
		verdict = "disposable";
	} else if (!data.has_mx) {
		cls = "invalid";
		verdict = "no MX records";
	} else {
		cls = "clean";
		verdict = "legitimate";
	}

	resultPill.className = "result-pill " + cls;
	resultVerdict.textContent = verdict;

	const resultDetail = document.getElementById("resultDetail");
	resultDetail.textContent = "";

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
