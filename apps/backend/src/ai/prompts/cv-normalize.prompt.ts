export function buildCvNormalizePrompt(rawText: string): string {
  return `You are converting raw CV/resume text (possibly from OCR with noise) into clean, structured Markdown.

Raw text:
"""
${rawText}
"""

Rules:
- Fix obvious OCR typos using context (e.g. "ars" → "years", "Jsers" → "Users", "fattorm" → "platform")
- Preserve ALL factual content — do NOT add, invent, or remove real information
- Structure with these Markdown sections (skip any section with no data):
  # Full Name
  Title line (e.g. Senior Fullstack Developer · Team Lead)
  Contact info on one line (email | phone | location)

  ## Summary

  ## Experience
  ### Job Title — Company (Start – End)
  - bullet points

  ## Skills
  **Category**: skill1, skill2

  ## Education
  **University** — Degree (Year–Year)

  ## Other (certifications, projects, etc. if present)

- Use short bullet points, not long paragraphs
- Return ONLY the Markdown, no preamble, no explanation`;
}
