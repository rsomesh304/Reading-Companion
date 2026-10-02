// Scheduled playback of 24kHz PCM audio chunks from Gemini
export class AudioPlayback {
  constructor(onPlaybackStateChange, onLevel = null) {
    this.audioContext = new AudioContext({ sampleRate: 24000 });
    this.sources = new Set();
    this.nextTime = 0;
    this.playing = false;
    this.onPlaybackStateChange = onPlaybackStateChange;
    this.onLevel = onLevel;
  }

  enqueue(base64Pcm) {
    const ctx = this.audioContext;
    if (ctx.state === "closed") return;
    if (ctx.state !== "running") ctx.resume().catch(() => {});
    const binary = atob(base64Pcm);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const pcm16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(pcm16.length);
    let sumSquares = 0;
    for (let i = 0; i < pcm16.length; i++) {
      const sample = pcm16[i] / 32768;
      float32[i] = sample;
      sumSquares += sample * sample;
    }
    const rms = pcm16.length ? Math.sqrt(sumSquares / pcm16.length) : 0;
    this.onLevel?.(Math.min(1, rms * 5));

    const buffer = ctx.createBuffer(1, float32.length, 24000);
    buffer.copyToChannel(float32, 0);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    const startAt = Math.max(ctx.currentTime + 0.03, this.nextTime);
    source.start(startAt);
    this.nextTime = startAt + buffer.duration;
    this.sources.add(source);
    if (!this.playing) { this.playing = true; this.onPlaybackStateChange?.(true); }
    source.onended = () => {
      this.sources.delete(source);
      if (this.sources.size === 0 && this.playing) { this.playing = false; this.onPlaybackStateChange?.(false); }
    };
  }

  // True only when audio is genuinely coming out of the speaker RIGHT NOW.
  // A suspended context (phone power-save / background tab) freezes currentTime,
  // which used to leave `playing` stuck true and silence the reader's mic.
  isActuallyPlaying() {
    const ctx = this.audioContext;
    if (ctx.state === "closed") return false;
    return this.playing && ctx.state === "running" && this.nextTime > ctx.currentTime + 0.02;
  }

  // Called from the session render loop: resumes a suspended context and
  // heals a stuck playing flag once every queued chunk has finished.
  poke() {
    const ctx = this.audioContext;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    if (this.playing && this.sources.size === 0 && ctx.state === "running" && this.nextTime <= ctx.currentTime + 0.05) {
      this.playing = false;
      this.onPlaybackStateChange?.(false);
    }
  }

  clear() {
    this.sources.forEach((s) => { s.onended = null; try { s.stop(); } catch { /* already stopped */ } });
    this.sources.clear();
    this.nextTime = 0;
    if (this.playing) { this.playing = false; this.onPlaybackStateChange?.(false); }
  }

  close() {
    this.clear();
    const context = this.audioContext;
    if (context.state !== "closed") void context.close().catch(() => {});
  }
}