export interface ParseJdParams {
  jobDescriptionText: string;
}

export function buildJdParsingPrompt(params: ParseJdParams): string {
  return `Extract structured information from this job description.

Job Description:
"""
${params.jobDescriptionText}
"""

Return ONLY a JSON object, no markdown formatting, no preamble, matching this shape:
{
  "requiredSkills": ["string"],
  "niceToHaveSkills": ["string"],
  "seniorityLevel": "string - e.g. Junior, Mid-level, Senior, Lead",
  "keyRequirements": ["string - 3-6 bullet points of the most important requirements"]
}

Do not include any text outside the JSON object.`;
}
