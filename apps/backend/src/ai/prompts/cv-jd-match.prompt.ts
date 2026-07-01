export interface MatchCvJdParams {
  resumeText: string;
  jobDescriptionText: string;
}

export interface MatchCvJdResult {
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  strengths: string[];
  gaps: string[];
  summary: string | null;
}

export function buildCvJdMatchPrompt(params: MatchCvJdParams): string {
  return `You are a strict technical recruiter. Evaluate this resume against the job description honestly.

Resume:
"""
${params.resumeText}
"""

Job Description:
"""
${params.jobDescriptionText}
"""

Instructions — follow this exact order:
1. List every REQUIRED skill/qualification from the JD.
2. For each required item, check if the resume explicitly mentions it.
3. Count: matched = clearly present, missing = not found or unclear.
4. Compute score = (matched / total_required) * 100, then adjust ±10 for seniority and experience fit.
5. Be honest — do NOT inflate. Most candidates score 40-70. Only exceptional matches score above 80.

Return ONLY this JSON (no markdown, no explanation outside JSON):
{
  "score": <integer 0-100, computed from step 4>,
  "matchedSkills": ["<required skill/tool from JD that is clearly in the resume>"],
  "missingSkills": ["<required skill/tool from JD NOT found in the resume>"],
  "strengths": ["<2-4 concrete strengths specific to this role>"],
  "gaps": ["<2-4 concrete gaps or risks for this specific role>"],
  "summary": "<2-3 sentences: honest overall fit, key strength, key concern>"
}

Scoring reference (do not default to 85):
95-100 → Candidate exceeds all requirements, rare
80-94  → Strong fit, meets nearly all requirements
60-79  → Good fit, meets most requirements with minor gaps
40-59  → Partial fit, notable gaps in key areas
20-39  → Weak fit, missing several core requirements
0-19   → Poor fit, does not meet the role's needs`;
}
