import assert from "node:assert/strict";
import { buildPrompt, normalizeOutput, REDACTION_PROMPT } from "./offscreen_utils.mjs";

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

function testBuildPrompt() {
  const input = "Contact Jane Doe at jane.doe@example.com.";
  const prompt = buildPrompt(input);

  assert.ok(prompt.includes("<start_of_turn>user"));
  assert.ok(prompt.includes("<start_of_turn>model"));
  assert.ok(prompt.includes("<end_of_turn>"));
  assert.ok(prompt.includes(REDACTION_PROMPT.trim()));
  assert.ok(prompt.includes(`INPUT:\n${input}`));
}

function testPromptListsAllPlaceholders() {
  for (const token of PLACEHOLDER_TOKENS) {
    assert.ok(
      REDACTION_PROMPT.includes(token),
      `Missing placeholder token: ${token}`
    );
  }
}

function testPromptIncludesCriticalRules() {
  assert.ok(REDACTION_PROMPT.includes("Replace any PII"));
  assert.ok(REDACTION_PROMPT.includes("return ONLY the redacted text"));
  assert.ok(REDACTION_PROMPT.includes("Do not add headings"));
  assert.ok(REDACTION_PROMPT.includes("Remove all digits of SSNs"));
  assert.ok(REDACTION_PROMPT.includes("Redact full names"));
  assert.ok(REDACTION_PROMPT.includes("Redact full street addresses"));
  assert.ok(REDACTION_PROMPT.includes("Redact phone numbers"));
  assert.ok(REDACTION_PROMPT.includes("Redact emails"));
  assert.ok(REDACTION_PROMPT.includes("Redact dates of birth"));
}

function testPromptIncludesCompositeExample() {
  assert.ok(REDACTION_PROMPT.includes("Hi, I'm Priya Nair."));
  assert.ok(REDACTION_PROMPT.includes("Lakeview Apartments"));
  assert.ok(REDACTION_PROMPT.includes("DOB: 1992-08-14"));
  assert.ok(REDACTION_PROMPT.includes("Output: Hi, I'm [NAME]."));
}

function testNormalizeOutputStripsEndOfTurn() {
  const raw = "Contact [NAME].<end_of_turn> extra";
  const normalized = normalizeOutput(raw);
  assert.equal(normalized, "Contact [NAME].");
}

function testNormalizeOutputStripsLeadingModelTag() {
  const raw = "<start_of_turn>model\nContact [NAME].";
  const normalized = normalizeOutput(raw);
  assert.equal(normalized, "Contact [NAME].");
}

function testNormalizeOutputHandlesBothTags() {
  const raw = "<start_of_turn>model\nContact [NAME].<end_of_turn>\n<start_of_turn>user\n";
  const normalized = normalizeOutput(raw);
  assert.equal(normalized, "Contact [NAME].");
}

function testNormalizeOutputTrimsWhitespace() {
  const raw = "  Contact [NAME].  ";
  const normalized = normalizeOutput(raw);
  assert.equal(normalized, "Contact [NAME].");
}

function testNormalizeOutputNoTags() {
  const raw = "Contact [NAME].";
  const normalized = normalizeOutput(raw);
  assert.equal(normalized, "Contact [NAME].");
}

function run() {
  testBuildPrompt();
  testPromptListsAllPlaceholders();
  testPromptIncludesCriticalRules();
  testPromptIncludesCompositeExample();
  testNormalizeOutputStripsEndOfTurn();
  testNormalizeOutputStripsLeadingModelTag();
  testNormalizeOutputHandlesBothTags();
  testNormalizeOutputTrimsWhitespace();
  testNormalizeOutputNoTags();
  console.log("offscreen_utils tests: OK");
}

run();
