import { useEffect, useRef } from "react";

const TAU = Math.PI * 2;
const PAL = {
  idle:      { a: [255, 184, 108], b: [240, 98, 146],  c: [140, 110, 255], g: [255, 160, 110] },
  listening: { a: [96, 226, 198],  b: [86, 156, 255],  c: [255, 206, 128], g: [96, 214, 200] },
  speaking:  { a: [255, 168, 84],  b: [248, 82, 150],  c: [168, 96, 255],  g: [255, 120, 140] },
  ghost:     { a: [124, 58, 237],  b: [253, 230, 138], c: [76, 29, 149],  g: [234, 179, 8] },
};
const mix = (cur, tar, k) => { for (let i = 0; i < 3; i++) cur[i] += (tar[i] - cur[i]) * k; };
const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

// levelRef.current = audio loudness 0..1. mode: "idle" | "listening" | "speaking".
export default function EmberOrb({ levelRef, mode = "speaking", ghostMode = false }) {
  const canvasRef = useRef(null);
  const modeRef = useRef(mode);
  const ghostRef = useRef(ghostMode);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { ghostRef.current = ghostMode; }, [ghostMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    let raf = 0, w = 0, h = 0, dpr = 1;
    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const cur = { a: [...PAL.idle.a], b: [...PAL.idle.b], c: [...PAL.idle.c], g: [...PAL.idle.g] };
    const ripples = [];
    let last = performance.now();
    const t0 = last;
    let lv = 0, sinceRipple = 0;

    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = (now - t0) / 1000;
      const m = modeRef.current;
      const tar = ghostRef.current ? PAL.ghost : PAL[m] || PAL.idle;
      ["a", "b", "c", "g"].forEach((k) => mix(cur[k], tar[k], 0.05));
      lv += (Math.min(1, levelRef?.current || 0) - lv) * 0.18;
      const breath = 0.5 + 0.5 * Math.sin(t * 1.3);
      const L = Math.max(lv, 0.03 * breath);
      const light = document.documentElement.getAttribute("data-theme") === "light";

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2, cy = h / 2, base = Math.min(w, h) / 2;
      const R = base * 0.4 * (1 + 0.025 * breath + L * 0.2);

      // ambient glow
      const gl = ctx.createRadialGradient(cx, cy, R * 0.5, cx, cy, base);
      gl.addColorStop(0, rgb(cur.g, (light ? 0.22 : 0.32) + L * 0.3));
      gl.addColorStop(1, rgb(cur.g, 0));
      ctx.fillStyle = gl;
      ctx.fillRect(0, 0, w, h);

      // hairline ring + voice ripples
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = rgb(cur.g, 0.16);
      ctx.beginPath(); ctx.arc(cx, cy, R * 1.1, 0, TAU); ctx.stroke();
      sinceRipple += dt;
      if ((m === "speaking" || m === "listening") && L > 0.1 && sinceRipple > 0.7 - L * 0.4) {
        ripples.push({ age: 0, amp: L });
        sinceRipple = 0;
      }
      for (let i = ripples.length - 1; i >= 0; i--) {
        const p = ripples[i];
        p.age += dt * 0.55;
        if (p.age >= 1) { ripples.splice(i, 1); continue; }
        const e = 1 - Math.pow(1 - p.age, 2);
        ctx.strokeStyle = rgb(cur.g, (1 - p.age) * (0.18 + p.amp * 0.4) * (light ? 1.4 : 1));
        ctx.beginPath(); ctx.arc(cx, cy, R * (1.08 + e * 0.8), 0, TAU); ctx.stroke();
      }

      // the liquid sphere
      const trace = () => {
        ctx.beginPath();
        for (let i = 0; i <= 90; i++) {
          const th = (i / 90) * TAU;
          const r = R * (1 + 0.04 * Math.sin(2 * th + t * 1.1) + 0.03 * Math.sin(3 * th - t * 1.5) + L * 0.07 * Math.sin(5 * th + t * 5));
          const px = cx + Math.cos(th) * r, py = cy + Math.sin(th) * r;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
      };
      trace();
      const bg = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.1, cx, cy, R * 1.1);
      bg.addColorStop(0, rgb(cur.a));
      bg.addColorStop(1, rgb(cur.b));
      ctx.fillStyle = bg;
      ctx.fill();

      ctx.save();
      trace();
      ctx.clip();
      ctx.globalCompositeOperation = light ? "source-over" : "lighter";
      const blobs = [cur.c, cur.a, cur.b];
      for (let j = 0; j < 3; j++) {
        const ang = t * (0.5 + 0.25 * j) + j * 2.1;
        const bx = cx + Math.cos(ang) * R * 0.45, by = cy + Math.sin(ang * 1.2) * R * 0.45;
        const br = R * (0.7 + 0.12 * Math.sin(t * 1.5 + j) + L * 0.3);
        const bgr = ctx.createRadialGradient(bx, by, 0, bx, by, br);
        bgr.addColorStop(0, rgb(blobs[j], light ? 0.55 : 0.6 + L * 0.2));
        bgr.addColorStop(1, rgb(blobs[j], 0));
        ctx.fillStyle = bgr;
        ctx.fillRect(cx - R * 1.3, cy - R * 1.3, R * 2.6, R * 2.6);
      }
      ctx.globalCompositeOperation = "source-over";
      const sh = ctx.createRadialGradient(cx, cy - R * 0.1, R * 0.6, cx, cy, R * 1.08);
      sh.addColorStop(0, "rgba(0,0,0,0)");
      sh.addColorStop(1, light ? "rgba(40,20,60,.2)" : "rgba(0,0,0,.4)");
      ctx.fillStyle = sh;
      ctx.fillRect(cx - R * 1.3, cy - R * 1.3, R * 2.6, R * 2.6);
      const hl = ctx.createLinearGradient(cx, cy - R, cx, cy);
      hl.addColorStop(0, "rgba(255,255,255,.38)");
      hl.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = hl;
      ctx.beginPath(); ctx.ellipse(cx, cy - R * 0.5, R * 0.62, R * 0.42, 0, 0, TAU); ctx.fill();
      ctx.restore();

      trace();
      ctx.strokeStyle = "rgba(255,255,255,.3)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [levelRef]);

  return <canvas ref={canvasRef} className="ember-orb" aria-hidden="true" />;
}