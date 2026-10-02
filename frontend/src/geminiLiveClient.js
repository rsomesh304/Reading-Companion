import { GoogleGenAI } from "@google/genai";

const WATCH_LOUD_MS = 9000;      // reader has spoken this long with no server message
const WATCH_SILENT_MS = 18000;   // and the server has been completely silent this long
const WATCH_COOLDOWN_MS = 90000; // never reconnect from the watchdog more than once per minute and a half
const STABLE_MS = 30000;         // a session this old counts as healthy: retries reset

function getDeviceDate() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function errorDetails(error) {
  let serialized = "";
  try { serialized = JSON.stringify(error); } catch { /* not serializable */ }
  return `${error?.message || ""} ${error?.status || ""} ${error?.code || ""} ${error?.error?.message || ""} ${error?.error?.status || ""} ${error?.error?.code || ""} ${serialized}`;
}

function isQuotaError(error) {
  const details = errorDetails(error);
  return /429|RESOURCE_EXHAUSTED|quota|rate limit|exceeded your current quota/i.test(details);
}

function isModelUnavailable(error) {
  const details = errorDetails(error);
  return Number(error?.status ?? error?.code ?? error?.error?.code) === 503 || /503|UNAVAILABLE|high demand|overloaded/i.test(details);
}

export class GeminiLiveClient {
  constructor({ modelName, fallbackModelName, config, handlers }) {
    this.modelName = modelName;
    this.fallbackModelName = fallbackModelName;
    this.baseConfig = config;
    this.handlers = handlers;
    this.session = null;
    this.activeModel = modelName;
    this.resumptionHandle = null;
    this.connectionRetries = 0;
    this.stopped = false;
    this.goAwayTimer = null;
    this.setupTimer = null;
    this.setupDone = false;
    this.ready = false;
    this.hasOpenedOnce = false;
    this.audioBacklog = [];
    this.gen = 0;
    this.reconnecting = false;
    this.failCount = 0;
    this.upSince = 0;
    this.lastServerAt = 0;
    this.loudMs = 0;
    this.lastLoudAt = 0;
    this.lastWatchAt = 0;
    this.watchTimer = null;
    this.stats = { sent: 0, recv: 0, heard: 0, err: "" };
    this.lastUserTextAt = 0;
    this.lastModelAt = 0;
    this.lastNudgeAt = 0;
    this.nudgeSentAt = 0;
    this.lastReconnectAt = 0;
    this.pendingTool = false;
    this.activeKeyIndex = null;
    this.activeKeyDay = null;
    this.pendingFailedKeyIndex = null;
    this.pendingFailedKeyDay = null;
  }

