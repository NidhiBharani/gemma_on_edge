import { FilesetResolver, LlmInference } from "./lib/genai_bundle.mjs";

const MODEL_URL = "http://localhost:8000/models/gemma-3n-E2B-it-int4-Web.litertlm";
const WASM_URL = chrome.runtime.getURL("lib/wasm");

let llmInferencePromise;

const REDACTION_PROMPT = `You are a PII redaction system. Replace any PII in the input with the placeholders below and return only the redacted text.

- Names -> [NAME]
- Phones -> [PHONE]
- Emails -> [EMAIL]
- Addresses -> [ADDRESS]
- SSN -> [SSN]
- API keys -> [API_KEY]
- Bank details -> [BANK_ACCOUNT]
- Credit cards -> [CREDIT_CARD]
- Access tokens -> [ACCESS_TOKEN]`;

function buildPrompt(text) {
  return `${REDACTION_PROMPT}\n\nINPUT:\n${text}`;
}

async function initModel() {
  if (!llmInferencePromise) {
    llmInferencePromise = (async () => {
      const filesetResolver = await FilesetResolver.forGenAiTasks(WASM_URL);
      return await LlmInference.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath: MODEL_URL
        },
        maxTokens: 512,
        temperature: 0.8,
        topK: 40
      });
    })();
  }
  return llmInferencePromise;
}

async function runInference(prompt) {
  const llmInference = await initModel();
  if (typeof llmInference.generateResponse === "function") {
    return await llmInference.generateResponse(prompt);
  }
  if (typeof llmInference.generate === "function") {
    return await llmInference.generate(prompt);
  }
  throw new Error("No compatible generate method found on LlmInference.");
}

chrome.runtime.onMessage.addListener((message) => {
  if (!message || message.target !== "offscreen" || message.type !== "LLM_PROMPT") {
    return;
  }

  (async () => {
    try {
      const inputText = (message.prompt ?? "").trim();
      const result = await runInference(buildPrompt(inputText));
      chrome.runtime.sendMessage({
        target: "service_worker",
        type: "LLM_RESULT",
        requestId: message.requestId,
        result: typeof result === "string" ? result : JSON.stringify(result)
      });
    } catch (err) {
      chrome.runtime.sendMessage({
        target: "service_worker",
        type: "LLM_RESULT",
        requestId: message.requestId,
        error: err?.message ?? String(err)
      });
    }
  })();
});
