import { randomUUID } from "node:crypto";
import { classifyGeminiFailure } from "../shared/geminiFailure.mjs";

const DEFAULT_LEASE_TTL_MS = 35 * 60 * 1000;
const DEFAULT_MAX_SESSIONS_PER_KEY = 3;

function partsInTimeZone(timestamp, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(timestamp));
  return Object.fromEntries(parts.map(({ type, value }) => [type, Number(value)]));
}

export function nextQuotaResetAt(now = Date.now(), timeZone = "America/Los_Angeles") {
  let zone = timeZone;
  try { new Intl.DateTimeFormat("en-US", { timeZone: zone }); } catch { zone = "America/Los_Angeles"; }
  const local = partsInTimeZone(now, zone);
  const nextDate = new Date(Date.UTC(local.year, local.month - 1, local.day + 1));
  const target = Date.UTC(nextDate.getUTCFullYear(), nextDate.getUTCMonth(), nextDate.getUTCDate());
  let estimate = target;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const actual = partsInTimeZone(estimate, zone);
    const represented = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, actual.second);
    const adjustment = target - represented;
    estimate += adjustment;
    if (adjustment === 0) break;
  }
  return estimate;
}

function makeKeyState(index) {
  return {
    index,
    state: "healthy",
    cooldownUntil: 0,
    consecutiveFailures: 0,
    activeLeases: 0,
    lastUsedAt: 0,
    successes: 0,
    failures: { rate_limit_minute: 0, quota_daily: 0, auth_permission_billing: 0, transient: 0, silent: 0 },
  };
}

// In-memory by design; deployment currently assumes one Render instance. Move this interface to shared storage before horizontal scaling.
export class KeyPool {
  constructor(keyCount, {
    now = Date.now,
    random = Math.random,
    makeId = randomUUID,
    maxSessionsPerKey = DEFAULT_MAX_SESSIONS_PER_KEY,
    quotaResetTz = "America/Los_Angeles",
    leaseTtlMs = DEFAULT_LEASE_TTL_MS,
    waitTimeoutMs = 5000,
    onChange = () => {},
  } = {}) {
    this.now = now;
    this.random = random;
    this.makeId = makeId;
    this.maxSessionsPerKey = Math.max(1, Number(maxSessionsPerKey) || DEFAULT_MAX_SESSIONS_PER_KEY);
    this.quotaResetTz = quotaResetTz || "America/Los_Angeles";
    this.leaseTtlMs = leaseTtlMs;
    this.waitTimeoutMs = waitTimeoutMs;
    this.onChange = onChange;
    this.keys = Array.from({ length: Math.max(0, Number(keyCount) || 0) }, (_, index) => makeKeyState(index));
    this.leases = new Map();
    this.logicalClock = 0;
    this.expiryTimer = setInterval(() => this.expireLeases(), Math.min(60_000, this.leaseTtlMs));
    this.expiryTimer.unref?.();
  }

  _emit(type, key, detail = {}) {
    this.onChange({ type, index: key ? key.index + 1 : null, state: key?.state || null, ...detail });
  }

  _refreshState(key) {
    if (key.cooldownUntil && key.cooldownUntil <= this.now()) {
      const prior = key.state;
      key.cooldownUntil = 0;
      key.state = "healthy";
      if (prior !== "healthy") this._emit("state_change", key, { from: prior, to: "healthy", reason: "cooldown_expired" });
    }
  }

  _availableKeys({ enforceCap = true, exclude = [] } = {}) {
    const candidates = [];
    const excluded = new Set(exclude.map(Number));
    for (const key of this.keys) {
      this._refreshState(key);
      if (excluded.has(key.index)) continue;
      if (key.state !== "healthy") continue;
      if (enforceCap && key.activeLeases >= this.maxSessionsPerKey) continue;
      candidates.push(key);
    }
    return candidates.sort((left, right) => left.activeLeases - right.activeLeases || left.lastUsedAt - right.lastUsedAt || left.index - right.index);
  }

  _touch(key) {
    this.logicalClock = Math.max(this.now(), this.logicalClock + 1);
    key.lastUsedAt = this.logicalClock;
  }

  selectKey({ exclude = [] } = {}) {
    const key = this._availableKeys({ enforceCap: false, exclude })[0];
    if (!key) return null;
    this._touch(key);
    return key.index;
  }

