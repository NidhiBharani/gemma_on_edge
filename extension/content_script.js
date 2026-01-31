const COMPOSER_SELECTORS = [
  "[data-testid='conversation-compose-box'] textarea",
  "textarea#prompt-textarea",
  "textarea[data-testid='prompt-textarea']",
  "textarea[placeholder*='Send a message']",
  "div[contenteditable='true'][data-testid='prompt-textarea']",
  "div[contenteditable='true'][aria-label*='Message']"
];

const SEND_BUTTON_SELECTORS = [
  "button[data-testid='send-button']",
  "button[aria-label='Send prompt']",
  "button[aria-label='Send message']",
  "button[type='submit']"
];

const state = {
  running: false,
  bypassUntil: 0
};

const busyState = new WeakMap();
const PLACEHOLDER_TOKENS = [
  "[NAME]",
  "[PHONE]",
  "[EMAIL]",
  "[ADDRESS]",
  "[SSN]",
  "[DATE_OF_BIRTH]",
  "[INSURANCE_ID]",
  "[MRN]",
  "[IP_ADDRESS]",
  "[ORDER_ID]",
  "[PAN]",
  "[PAYPAL]",
  "[DRIVER_LICENSE]",
  "[API_KEY]",
  "[BANK_ACCOUNT]",
  "[CREDIT_CARD]",
  "[CARD_EXPIRY]",
  "[CARD_CVV]",
  "[ACCESS_TOKEN]"
];

function getComposerText(el) {
  if (!el) {
    return "";
  }
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
    return el.value;
  }
  return el.innerText || el.textContent || "";
}

function setComposerText(el, value) {
  if (!el) {
    return;
  }
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
    el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    return;
  }
  el.textContent = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

function sendMessage(payload) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(payload, (response) => {
      const lastError = chrome.runtime.lastError;
      if (lastError) {
        reject(lastError);
        return;
      }
      resolve(response);
    });
  });
}

function findComposer() {
  for (const selector of COMPOSER_SELECTORS) {
    const el = document.querySelector(selector);
    if (el) {
      return el;
    }
  }

  const editableCandidates = Array.from(
    document.querySelectorAll("div[contenteditable='true']")
  ).filter((el) => el.closest("form") || el.closest("[data-testid='conversation-compose-box']"));

  return editableCandidates[0] ?? null;
}

function findSendButton(scope) {
  if (!scope) {
    return null;
  }
  for (const selector of SEND_BUTTON_SELECTORS) {
    const el = scope.querySelector(selector);
    if (el) {
      return el;
    }
  }
  return null;
}

function getComposerContext(composer) {
  const form = composer?.closest("form") ?? null;
  const scope =
    form || composer?.closest("[data-testid='conversation-compose-box']") || document;
  const sendButton = findSendButton(scope);
  return { form, scope, sendButton };
}

function showToast(message, isError = false) {
  let toast = document.getElementById("gemma-redaction-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "gemma-redaction-toast";
    toast.style.position = "fixed";
    toast.style.bottom = "16px";
    toast.style.right = "16px";
    toast.style.zIndex = "2147483647";
    toast.style.padding = "10px 14px";
    toast.style.borderRadius = "10px";
    toast.style.fontSize = "13px";
    toast.style.fontFamily = "system-ui, sans-serif";
    toast.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.2)";
    toast.style.transition = "opacity 160ms ease";
    toast.style.opacity = "0";
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.style.background = isError ? "#701f2b" : "#1b3a57";
  toast.style.color = "#f8f8f8";
  toast.style.opacity = "1";

  window.clearTimeout(toast._gemmaTimeout);
  toast._gemmaTimeout = window.setTimeout(() => {
    toast.style.opacity = "0";
  }, isError ? 4000 : 2000);
}

