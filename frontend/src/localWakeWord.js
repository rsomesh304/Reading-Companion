const QUIET_COMMAND = /^(?:im reading|i am reading|im going to read|i am going to read|let me read|dont interrupt|do not interrupt|quiet while i read|main padh raha hoon|main padh rahi hoon|abhi padh raha hoon|abhi padh rahi hoon|मुझे पढ़ने दो|मैं पढ़ रहा हूं|मैं पढ़ रही हूं)(?:\b|$)/i;
const GREETING = /^(?:hello|hi|hey|are you there|sun rahe ho|sun rahi ho|सुन रहे हो|सुन रही हो)(?:\b|$)/i;

export function normalizeWakeText(text) {
  return String(text || "")
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function startsWithPhrase(text, phrase) {
  return phrase && (text === phrase || text.startsWith(`${phrase} `));
}

export function classifyWakeTranscript(transcript, companionName, inFollowUp = false) {
  const normalized = normalizeWakeText(transcript);
  if (!normalized) return { intent: "ignore", text: "" };

  if (QUIET_COMMAND.test(normalized)) {
    return { intent: "reading", text: "" };
  }

  const normalizedName = normalizeWakeText(companionName);
  if (startsWithPhrase(normalized, normalizedName) || GREETING.test(normalized)) {
    return { intent: "wake", text: String(transcript).trim() };
  }

  if (inFollowUp) return { intent: "follow-up", text: String(transcript).trim() };
  return { intent: "ignore", text: "" };
}

export function createOnDeviceWakeRecognizer({ onTranscript, onUnavailable, language = "en-IN" }) {
  if (typeof window === "undefined") return null;
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) return null;

  let recognition;
  try {
    recognition = new Recognition();
    if (!("processLocally" in recognition)) return null;
    recognition.processLocally = true;
    recognition.lang = language;
    recognition.continuous = true;
    recognition.interimResults = false;
  } catch (error) {
    onUnavailable?.(error);
    return null;
  }

  let stopped = false;
  let started = false;
  let restartTimer = null;
  let restartDelay = 250;
  const restart = () => {
    if (stopped || started) return;
    restartTimer = setTimeout(() => {
      restartTimer = null;
      if (stopped || started) return;
      try {
        recognition.start();
        started = true;
        restartDelay = 250;
      } catch (error) {
        onUnavailable?.(error);
      }
    }, restartDelay);
    restartDelay = Math.min(restartDelay * 2, 4000);
  };

  recognition.onresult = (event) => {
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const result = event.results[index];
      if (result.isFinal && result[0]?.transcript) onTranscript?.(result[0].transcript);
    }
  };
  recognition.onerror = (event) => {
    if (event.error === "no-speech" || event.error === "aborted") return;
    started = false;
    onUnavailable?.(new Error(`on_device_speech_${event.error || "unavailable"}`));
  };
  recognition.onend = () => {
    started = false;
    restart();
  };

  try {
    recognition.start();
    started = true;
  } catch (error) {
    onUnavailable?.(error);
    return null;
  }

  return {
    stop() {
      stopped = true;
      clearTimeout(restartTimer);
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      if (started) recognition.stop();
      started = false;
    },
  };
}
