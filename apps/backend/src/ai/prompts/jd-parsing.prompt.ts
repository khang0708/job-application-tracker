export interface ParseJdParams {
  jobDescriptionText: string;
}

export function buildJdParsingPrompt(params: ParseJdParams): string {
  return `Extract structured information from this job description.

Job Description:
"""
${params.jobDescriptionText}
"""

Return ONLY a valid JSON object, no markdown, no preamble, matching this exact shape:
{
  "requiredSkills": ["string — technical skills, tools, languages explicitly required"],
  "niceToHaveSkills": ["string — skills listed as nice-to-have / preferred / bonus"],
  "seniorityLevel": "string — e.g. Junior, Mid-level, Senior, Lead, Principal (null if not stated)",
  "keyRequirements": ["string — 3-6 most important qualifications or must-have criteria"],
  "responsibilities": ["string — 3-8 main job duties or what the candidate will do"],
  "benefits": ["string — perks, benefits, and compensation extras mentioned"],
  "salary": "string — salary range or compensation if mentioned, otherwise null",
  "workMode": "string — one of: remote, hybrid, onsite, flexible (null if not stated)",
  "location": "string — city, country, or 'Remote' (null if not stated)",
  "yearsOfExperience": "string — required experience e.g. '3+ years', '5-7 years' (null if not stated)"
}

Rules:
- Use null (not empty string) for fields with no information in the JD.
- Use empty array [] for skill/list fields with no information.
- Extract only what is explicitly stated; do not infer or guess.
- Do not include any text outside the JSON object.`;
}
