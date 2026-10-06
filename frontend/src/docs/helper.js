import { useCallback, useRef, useState } from "react";
import { apiFetch } from "../api.js";
import { supabaseClient } from "../supabaseClient.js";

// Chat state for the Docs Helper (Groq runs on the server; the key never reaches the browser).
export function useHelper() {
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);
  const seq = useRef(0);

  const ask = useCallback(async (question, pageId = "") => {
    const text = question.trim();
    if (!text) return;
    const id = (seq.current += 1);
    const history = messages.filter((m) => !m.error).map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { id: `u${id}`, role: "user", content: text }]);
    setBusy(true);
    const fail = (content) => setMessages((prev) => [...prev, { id: `a${id}`, role: "assistant", content, error: true, sources: [] }]);
    try {
      const { data } = (await supabaseClient?.auth.getSession()) || {};
      const token = data?.session?.access_token;
      if (!token) return fail("Sign in again to use the Docs Helper.");
      if (navigator.onLine === false) return fail("You are offline. Search still works, but the helper needs a connection.");
      const response = await apiFetch("/api/docs/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ question: text, pageId, history }),
      }, { retries: 2, delayMs: 3000 });
      if (response.status === 429) return fail("You have asked a lot in a short time. Please wait a few minutes.");
      if (!response.ok) return fail("The helper is unavailable right now. Try searching instead.");
      const body = await response.json();
      setMessages((prev) => [...prev, { id: `a${id}`, role: "assistant", content: body.answer, sources: body.sources || [] }]);
    } catch {
      fail("The helper could not be reached. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }, [messages]);

  const reset = useCallback(() => setMessages([]), []);
  return { messages, busy, ask, reset };
}

export const HELPER_SUGGESTIONS = ["How do I roll back a bad deploy?", "What happens when Groq hits its limit?", "Where do I change Supabase redirect URLs?"];