  async connect(existingHandle = null) {
    this.setupDone = false;
    this.ready = false;
    if (existingHandle) this.resumptionHandle = existingHandle;
    const gen = ++this.gen;
    this.lastServerAt = Date.now();
    this.loudMs = 0;
    this.lastLoudAt = 0;
    this.lastWatchAt = 0;
    if (!this.watchTimer) this.watchTimer = setInterval(() => this._watch(), 3000);

    const config = {
      ...this.baseConfig,
      contextWindowCompression: { slidingWindow: {} },
      sessionResumption: this.resumptionHandle ? { handle: this.resumptionHandle } : {},
    };

    this.handlers.onStatus?.(this.resumptionHandle ? "resuming session" : "starting session");

    let session;
    let connectionError;
    const tokenInfo = await this._mintToken({
      failedKeyIndex: this.pendingFailedKeyIndex,
      failedKeyDay: this.pendingFailedKeyDay,
    });
    this.pendingFailedKeyIndex = null;
    this.pendingFailedKeyDay = null;
    this.activeKeyIndex = tokenInfo.keyIndex;
    this.activeKeyDay = tokenInfo.deviceDay;
    const maxAttempts = Math.max(1, Math.min(tokenInfo.keyCount || 1, 10));
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      if (this.stopped || gen !== this.gen) return;
      const ai = new GoogleGenAI({ apiKey: tokenInfo.token, httpOptions: { apiVersion: "v1alpha" } });
      try {
        session = await ai.live.connect({
          model: this.activeModel,
          config,
          callbacks: {
            onopen: () => {},
            onmessage: (message) => { if (gen === this.gen) this._handleMessage(message); },
            onerror: (e) => {
              if (gen !== this.gen) return;
              console.warn("[LIVE] error", e);
              this._rememberFailedKey(e);
              this._handleTransportError(e);
            },
            onclose: (e) => {
              if (gen !== this.gen) return;
              console.info("[LIVE] closed", e?.code, e?.reason);
              const reason = e?.reason ? ` (${e.code}: ${e.reason})` : "";
              this.handlers.onStatus?.(`connection closed${reason}`);
              this._rememberFailedKey(e);
              if (!this.stopped) this._handleTransportError(e || new Error("connection closed"));
            },
          },
        });
        break;
      } catch (error) {
        connectionError = error;
        if (!isQuotaError(error) || attempt + 1 >= maxAttempts) throw error;
        console.warn(`[LIVE] quota rejected key ${tokenInfo.keyIndex || attempt + 1}/${maxAttempts}; requesting another token`);
        const nextTokenInfo = await this._mintToken({
          failedKeyIndex: tokenInfo.keyIndex,
          failedKeyDay: tokenInfo.deviceDay,
        });
        tokenInfo.token = nextTokenInfo.token;
        tokenInfo.keyIndex = nextTokenInfo.keyIndex;
        tokenInfo.deviceDay = nextTokenInfo.deviceDay;
        this.activeKeyIndex = nextTokenInfo.keyIndex;
        this.activeKeyDay = nextTokenInfo.deviceDay;
      }
    }

    if (!session) throw connectionError || new Error("Gemini Live connection failed");

