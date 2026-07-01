export interface AnalyzeCompanyParams {
  companyName: string;
  jobDescriptionText: string;
  sourceUrl?: string | null;
  webContext?: string;
}

export interface CompanyAnalysisAiResult {
  domain: string | null;
  overview: string;
  industry: string;
  stage: string;
  techStack: string[];
  culture: string[];
  whyJoin: string[];
}

export function buildCompanyAnalysisPrompt(params: AnalyzeCompanyParams): string {
  return `You are analyzing a company to help a job applicant understand it better. Use ALL provided sources.

Company name: ${params.companyName}
${params.sourceUrl ? `Job posting URL: ${params.sourceUrl}` : ''}
${params.webContext ? `\n--- Web information about the company ---\n${params.webContext}\n--- End web information ---` : ''}

Job Description:
${params.jobDescriptionText}

Return ONLY a JSON object with this exact structure (no markdown, no extra text):
{
  "domain": "<primary website domain like 'grab.com' or 'shopee.sg', null if unknown>",
  "overview": "<1-2 sentence description of what the company does>",
  "industry": "<industry category, e.g. 'E-commerce', 'Fintech', 'SaaS', 'Gaming'>",
  "stage": "<one of: Startup, Scale-up, Enterprise>",
  "techStack": ["<tech/tool mentioned in JD>"],
  "culture": ["<culture keyword, e.g. 'remote-friendly', 'fast-paced', 'data-driven'>"],
  "whyJoin": ["<reason to join based on JD, e.g. 'Competitive equity package', 'International team'>"]
}

Rules:
- domain: use only the root domain (no 'www.', no path). Infer from company name if not in URL.
- techStack: only include technologies explicitly mentioned in the JD.
- culture: max 5 keywords.
- whyJoin: max 4 points, concrete benefits/reasons from the JD.
- All arrays can be empty [] if not enough info.`;
}
