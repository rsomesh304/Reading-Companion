import { useCallback, useEffect, useState } from "react";

const KEY = "rc_docs_theme";

function appTheme() {
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

// "auto" follows the app's theme; the toggle inside Docs stores an explicit choice.
export function useDocsTheme() {
  const [choice, setChoice] = useState(() => { try { return window.localStorage.getItem(KEY) || "auto"; } catch { return "auto"; } });
  const [app, setApp] = useState(appTheme);
  useEffect(() => {
    const mo = new MutationObserver(() => setApp(appTheme()));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, []);
  const theme = choice === "auto" ? app : choice;
  const toggle = useCallback(() => {
    const next = theme === "light" ? "dark" : "light";
    setChoice(next);
    try { window.localStorage.setItem(KEY, next); } catch { /* storage unavailable */ }
  }, [theme]);
  return [theme, toggle];
}
