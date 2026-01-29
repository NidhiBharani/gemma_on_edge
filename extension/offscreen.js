import { FilesetResolver, LlmInference } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-genai@latest";

const MODEL_URL = "http://localhost:8000/models/gemma-3n-E2B-it-int4-Web.litertlm";
const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-genai@latest/wasm";

let llmInferencePromise;

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
      const result = await runInference(message.prompt);
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
