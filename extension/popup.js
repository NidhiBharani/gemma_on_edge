const runButton = document.getElementById("run");
const promptEl = document.getElementById("prompt");
const outputEl = document.getElementById("output");
const statusEl = document.getElementById("status");

function setStatus(text) {
  statusEl.textContent = text;
}

runButton.addEventListener("click", async () => {
  runButton.disabled = true;
  setStatus("Running...");
  outputEl.textContent = "Working...";

  try {
    const response = await chrome.runtime.sendMessage({
      target: "service_worker",
      type: "LLM_PROMPT",
      prompt: promptEl.value.trim()
    });

    if (response?.error) {
      outputEl.textContent = `Error: ${response.error}`;
      setStatus("Error");
    } else {
      outputEl.textContent = response?.result ?? "(no response)";
      setStatus("Done");
    }
  } catch (err) {
    outputEl.textContent = `Error: ${err?.message ?? err}`;
    setStatus("Error");
  } finally {
    runButton.disabled = false;
  }
});
