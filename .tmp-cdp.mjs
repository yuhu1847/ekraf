const BASE = "http://localhost:3000";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function newTarget(url) {
	const res = await fetch(`http://127.0.0.1:9222/json/new?${encodeURIComponent(url)}`, {
		method: "PUT",
	});
	return res.json();
}

async function connect(wsUrl) {
	const ws = new WebSocket(wsUrl);
	await new Promise((resolve, reject) => {
		ws.onopen = resolve;
		ws.onerror = reject;
	});
	let nextId = 0;
	const pending = new Map();
	const logs = [];
	ws.onmessage = (event) => {
		const msg = JSON.parse(event.data);
		if (msg.id) {
			const p = pending.get(msg.id);
			if (p) {
				pending.delete(msg.id);
				if (msg.error) p.reject(new Error(JSON.stringify(msg.error)));
				else p.resolve(msg.result);
			}
			return;
		}
		if (msg.method === "Runtime.exceptionThrown") {
			logs.push(`EXCEPTION: ${msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text}`);
		}
		if (msg.method === "Runtime.consoleAPICalled" && ["error", "warning"].includes(msg.params.type)) {
			logs.push(`CONSOLE ${msg.params.type}: ${msg.params.args.map((a) => a.value ?? a.description ?? a.type).join(" ")}`);
		}
	};
	const send = (method, params = {}) =>
		new Promise((resolve, reject) => {
			const id = ++nextId;
			pending.set(id, { resolve, reject });
			ws.send(JSON.stringify({ id, method, params }));
		});
	return { send, logs, ws };
}

async function evalJS(send, expression) {
	const res = await send("Runtime.evaluate", {
		expression,
		awaitPromise: true,
		returnByValue: true,
		userGesture: true,
	});
	if (res.exceptionDetails) {
		throw new Error(res.exceptionDetails.exception?.description ?? res.exceptionDetails.text);
	}
	return res.result.value;
}

const target = await newTarget("about:blank");
const { send, logs } = await connect(target.webSocketDebuggerUrl);
await send("Runtime.enable");
await send("Page.enable");

async function goto(url) {
	await send("Page.navigate", { url });
	// wait for app to render
	for (let i = 0; i < 60; i++) {
		await sleep(500);
		try {
			const ready = await evalJS(send, `document.readyState === "complete" && !!document.body && document.body.innerText.length > 0`);
			if (ready) break;
		} catch {}
	}
	await sleep(1000);
}

async function bodyText() {
	return evalJS(send, "document.body.innerText");
}

await goto(`${BASE}/demo/better-auth`);
console.log("--- sign in page ---");
console.log("inputs:", await evalJS(send, "document.querySelectorAll('input').length"));
for (let i = 0; i < 30; i++) {
	const has = await evalJS(send, `!!document.querySelector("#email")`);
	if (has) break;
	await sleep(500);
}
console.log("inputs after wait:", await evalJS(send, "document.querySelectorAll('input').length"));

const signIn = await evalJS(
	send,
	`(() => {
		const setVal = (el, v) => {
			const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
			setter.call(el, v);
			el.dispatchEvent(new Event("input", { bubbles: true }));
		};
		const email = document.querySelector("#email");
		const password = document.querySelector("#password");
		if (!email || !password) return "inputs-not-found";
		setVal(email, "admin@example.com");
		setVal(password, "admin12345");
		const form = email.closest("form");
		const btn = form.querySelector('button[type="submit"]');
		if (!btn) return "button-not-found";
		btn.click();
		return "clicked";
	})()`,
);
console.log("sign-in attempt:", signIn);
await sleep(4000);
console.log("signed in url:", await evalJS(send, "location.pathname"));
console.log((await bodyText()).slice(0, 300));

await goto(`${BASE}/products/new`);
console.log("--- new product page ---");
console.log((await bodyText()).slice(0, 500));

const addResult = await evalJS(
	send,
	`(() => {
		const setVal = (el, v) => {
			const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
			setter.call(el, v);
			el.dispatchEvent(new Event("input", { bubbles: true }));
		};
		const name = document.querySelector("#name");
		if (!name) return "name-input-missing";
		setVal(name, "Browser Test");
		setVal(document.querySelector("#description"), "typed in a browser");
		setVal(document.querySelector("#price"), "99");
		setVal(document.querySelector("#stock"), "7");
		const form = name.closest("form");
		form.querySelector('button[type="submit"]').click();
		return "submitted";
	})()`,
);
console.log("add attempt:", addResult);
await sleep(4000);
console.log("after add url:", await evalJS(send, "location.pathname"));
console.log((await bodyText()).slice(0, 700));

console.log("--- logs ---");
console.log(logs.join("\n").slice(0, 3000));

// ---- edit flow ----
logs.length = 0;
const editHref = await evalJS(
	send,
	`document.querySelector('table tbody tr a[href^="/products/"]')?.getAttribute("href") ?? null`,
);
console.log("edit href:", editHref);
if (editHref) {
	await goto(`${BASE}${editHref}`);
	console.log("--- edit page ---");
	console.log((await bodyText()).slice(0, 800));
	console.log("inputs:", await evalJS(send, "document.querySelectorAll('input').length"));
	console.log("--- edit logs ---");
	console.log(logs.join("\n").slice(0, 3000));
}
process.exit(0);