  async acquireLease({ timeoutMs = this.waitTimeoutMs, exclude = [] } = {}) {
    const deadline = this.now() + Math.max(0, timeoutMs);
    while (true) {
      this.expireLeases();
      const key = this._availableKeys({ exclude })[0];
      if (key) {
        const lease = { leaseId: this.makeId(), keyIndex: key.index, expiresAt: this.now() + this.leaseTtlMs, leaseTtlSec: Math.ceil(this.leaseTtlMs / 1000) };
        key.activeLeases += 1;
        this._touch(key);
        this.leases.set(lease.leaseId, lease);
        this._emit("lease_acquired", key, { activeLeases: key.activeLeases });
        return { ...lease };
      }
      const remaining = deadline - this.now();
      if (remaining <= 0) return { unavailable: true, retryAfterSec: this.retryAfterSec() };
      await new Promise((resolve) => setTimeout(resolve, Math.min(remaining, 100)));
    }
  }

  releaseLease(leaseId) {
    const lease = this.leases.get(String(leaseId || ""));
    if (!lease) return false;
    this.leases.delete(lease.leaseId);
    const key = this.keys[lease.keyIndex];
    if (key) {
      key.activeLeases = Math.max(0, key.activeLeases - 1);
      this._emit("lease_released", key, { activeLeases: key.activeLeases });
    }
    return true;
  }

  getLease(leaseId) {
    this.expireLeases();
    const lease = this.leases.get(String(leaseId || ""));
    return lease ? { ...lease } : null;
  }

  expireLeases() {
    const now = this.now();
    for (const [leaseId, lease] of this.leases) {
      if (lease.expiresAt <= now) {
        this.releaseLease(leaseId);
        this._emit("lease_expired", this.keys[lease.keyIndex]);
      }
    }
  }

  reportSuccess(index) {
    const key = this.keys[Number(index)];
    if (!key) return false;
    key.successes += 1;
    key.consecutiveFailures = 0;
    key.cooldownUntil = 0;
    const prior = key.state;
    key.state = "healthy";
    this._touch(key);
    this._emit("success", key, { ...(prior !== "healthy" ? { from: prior, to: "healthy" } : {}) });
    return true;
  }

  reportFailure(index, failure) {
    const key = this.keys[Number(index)];
    if (!key) return "transient";
    const failureClass = classifyGeminiFailure(failure);
    key.failures[failureClass] = (key.failures[failureClass] || 0) + 1;
    const now = this.now();
    const prior = key.state;
    if (failureClass === "rate_limit_minute") {
      key.consecutiveFailures += 1;
      const base = Math.min(75_000, 30_000 * (1.5 ** (key.consecutiveFailures - 1)));
      const jitter = Math.floor(this.random() * 15_001);
      key.cooldownUntil = now + Math.min(90_000, base + jitter);
      key.state = "cooling";
    } else if (failureClass === "quota_daily") {
      key.consecutiveFailures += 1;
      key.cooldownUntil = nextQuotaResetAt(now, this.quotaResetTz);
      key.state = "cooling";
    } else if (failureClass === "auth_permission_billing") {
      key.consecutiveFailures += 1;
      key.cooldownUntil = now + 60 * 60 * 1000;
      key.state = "disabled";
    }
    this._emit("failure", key, {
      failureClass,
      penalized: ["rate_limit_minute", "quota_daily", "auth_permission_billing"].includes(failureClass),
      ...(prior !== key.state ? { from: prior, to: key.state } : {}),
      cooldownUntil: key.cooldownUntil || null,
      consecutiveFailures: key.consecutiveFailures,
    });
    return failureClass;
  }

  retryAfterSec() {
    this.expireLeases();
    const now = this.now();
    const candidates = this.keys.map((key) => {
      this._refreshState(key);
      if (key.state !== "healthy") return key.cooldownUntil;
      if (key.activeLeases >= this.maxSessionsPerKey) {
        const expiries = [...this.leases.values()].filter((lease) => lease.keyIndex === key.index).map((lease) => lease.expiresAt);
        return expiries.length ? Math.min(...expiries) : now + 1_000;
      }
      return 0;
    }).filter((until) => until > now);
    return Math.max(1, Math.ceil(((candidates.length ? Math.min(...candidates) : now + 1000) - now) / 1000));
  }

  status() {
    this.expireLeases();
    return this.keys.map((key) => {
      this._refreshState(key);
      return {
        index: key.index + 1,
        state: key.state,
        cooldownSeconds: Math.max(0, Math.ceil((key.cooldownUntil - this.now()) / 1000)),
        activeLeases: key.activeLeases,
        consecutiveFailures: key.consecutiveFailures,
        successes: key.successes,
        failures: { ...key.failures },
      };
    });
  }

  close() { clearInterval(this.expiryTimer); }
}

export { classifyGeminiFailure };
