import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Minus, Plus, X } from "lucide-react";
import { useBackLayer } from "./backStack.js";
import "./ProfileCard.css";

const STAGE = 280;
const OUTPUT = 320;

// Drag to position, zoom with the slider (or wheel), then save a square, compressed JPEG.
export default function AvatarCropper({ file, onCancel, onSave }) {
  const [img, setImg] = useState(null);
  const [failed, setFailed] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const drag = useRef(null);
  useBackLayer(true, onCancel);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => setImg(image);
    image.onerror = () => setFailed(true);
    image.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const base = img ? STAGE / Math.min(img.naturalWidth, img.naturalHeight) : 1;
  const dims = (z) => (img ? { w: img.naturalWidth * base * z, h: img.naturalHeight * base * z } : { w: STAGE, h: STAGE });
  const clamp = (p, z) => {
    const { w, h } = dims(z);
    const mx = Math.max(0, (w - STAGE) / 2);
    const my = Math.max(0, (h - STAGE) / 2);
    return { x: Math.min(mx, Math.max(-mx, p.x)), y: Math.min(my, Math.max(-my, p.y)) };
  };
  const changeZoom = (value) => {
    const z = Math.min(3, Math.max(1, value));
    setZoom(z);
    setPos((p) => clamp(p, z));
  };

  const onDown = (e) => { e.currentTarget.setPointerCapture(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, start: pos }; };
  const onMove = (e) => {
    if (!drag.current) return;
    setPos(clamp({ x: drag.current.start.x + e.clientX - drag.current.x, y: drag.current.start.y + e.clientY - drag.current.y }, zoom));
  };
  const onUp = () => { drag.current = null; };

  const { w, h } = dims(zoom);
  const save = () => {
    if (!img) return;
    const k = OUTPUT / STAGE;
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT; canvas.height = OUTPUT;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, OUTPUT, OUTPUT);
    ctx.drawImage(img, (STAGE / 2 - w / 2 + pos.x) * k, (STAGE / 2 - h / 2 + pos.y) * k, w * k, h * k);
    onSave(canvas.toDataURL("image/jpeg", 0.85));
  };

  return createPortal(
    <div className="pcrop-wrap" role="dialog" aria-modal="true" aria-label="Crop your photo">
      <button type="button" className="pcrop-scrim" aria-label="Cancel" onClick={onCancel} />
      <div className="pcrop">
        <h3>Adjust your photo</h3>
        <p>Drag to position. Use the slider to zoom.</p>
        {failed ? <p className="pcrop-err">That image could not be opened. Please choose another photo.</p> : (
          <div className="pcrop-stage" style={{ width: STAGE, height: STAGE }} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
            onWheel={(e) => changeZoom(zoom - e.deltaY * 0.002)}>
            {img && <img src={img.src} alt="" draggable="false" style={{ width: w, height: h, transform: `translate(${pos.x}px, ${pos.y}px)` }} />}
            <span className="pcrop-mask" aria-hidden="true" />
          </div>
        )}
        <div className="pcrop-zoom">
          <button type="button" aria-label="Zoom out" onClick={() => changeZoom(zoom - 0.2)}><Minus size={16} /></button>
          <input type="range" min="1" max="3" step="0.02" value={zoom} onChange={(e) => changeZoom(Number(e.target.value))} aria-label="Zoom" />
          <button type="button" aria-label="Zoom in" onClick={() => changeZoom(zoom + 0.2)}><Plus size={16} /></button>
        </div>
        <div className="pcrop-actions">
          <button type="button" className="ghost" onClick={onCancel}><X size={15} /> Cancel</button>
          <button type="button" className="go" disabled={!img} onClick={save}><Check size={15} /> Save photo</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
