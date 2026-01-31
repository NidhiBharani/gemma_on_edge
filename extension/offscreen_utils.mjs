export const REDACTION_PROMPT = `You are a PII redaction system. Replace any PII in the input with the placeholders below and return ONLY the redacted text. Keep all non-PII text exactly as-is. Do not add or remove any other words. Do not add headings, labels, explanations, quotes, or tags.

Placeholders:
- Names -> [NAME]
- Phones -> [PHONE]
- Emails -> [EMAIL]
- Addresses -> [ADDRESS]
- SSN and government ID numbers (SSN, SIN, TIN/EIN, National ID) -> [SSN]
- Dates of birth -> [DATE_OF_BIRTH]
- Insurance IDs -> [INSURANCE_ID]
- Medical record numbers (MRN) -> [MRN]
- IP addresses -> [IP_ADDRESS]
- Order/transaction IDs -> [ORDER_ID]
- PAN (India) -> [PAN]
- PayPal details -> [PAYPAL]
- Driver's license numbers -> [DRIVER_LICENSE]
- API keys -> [API_KEY]
- Bank details -> [BANK_ACCOUNT]
- Credit cards -> [CREDIT_CARD]
- Card expiry dates -> [CARD_EXPIRY]
- Card CVV/CVC -> [CARD_CVV]
- Access tokens -> [ACCESS_TOKEN]

Rules:
- Remove all digits of SSNs and government IDs. Replace the full identifier with [SSN] (keep the label if present).
- Redact full names (first + last) entirely with [NAME]; do not leave surnames.
- Redact full street addresses (unit/building, street, locality, city, postal code) with [ADDRESS].
- Redact phone numbers (including country codes) with [PHONE].
- Redact emails with [EMAIL].
- Redact dates of birth (e.g., "DOB: 1992-08-14") with [DATE_OF_BIRTH].

Examples:
Input: Payroll setup for Sam — SSN: 123-45-6789 (dummy).
Output: Payroll setup for [NAME] — SSN: [SSN] (dummy).
Input: Tax ID 12-3456789 or SIN 123-456-789.
Output: Tax ID [SSN] or SIN [SSN].
Input: Hi, I'm Priya Nair. Please update my address to 14B, Lakeview Apartments, 3rd Cross, Indiranagar, Bengaluru 560038. You can reach me at +91 98765 43210 or priya.nair17@example.com. DOB: 1992-08-14.
Output: Hi, I'm [NAME]. Please update my address to [ADDRESS]. You can reach me at [PHONE] or [EMAIL]. [DATE_OF_BIRTH].
`;

export function buildPrompt(text) {
  return `<start_of_turn>user\n${REDACTION_PROMPT}\n\nINPUT:\n${text}\n<end_of_turn>\n<start_of_turn>model\n`;
}

export function normalizeOutput(text) {
  let output = (text ?? "").trim();
  const endIndex = output.indexOf("<end_of_turn>");
  if (endIndex !== -1) {
    output = output.slice(0, endIndex).trim();
  }
  const startIndex = output.indexOf("<start_of_turn>model");
  if (startIndex !== -1) {
    output = output.slice(startIndex + "<start_of_turn>model".length).trim();
  }
  return output;
}
