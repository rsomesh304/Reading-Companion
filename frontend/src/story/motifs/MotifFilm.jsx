import { AnimatePresence, motion as Motion } from "framer-motion";
import { MotifRenderer } from "./registry.jsx";

export default function MotifFilm({ beat, beatIndex, palette, mood = "reflective", reducedMotion = false }) {
  const transitionName = (beat?.transition || "crossfade").replaceAll("_", "-");
  const transition = beat?.transition === "dip_to_black"
    ? { duration: reducedMotion ? 0.15 : 0.65, ease: "easeInOut" }
    : beat?.transition === "light_wipe"
      ? { duration: reducedMotion ? 0.15 : 0.8, ease: [0.22, 1, 0.36, 1] }
      : { duration: reducedMotion ? 0.15 : 0.55, ease: "easeInOut" };
  return (
    <div className={`st-film-stage transition-${transitionName}`} aria-hidden="true">
      <AnimatePresence mode="sync">
        <Motion.div key={`${beatIndex}-${beat?.motif}`} className="st-film-frame"
          initial={{ opacity: 0, scale: reducedMotion ? 1 : .96, filter: "blur(8px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, scale: reducedMotion ? 1 : 1.025, filter: "blur(5px)" }}
          transition={transition}>
          <MotifRenderer beat={beat} palette={palette} mood={mood} />
        </Motion.div>
      </AnimatePresence>
      {beat?.label && <Motion.span className="st-motif-label" key={`label-${beatIndex}`} initial={{ opacity: 0, y: 7 }} animate={{ opacity: .86, y: 0 }} transition={{ delay: reducedMotion ? 0 : .3, duration: .5 }}>{beat.label}</Motion.span>}
    </div>
  );
}