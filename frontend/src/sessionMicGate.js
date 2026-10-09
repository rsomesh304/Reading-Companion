const PRE_ROLL_MS = 700;

export class SessionMicGate {
  constructor(onChunk, onEnd, { now = () => Date.now() } = {}) {
    this.onChunk = onChunk;
    this.onEnd = onEnd;
    this.now = now;
    this.rolling = [];
    this.active = false;
  }

  accept(pcm) {
    if (this.active) {
      this.onChunk(pcm);
      return;
    }
    const at = this.now();
    this.rolling.push({ at, pcm });
    while (this.rolling.length && at - this.rolling[0].at > PRE_ROLL_MS) this.rolling.shift();
  }

  start() {
    if (this.active) return;
    this.active = true;
    for (const { pcm } of this.rolling) this.onChunk(pcm);
    this.rolling = [];
  }

  end() {
    if (!this.active) return;
    this.active = false;
    this.onEnd();
  }

  reset() {
    this.active = false;
    this.rolling = [];
  }
}