function formatError(err) {
  if (!err) {
    return "Unknown error";
  }
  if (typeof err === "string") {
    return err;
  }
  if (err?.message) {
    return err.message;
  }
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

function setBusy(composer, sendButton, busy) {
  if (!composer) {
    return;
  }

  if (busy) {
    if (!busyState.has(composer)) {
      busyState.set(composer, {
        pointerEvents: composer.style.pointerEvents,
        opacity: composer.style.opacity,
        contentEditable: composer.getAttribute("contenteditable"),
        readOnly: composer.readOnly
      });
    }
    composer.style.pointerEvents = "none";
    composer.style.opacity = "0.7";
    if (composer.isContentEditable) {
      composer.setAttribute("contenteditable", "false");
    } else if ("readOnly" in composer) {
      composer.readOnly = true;
    }

    if (sendButton) {
      sendButton.dataset.gemmaPrevDisabled = sendButton.disabled ? "true" : "false";
      sendButton.disabled = true;
      sendButton.setAttribute("aria-disabled", "true");
    }
    return;
  }

  const previous = busyState.get(composer);
  if (previous) {
    composer.style.pointerEvents = previous.pointerEvents ?? "";
    composer.style.opacity = previous.opacity ?? "";
    if (previous.contentEditable === null) {
      composer.removeAttribute("contenteditable");
    } else if (previous.contentEditable !== undefined) {
      composer.setAttribute("contenteditable", previous.contentEditable);
    }
    if ("readOnly" in composer) {
      composer.readOnly = Boolean(previous.readOnly);
    }
    busyState.delete(composer);
  } else {
    composer.style.pointerEvents = "";
    composer.style.opacity = "";
  }

  if (sendButton) {
    const wasDisabled = sendButton.dataset.gemmaPrevDisabled === "true";
    sendButton.disabled = wasDisabled;
    sendButton.removeAttribute("aria-disabled");
    delete sendButton.dataset.gemmaPrevDisabled;
  }
}

function isEnterSubmit(event) {
  return event.key === "Enter" && !event.shiftKey && !event.isComposing;
}

function shouldBypass() {
  return Date.now() < state.bypassUntil;
}

function setBypass(durationMs = 1000) {
  state.bypassUntil = Date.now() + durationMs;
}

function looksLikeValidRedaction(originalText, redactedText) {
  if (!redactedText) {
    return false;
  }
  const originalLength = originalText.length;
  const redactedLength = redactedText.length;

  if (originalLength <= 20) {
    return true;
  }

  const hasPlaceholder = PLACEHOLDER_TOKENS.some((token) => redactedText.includes(token));
  if (redactedLength < 12) {
    return false;
  }

  if (redactedLength < originalLength * 0.35 && !hasPlaceholder) {
    return false;
  }

  return true;
}

async function redactAndSend({ composer, sendButton, form }) {
  if (!composer) {
    return;
  }
  if (state.running) {
    return;
  }
  const originalText = getComposerText(composer).trim();
  if (!originalText) {
    return;
  }

  state.running = true;
  setBusy(composer, sendButton, true);
  showToast("Redacting...", false);

  try {
    console.info("[Gemma Redaction] Sending prompt for redaction.");
    const response = await sendMessage({
      target: "service_worker",
      type: "LLM_PROMPT",
      prompt: originalText
    });

    if (response?.error) {
      console.warn("[Gemma Redaction] Service worker error:", response.error);
      throw new Error(response.error);
    }

    const redacted = (response?.result ?? "").trim();
    if (!looksLikeValidRedaction(originalText, redacted)) {
      console.warn("[Gemma Redaction] Suspicious output:", redacted);
      throw new Error("Redaction output looks incomplete.");
    }
    if (redacted) {
      setComposerText(composer, redacted);
    } else {
      setComposerText(composer, originalText);
    }

    setBypass();
    if (sendButton) {
      sendButton.click();
    } else if (form?.requestSubmit) {
      form.requestSubmit();
    } else if (form) {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    } else {
      composer.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
      );
    }
  } catch (err) {
    setComposerText(composer, originalText);
    const message = formatError(err);
    console.error("[Gemma Redaction] Redaction failed:", err);
    showToast(`Redaction failed: ${message}`, true);
  } finally {
    setBusy(composer, sendButton, false);
    state.running = false;
  }
}

function bindComposer(composer) {
  if (!composer) {
    return;
  }

  if (composer.dataset.gemmaBound !== "true") {
    composer.dataset.gemmaBound = "true";
    composer.addEventListener(
      "keydown",
      (event) => {
        if (shouldBypass()) {
          return;
        }
        if (!isEnterSubmit(event)) {
          return;
        }
        if (state.running) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        if (!getComposerText(composer).trim()) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        const { form, sendButton } = getComposerContext(composer);
        redactAndSend({ composer, sendButton, form });
      },
      true
    );
  }

  const { form, sendButton } = getComposerContext(composer);

  if (form && form.dataset.gemmaBound !== "true") {
    form.dataset.gemmaBound = "true";
    form.addEventListener(
      "submit",
      (event) => {
        if (shouldBypass()) {
          return;
        }
        if (state.running) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        if (!getComposerText(composer).trim()) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        const { sendButton: latestSendButton } = getComposerContext(composer);
        redactAndSend({ composer, sendButton: latestSendButton, form });
      },
      true
    );
  }

  if (sendButton && sendButton.dataset.gemmaBound !== "true") {
    sendButton.dataset.gemmaBound = "true";
    sendButton.addEventListener(
      "click",
      (event) => {
        if (shouldBypass()) {
          return;
        }
        if (state.running) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        if (!getComposerText(composer).trim()) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        const { form: latestForm } = getComposerContext(composer);
        redactAndSend({ composer, sendButton, form: latestForm });
      },
      true
    );
  }
}

function observeComposer() {
  const observer = new MutationObserver(() => {
    const composer = findComposer();
    if (composer) {
      bindComposer(composer);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  const composer = findComposer();
  if (composer) {
    bindComposer(composer);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", observeComposer, { once: true });
} else {
  observeComposer();
}
