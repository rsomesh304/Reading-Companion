import { useEffect, useState } from "react";

export function useViewport() {
  const read = () => { const v = window.visualViewport; return { top: v?.offsetTop || 0, h: v?.height || window.innerHeight }; };
  const [vp, setVp] = useState(read);
  useEffect(() => {
    const v = window.visualViewport;
    const on = () => setVp(read());
    v?.addEventListener("resize", on);
    v?.addEventListener("scroll", on);
    window.addEventListener("resize", on);
    return () => { v?.removeEventListener("resize", on); v?.removeEventListener("scroll", on); window.removeEventListener("resize", on); };
  }, []);
  return vp;
}
