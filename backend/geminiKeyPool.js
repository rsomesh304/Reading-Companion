const DEFAULT_COOLDOWN_MS = 15 * 60 * 1000;

export class DailyGeminiKeyPool {
  constructor(keyCount, { cooldownMs = DEFAULT_COOLDOWN_MS, now = Date.now } = {}) {
    this.keyCount = Math.max(0, Number(keyCount) || 0);
    this.cooldownMs = cooldownMs;
    this.now = now;
    this.day = null;
    this.activeIndex = null;
    this.exhausted = new Map();
  }

  currentIndex(day) {
    this._useDay(day);
    if (this.activeIndex !== null && !this._isExhausted(this.activeIndex)) return this.activeIndex;
    this.activeIndex = this._findAvailable(0);
    return this.activeIndex;
  }

  markExhausted(index, day) {
    this._useDay(day);
    if (!Number.isInteger(index) || index < 0 || index >= this.keyCount) return this.currentIndex(day);
    if (!this._isExhausted(index)) this.exhausted.set(index, this.now() + this.cooldownMs);
    if (this.activeIndex === index || this.activeIndex === null || this._isExhausted(this.activeIndex)) {
      this.activeIndex = this._findAvailable(index + 1);
    }
    return this.activeIndex;
  }

  // A rate limit usually clears within minutes, so a key rests for a cooldown instead of the whole day.
  _isExhausted(index) {
    const until = this.exhausted.get(index);
    if (until === undefined) return false;
    if (this.now() >= until) {
      this.exhausted.delete(index);
      return false;
    }
    return true;
  }

  _useDay(day) {
    if (day === this.day) return;
    this.day = day;
    this.activeIndex = null;
    this.exhausted.clear();
  }

  _findAvailable(startIndex) {
    for (let offset = 0; offset < this.keyCount; offset += 1) {
      const index = (startIndex + offset) % this.keyCount;
      if (!this._isExhausted(index)) return index;
    }
    return null;
  }
}