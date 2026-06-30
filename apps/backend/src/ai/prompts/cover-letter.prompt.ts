export interface GenerateCoverLetterParams {
  resumeText: string;
  jobDescriptionText: string;
  parsedJd?: { keyRequirements: string[] } | null;
  language?: 'en' | 'vi';
  maxLength?: number;
}

export function buildCoverLetterPrompt(params: GenerateCoverLetterParams): string {
  return `Write a cover letter for this job application, in the voice of the candidate described below.

Candidate background (from resume):
"""
${params.resumeText}
"""

Job description:
"""
${params.jobDescriptionText}
"""

${params.parsedJd ? `Key requirements identified: ${params.parsedJd.keyRequirements.join('; ')}` : ''}

Writing style requirements (strict):
- Concise and confident tone — no generic flattery or filler phrases like "I am excited to apply"
- ${params.maxLength ? `Keep it under ${params.maxLength} characters total (platform has a character limit)` : 'Keep it to 3-4 short paragraphs, suitable for an email body'}
- Be honest about any skill gaps relative to the job requirements rather than overstating fit — briefly acknowledge a gap if one is significant, paired with a related strength
- Highlight the strongest, most relevant 2-3 points of overlap between the candidate's background and the job requirements — don't try to mention everything
- Write in ${params.language === 'vi' ? 'Vietnamese' : 'English'}
- No markdown formatting — plain text only, ready to paste directly into an email or application form

Return ONLY the cover letter text, nothing else.`;
}
