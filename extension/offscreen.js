import { FilesetResolver, LlmInference } from "./lib/genai_bundle.mjs";
import { buildPrompt, normalizeOutput } from "./offscreen_utils.mjs";

const MODEL_URL = "http://localhost:8000/models/gemma-3n-E2B-it-int4-Web.litertlm";
const WASM_URL = chrome.runtime.getURL("lib/wasm");

let llmInferencePromise;
let llmInferenceInstance;
const RESET_MODEL_EACH_REQUEST = true;

async function initModel() {
  if (!llmInferencePromise) {
    llmInferencePromise = (async () => {
      const filesetResolver = await FilesetResolver.forGenAiTasks(WASM_URL);
      const instance = await LlmInference.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath: MODEL_URL
        },
        maxTokens: 512,
        temperature: 0,
        topK: 1,
        randomSeed: 1
      });
      llmInferenceInstance = instance;
      return instance;
    })();
  }
  return llmInferencePromise;
}

async function runInference(prompt) {
  const llmInference = await initModel();
  let result;
  if (typeof llmInference.generateResponse === "function") {
    result = await llmInference.generateResponse(prompt);
  } else if (typeof llmInference.generate === "function") {
    result = await llmInference.generate(prompt);
  } else {
    throw new Error("No compatible generate method found on LlmInference.");
  }
  if (RESET_MODEL_EACH_REQUEST && llmInferenceInstance?.close) {
    try {
      llmInferenceInstance.close();
    } finally {
      llmInferencePromise = null;
      llmInferenceInstance = null;
    }
  }
  return result;
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
        result:
          typeof result === "string"
            ? normalizeOutput(result)
            : normalizeOutput(JSON.stringify(result))
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
