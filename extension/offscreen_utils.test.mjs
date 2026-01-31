import assert from "node:assert/strict";
import { buildPrompt, normalizeOutput, REDACTION_PROMPT } from "./offscreen_utils.mjs";

function testBuildPrompt() {
  const input = "Contact Jane Doe at jane.doe@example.com.";
  const prompt = buildPrompt(input);

  assert.ok(prompt.includes("<start_of_turn>user"));
  assert.ok(prompt.includes("<start_of_turn>model"));
  assert.ok(prompt.includes("<end_of_turn>"));
  assert.ok(prompt.includes(REDACTION_PROMPT.trim()));
  assert.ok(prompt.includes(`INPUT:\n${input}`));
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

function run() {
  testBuildPrompt();
  testNormalizeOutputStripsEndOfTurn();
  testNormalizeOutputStripsLeadingModelTag();
  testNormalizeOutputHandlesBothTags();
  testNormalizeOutputTrimsWhitespace();
  console.log("offscreen_utils tests: OK");
}

run();
