import { FilesetResolver, LlmInference } from "./lib/genai_bundle.mjs";
import { buildPrompt, normalizeOutput } from "./offscreen_utils.mjs";

const MODEL_URL = "http://localhost:8000/models/gemma-3n-E2B-it-int4-Web.litertlm";
const WASM_URL = chrome.runtime.getURL("lib/wasm");
const MAX_TOKENS = 2048;

let llmInferencePromise;
let llmInferenceInstance;
const RESET_MODEL_EACH_REQUEST = true;
let inferenceQueue = Promise.resolve();

async function initModel() {
  if (!llmInferencePromise) {
    llmInferencePromise = (async () => {
      console.info("[Gemma Redaction] Initializing model...");
      const filesetResolver = await FilesetResolver.forGenAiTasks(WASM_URL);
      const instance = await LlmInference.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath: MODEL_URL
        },
        maxTokens: MAX_TOKENS,
        temperature: 0,
        topK: 1,
        randomSeed: 1
      });
      console.info("[Gemma Redaction] Model ready.");
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

function enqueueInference(task) {
  const run = inferenceQueue.then(task);
  inferenceQueue = run.catch(() => {});
  return run;
}

chrome.runtime.onMessage.addListener((message) => {
  if (!message || message.target !== "offscreen" || message.type !== "LLM_PROMPT") {
    return;
  }

  (async () => {
    await enqueueInference(async () => {
      try {
        const inputText = (message.prompt ?? "").trim();
        const result = await runInference(buildPrompt(inputText));
        console.info("[Gemma Redaction] Inference complete.");
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
        console.error("[Gemma Redaction] Inference failed:", err);
        chrome.runtime.sendMessage({
          target: "service_worker",
          type: "LLM_RESULT",
          requestId: message.requestId,
          error: err?.message ?? String(err)
        });
      }
    });
  })();
});