    if (this.stopped || gen !== this.gen) {
      try { session.close(); } catch { /* already closed */ }
      return;
    }
    this.session = session;
    clearTimeout(this.setupTimer);
    this.setupTimer = setTimeout(() => {
      if (gen === this.gen && !this.setupDone && !this.stopped) {
        this._handleTransportError({ message: "setup timeout" });
      }
    }, 10000);
    this._maybeReady();
    return this.session;
  }

  _maybeReady() {
    if (!this.session || !this.setupDone || this.ready) return;
    this.ready = true;
    this.connectionRetries = 0;
    this.lastReconnectAt = 0;
    this.reconnecting = false;
    this.handlers.onStatus?.("connected");
    const backlog = this.audioBacklog;
    this.audioBacklog = [];
    for (const chunk of backlog) this.sendAudio(chunk);
    if (!this.hasOpenedOnce) {
      this.hasOpenedOnce = true;
      this.handlers.onFirstReady?.();
    }
  }

  _handleMessage(message) {
    this.lastServerAt = Date.now();   // any server message = the link is alive
    const scn = message.serverContent;
    if (message.data || scn?.outputTranscription?.text || scn?.turnComplete || message.toolCall) {
      this.lastModelAt = Date.now();
      this.nudgeSentAt = 0;   // the model responded - cancel any pending escalation
    }
    if (scn?.inputTranscription?.text) this.lastUserTextAt = Date.now();
    if (message.toolCall) this.pendingTool = true;
    this.loudMs = 0;
    if (message.setupComplete) {
      this.setupDone = true;
      this.upSince = Date.now();
      clearTimeout(this.setupTimer);
      this._maybeReady();
    }
    this.stats.recv += 1;
    if (message.serverContent?.inputTranscription?.text) this.stats.heard += 1;
    if (message.sessionResumptionUpdate) {
      const u = message.sessionResumptionUpdate;
      if (u.resumable && u.newHandle) this.resumptionHandle = u.newHandle;
    }
    if (message.goAway) {
      const secondsLeft = Number((message.goAway.timeLeft || "5").replace("s", "")) || 5;
      clearTimeout(this.goAwayTimer);
      this.goAwayTimer = setTimeout(() => this._handleTransportError({ message: "goaway", soft: true }), Math.max(500, (secondsLeft * 1000) / 2));
      return;
    }
    if (message.data) this.handlers.onAudio?.(message.data);
    const sc = message.serverContent;
    if (sc?.outputTranscription?.text) this.handlers.onText?.(sc.outputTranscription.text);
    if (sc?.inputTranscription?.text) this.handlers.onUserText?.(sc.inputTranscription.text);
    if (sc?.interrupted) this.handlers.onInterrupted?.();
    if (message.toolCall) this.handlers.onToolCall?.(message.toolCall);
    if (sc?.turnComplete) this.handlers.onTurnComplete?.();
  }

  // App calls this when the mic is loud. Only used by the watchdog.
  noteSpeech() {
    const now = Date.now();
    if (this.lastLoudAt && now - this.lastLoudAt < 400) this.loudMs += now - this.lastLoudAt;
    this.lastLoudAt = now;
  }

  _rememberFailedKey(error) {
    if (!isQuotaError(error) || !this.activeKeyIndex) return;
    this.pendingFailedKeyIndex = this.activeKeyIndex;
    this.pendingFailedKeyDay = this.activeKeyDay;
  }

  _watch() {
    if (this.stopped || this.reconnecting || !this.ready || !this.session) return;
    const now = Date.now();
    const userRecent = this.lastUserTextAt || this.lastLoudAt || 0;
    const recentSpeech = this.lastLoudAt && now - this.lastLoudAt < WATCH_LOUD_MS;
    const serverSilentFor = now - this.lastServerAt;
    const userIdleFor = now - userRecent;

    if (!this.pendingTool && this.lastUserTextAt > this.lastModelAt) {
      // The reader was heard but the model never replied. Do one nudge, but only after a healthy delay.
      // This avoids reconnect storms when the model is simply processing or a small network hiccup occurs.
      if (now - this.lastUserTextAt > 12000 && now - this.lastNudgeAt > 20000 && !recentSpeech) {
        this.lastNudgeAt = now;
        this.nudgeSentAt = now;
        console.warn("[LIVE] reader was heard but no reply - nudging");
        this.handlers.onStatus?.("thinking…");
        try { this.session?.sendRealtimeInput({ audioStreamEnd: true }); } catch { /* ignore */ }
      }
      if (this.nudgeSentAt && now - this.nudgeSentAt > 15000 && userIdleFor > 15000 && serverSilentFor > WATCH_SILENT_MS) {
        this.nudgeSentAt = 0;
        console.warn("[LIVE] no reply even after nudge - reconnecting");
        this.handlers.onStatus?.("reconnecting (stuck turn)");
        this._handleTransportError({ message: "stuck-turn", soft: true });
        return;
      }
    }

    if (this.loudMs < WATCH_LOUD_MS) return;
    if (serverSilentFor < WATCH_SILENT_MS) return;
    if (userIdleFor < WATCH_LOUD_MS) return;
    if (now - this.lastWatchAt < WATCH_COOLDOWN_MS) return;
    if (this.lastReconnectAt && now - this.lastReconnectAt < WATCH_COOLDOWN_MS) return;

    this.lastWatchAt = now;
    this.loudMs = 0;
    this.lastServerAt = now;
    console.warn("[LIVE] watchdog: reader loud, server completely silent for too long - reconnecting");
    this.handlers.onStatus?.("reconnecting (silent link)");
    this._handleTransportError({ message: "watchdog", soft: true });
  }

  // One reconnect loop at a time. Everything else is dropped while it runs.
  async _handleTransportError(e) {
    if (this.stopped || this.reconnecting) return;
    const now = Date.now();
    if (this.lastReconnectAt && now - this.lastReconnectAt < 2500) return;
    this.lastReconnectAt = now;
    this.reconnecting = true;
    try {
      if (this.upSince && Date.now() - this.upSince > STABLE_MS) this.connectionRetries = 0;
      const message = String(e?.message || e).toLowerCase();
      const unsupportedModel = /not found|not supported for bidi|does not exist|unknown model/.test(message);
      const silentService = /watchdog|stuck-turn/.test(message);
      if (this.activeModel === this.modelName && this.fallbackModelName && (unsupportedModel || isModelUnavailable(e) || silentService)) {
        this.activeModel = this.fallbackModelName;
        this.resumptionHandle = null;
        this.handlers.onStatus?.("switching to backup model");
        await this.close({ keepHandle: true });
        await this.connect();
        return;
      }
      while (!this.stopped && this.connectionRetries < 5) {
        this.connectionRetries += 1;
        if (this.connectionRetries >= 2) this.resumptionHandle = null;   // stale handle: drop it
        this.handlers.onStatus?.(`reconnecting (${this.connectionRetries}/5)`);
        const delay = e?.soft && this.connectionRetries === 1 ? 0 : Math.min(2 ** this.connectionRetries * 1000, 10000);
        if (delay) await new Promise((r) => setTimeout(r, delay));
        if (this.stopped) return;
        try {
          await this.close({ keepHandle: true });
          await this.connect(this.resumptionHandle);
          return;
        } catch (err) {
          console.warn("[LIVE] reconnect failed", err);
        }
      }
      if (!this.stopped) this.handlers.onStatus?.(`error: ${e?.message || e} - tap End and restart`, true);
    } finally {
      this.reconnecting = false;
    }
  }

  async _mintToken({ failedKeyIndex, failedKeyDay } = {}) {
    const deviceDay = getDeviceDate();
    const headers = { "X-Device-Date": deviceDay };
    const requestBody = failedKeyIndex && failedKeyDay === deviceDay
      ? JSON.stringify({ failedKeyIndex, failedKeyDate: failedKeyDay })
      : undefined;
    if (requestBody) headers["Content-Type"] = "application/json";
    const res = await fetch("/api/token", {
      method: "POST",
      headers,
      body: requestBody,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `token_mint_failed (${res.status})`);
    if (!body.token) throw new Error("token_missing_from_backend_response");
    if (typeof body.token !== "string") throw new Error("backend_returned_non_string_token");
    return { token: body.token, keyCount: body.keyCount, keyIndex: body.keyIndex, deviceDay };
  }

  async sendAudio(base64Pcm) {
    if (!this.ready || !this.session) {
      this.audioBacklog.push(base64Pcm);
      if (this.audioBacklog.length > 100) this.audioBacklog.shift();
      return;
    }
    try {
      await this.session.sendRealtimeInput({ audio: { data: base64Pcm, mimeType: "audio/pcm;rate=16000" } });
      this.stats.sent += 1;
      this.failCount = 0;
    } catch (err) {
      this.stats.err = String(err?.message || err).slice(0, 80);
      this.failCount += 1;
      if (this.failCount >= 5 && !this.stopped) { this.failCount = 0; this._handleTransportError(err); }
    }
  }

  async sendVideoFrame(base64Jpeg) {
    if (!this.ready || !this.session) return;
    try { await this.session.sendRealtimeInput({ video: { data: base64Jpeg, mimeType: "image/jpeg" } }); } catch { /* reconnect gap */ }
  }

  async sendText(text) {
    if (!this.ready || !this.session) return;
    try { await this.session.sendRealtimeInput({ text }); } catch { /* reconnect gap */ }
  }

  async sendToolResponse(functionResponses) {
    if (!this.session) return;
    this.pendingTool = false;
    try {
      await this.session.sendToolResponse({ functionResponses });
    } catch (e) {
      console.warn("[LIVE] tool response failed", e);
      this._handleTransportError(e);
    }
  }

  async close({ keepHandle = false } = {}) {
    clearTimeout(this.goAwayTimer);
    clearTimeout(this.setupTimer);
    if (!keepHandle) {
      this.stopped = true;
      clearInterval(this.watchTimer);
      this.watchTimer = null;
    }
    this.gen += 1;
    this.ready = false;
    this.setupDone = false;
    try { this.session?.close(); } catch { /* already closed */ }
    this.session = null;
  }
}