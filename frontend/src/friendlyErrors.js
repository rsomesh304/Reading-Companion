const HIDDEN = /^(connected|thinking|saying goodnight|session ending|checking in)/i;

export function classifyLiveFailure(error) {
	const message = String(error?.message || error?.reason || error || "").toLowerCase();
	const code = Number(error?.status ?? error?.code ?? error?.error?.code ?? 0);
	if (error?.code === "key_rotated" || /key_rotated|resumption.*(?:reject|invalid)|api.?key.*(?:invalid|changed|rotat|revok)|(?:401|403)\b/.test(message) || [1007, 1008].includes(code)) return "key_rotated";
	if (code === 429 || /429|quota|resource_exhausted|rate.?limit|all_keys_unavailable/.test(message)) return "quota";
	if (/failed to fetch|networkerror|network request|load failed|offline|socket hang up|econnreset/.test(message)) return "network";
	if (code === 503 || /service unavailable|server_error|token_mint_failed/.test(message)) return "server_error";
	return "unknown";
}

export function userNoticeForFailure(kind) {
	if (kind === "key_rotated") return {
		level: "error", code: "key_rotated", title: "Update aa gaya",
		message: "Purana voice connection ab kaam nahi karega. Session band karke dobara shuru kijiye.",
	};
	if (kind === "quota") return {
		level: "error", code: "quota_exceeded", title: "Voice service abhi busy hai",
		message: "Naya reading session shuru karne se pehle thoda rukna padega. Yeh session dobara connect nahi ho pa raha.",
	};
	if (kind === "server_error") return {
		level: "error", code: "voice_server_error", title: "Voice service abhi nahi mil rahi",
		message: "Voice service wapas aane par session dobara shuru kijiye.",
	};
	return {
		level: "info", code: "network_reconnect", title: "Network connection ruk gaya",
		message: "Internet wapas aate hi dobara connect karne ki koshish karunga.",
	};
}

export function describeLiveStatus(status) {
	const text = String(status || "").trim();
	if (!text || HIDDEN.test(text)) return null;
	if (/key.rotated|restart.session|required|quota exhausted|voice server unavailable/i.test(text)) return null;
	if (/switching to another key/i.test(text)) return { kind: "checking", code: "key_switch", title: "Awaaz ka connection badal raha hai", detail: "Ek aur connection try kar raha hoon." };
	if (/quota|all_keys_unavailable|too many requests/i.test(text)) return { kind: "error", code: "quota", title: "Voice service abhi busy hai", detail: "Thodi der baad naya session shuru kijiye." };
	if (/server error|server unavailable/i.test(text)) return { kind: "error", code: "server", title: "Voice service abhi nahi mil rahi", detail: "Thodi der ruk kar session dobara shuru kijiye." };
	if (/mic error/i.test(text)) return { kind: "error", code: "mic", title: "Microphone nahi mil raha", detail: "Phone settings mein mic permission allow karke dobara try kijiye." };
	if (/camera error/i.test(text)) return { kind: "error", code: "camera", title: "Camera shuru nahi ho paya", detail: "Camera permission check kijiye, ya page ka snapshot bhejiye." };
	if (/backup model/i.test(text)) return { kind: "checking", code: "model", title: "Voice model busy hai", detail: "Doosra voice model check kar raha hoon." };
	if (/another key/i.test(text)) return { kind: "checking", code: "capacity", title: "Awaaz ka connection badal raha hai", detail: "Ek aur connection try kar raha hoon." };
	if (/reconnect|resum|connection ended/i.test(text)) return { kind: "checking", code: "reconnecting", title: "Connection wapas jod raha hoon", detail: "Thoda ruk kar jawab aa raha hai." };
	if (/connecting|starting/i.test(text)) return { kind: "checking", code: "connecting", title: "Companion ko jaga raha hoon", detail: "Voice service check ho rahi hai." };
	if (/error:|connection problem|tap end/i.test(text)) return { kind: "error", code: "connection", title: "Connection nahi ban paaya", detail: "Internet check kijiye, phir session dobara shuru karein." };
	return null;
}

export function friendlyErrorMessage(error, fallback = "Kuch gadbad ho gayi. Thodi der baad dobara try kijiye.") {
	const message = String(error?.message || error || "").toLowerCase();
	if (/key_rotated/.test(message)) return "Update hua hai. Reading session ek baar band karke dobara shuru kijiye.";
	if (/failed to fetch|networkerror|network request|load failed|offline|timeout|timed out|abort/.test(message)) return "Internet connection kamzor lag raha hai. Check karke dobara try kijiye.";
	if (/429|quota|exhausted|rate.?limit|too many|all_keys_unavailable/.test(message)) return "Voice service abhi busy hai. Thodi der baad naya session shuru kijiye.";
	if (/502|503|504|bad gateway|unavailable|server/.test(message)) return "Server abhi jaag raha hai. Ek-do minute baad dobara try kijiye.";
	if (/notallowed|permission|denied/.test(message)) return "Permission nahi mili. Settings mein allow karke dobara try kijiye.";
	if (/notfound|devicesnotfound|no.*(camera|microphone)/.test(message)) return "Is device par camera ya mic nahi mila.";
	return fallback;
}
