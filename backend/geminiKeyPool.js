export class DailyGeminiKeyPool {
  constructor(keyCount) {
    this.keyCount = Math.max(0, Number(keyCount) || 0);
    this.day = null;
    this.activeIndex = null;
    this.exhausted = new Set();
  }

  currentIndex(day) {
    this._useDay(day);
    if (this.activeIndex !== null && !this.exhausted.has(this.activeIndex)) return this.activeIndex;
    this.activeIndex = this._findAvailable(0);
    return this.activeIndex;
  }

  markExhausted(index, day) {
    this._useDay(day);
    if (!Number.isInteger(index) || index < 0 || index >= this.keyCount) return this.currentIndex(day);
    this.exhausted.add(index);
    if (this.activeIndex === index || this.activeIndex === null || this.exhausted.has(this.activeIndex)) {
      this.activeIndex = this._findAvailable(index + 1);
    }
    return this.activeIndex;
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
      if (!this.exhausted.has(index)) return index;
    }
    return null;
  }
}