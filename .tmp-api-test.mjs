import { toJSONAsync } from "seroval";

const base = "http://localhost:3000";
let cookie = "";

const ids = {
	getProducts:
		"eyJmaWxlIjoiL3NyYy9saWIvc2VydmVyL3Byb2R1Y3RzLnRzP3Rzcy1zZXJ2ZXJmbi1zcGxpdCIsImV4cG9ydCI6ImdldFByb2R1Y3RzX2NyZWF0ZVNlcnZlckZuX2hhbmRsZXIifQ",
	createProduct:
		"eyJmaWxlIjoiL3NyYy9saWIvc2VydmVyL3Byb2R1Y3RzLnRzP3Rzcy1zZXJ2ZXJmbi1zcGxpdCIsImV4cG9ydCI6ImNyZWF0ZVByb2R1Y3RfY3JlYXRlU2VydmVyRm5faGFuZGxlciJ9",
	updateProduct:
		"eyJmaWxlIjoiL3NyYy9saWIvc2VydmVyL3Byb2R1Y3RzLnRzP3Rzcy1zZXJ2ZXJmbi1zcGxpdCIsImV4cG9ydCI6InVwZGF0ZVByb2R1Y3RfY3JlYXRlU2VydmVyRm5faGFuZGxlciJ9",
};

async function signIn() {
	const res = await fetch(`${base}/api/auth/sign-in/email`, {
		method: "POST",
		headers: { "content-type": "application/json", origin: base },
		body: JSON.stringify({ email: "admin@example.com", password: "admin12345" }),
	});
	console.log("sign-in status", res.status, await res.text());
	const setCookie = res.headers.getSetCookie?.() ?? [];
	cookie = setCookie.map((c) => c.split(";")[0]).join("; ");
	console.log("cookie", cookie.slice(0, 40), "...");
}

async function call(fnId, method = "POST", data) {
	const headers = {
		"x-tsr-serverFn": "true",
		accept: "application/x-ndjson, application/json",
		origin: base,
		referer: `${base}/products`,
		cookie,
	};
	let body;
	if (method === "POST") {
		if (data !== undefined) {
			headers["content-type"] = "application/json";
			body = JSON.stringify(await toJSONAsync({ data }));
		}
	}
	const res = await fetch(`${base}/_serverFn/${fnId}`, { method, headers, body });
	const text = await res.text();
	console.log(`${method} -> ${res.status}`, text.slice(0, 600));
	return { status: res.status, text };
}

await signIn();
await call(ids.getProducts, "GET");
await call(ids.createProduct, "POST", {
	name: "HTTP Test",
	description: "created over the wire",
	price: 12.5,
	stock: 3,
});
await call(ids.getProducts, "GET");
