export const DEFAULT_CLOUDFLARE_TEXT_MODEL = "@cf/meta/llama-3.2-3b-instruct";
export const DEFAULT_GROQ_HELP_MODEL = "openai/gpt-oss-20b";

function hasCloudflare(env) {
  return Boolean(env.CLOUDFLARE_ACCOUNT_ID && env.CLOUDFLARE_API_TOKEN);
}

export function getAiProviderOrder(feature, env = process.env) {
  if (feature === "help") {
    return [
      ...(env.GROQ_API_KEY ? ["groq"] : []),
      ...(hasCloudflare(env) ? ["cloudflare"] : []),
    ];
  }
  return hasCloudflare(env) ? ["cloudflare"] : [];
}

function endpointFor(provider, env) {
  if (provider === "groq") return "https://api.groq.com/openai/v1/chat/completions";
  return `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/ai/v1/chat/completions`;
}

function requestBody(provider, feature, messages, maxTokens, stream, env) {
  const groqModel = env.GROQ_HELP_MODEL || DEFAULT_GROQ_HELP_MODEL;
  const body = {
    model: provider === "cloudflare" ? env.CLOUDFLARE_TEXT_MODEL || DEFAULT_CLOUDFLARE_TEXT_MODEL : groqModel,
    messages,
    stream,
    temperature: feature === "help" ? 0.55 : 0.2,
    [provider === "groq" ? "max_completion_tokens" : "max_tokens"]: maxTokens,
  };
  if (provider === "cloudflare") body.options = { rejectIfBusy: true };
  // gpt-oss models reason before answering; low effort and hidden reasoning keep chat fast.
  if (provider === "groq" && /gpt-oss/.test(groqModel)) Object.assign(body, { reasoning_effort: "low", include_reasoning: false });
  return body;
}

export async function requestTextCompletion({
  feature,
  messages,
  maxTokens,
  stream = false,
  env = process.env,
  providerOrder = getAiProviderOrder(feature, env),
  fetchImpl = fetch,
  signal,
  providerTimeoutMs = 6500,
}) {
  const providers = providerOrder;
  if (!providers.length) throw new Error("ai_provider_unavailable");

  let lastError;
  for (const provider of providers) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), providerTimeoutMs);
    const relayAbort = () => controller.abort(signal?.reason);
    if (signal?.aborted) relayAbort();
    else signal?.addEventListener("abort", relayAbort, { once: true });
    try {
      const response = await fetchImpl(endpointFor(provider, env), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${provider === "groq" ? env.GROQ_API_KEY : env.CLOUDFLARE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody(provider, feature, messages, maxTokens, stream, env)),
        signal: controller.signal,
      });
      if (!response.ok) {
        const error = new Error(`ai_provider_http_${response.status}`);
        error.status = response.status;
        throw error;
      }
      return { provider, response, abort: () => controller.abort() };
    } catch (error) {
      lastError = error;
      if (signal?.aborted) throw error;
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", relayAbort);
    }
  }
  throw Object.assign(new Error("ai_providers_unavailable"), { cause: lastError });
}

export async function readTextCompletion(response) {
  const payload = await response.json();
  const text = payload?.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) throw new Error("ai_completion_empty");
  return text.trim();
}

export async function streamTextCompletion(response, onToken, { firstTokenTimeoutMs = 0 } = {}) {
  if (!response.body) throw new Error("ai_stream_missing");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = "";
  let output = "";
  let firstTokenDeadline = firstTokenTimeoutMs ? Date.now() + firstTokenTimeoutMs : 0;

  function consumeLine(line) {
    if (!line.startsWith("data:")) return false;
    const data = line.slice(5).trim();
    if (!data || data === "[DONE]") return data === "[DONE]";
    const event = JSON.parse(data);
    const token = event?.choices?.[0]?.delta?.content;
    if (typeof token === "string" && token) {
      if (token.trim()) firstTokenDeadline = 0;
      output += token;
      onToken(token);
    }
    return false;
  }

  try {
    while (true) {
      let readResult;
      if (firstTokenDeadline) {
        const remainingMs = firstTokenDeadline - Date.now();
        if (remainingMs <= 0) throw new Error("ai_first_token_timeout");
        let timeoutId;
        try {
          readResult = await Promise.race([
            reader.read(),
            new Promise((_, reject) => { timeoutId = setTimeout(() => reject(new Error("ai_first_token_timeout")), remainingMs); }),
          ]);
        } finally {
          clearTimeout(timeoutId);
        }
      } else {
        readResult = await reader.read();
      }
      const { done, value } = readResult;
      pending += decoder.decode(value || new Uint8Array(), { stream: !done });
      const lines = pending.split(/\r?\n/);
      pending = lines.pop() || "";
      for (const line of lines) {
        if (consumeLine(line)) {
          await reader.cancel();
          return output;
        }
      }
      if (done) break;
    }
    if (pending) consumeLine(pending);
    if (!output.trim()) throw new Error("ai_stream_empty");
    return output;
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally {
    reader.releaseLock();
  }
}