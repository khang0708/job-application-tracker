export interface TranslateJdParams {
  keyRequirements: string[];
  responsibilities: string[];
  benefits: string[];
}

export function buildJdTranslationPrompt(params: TranslateJdParams): string {
  return `Translate the following job description fields to Vietnamese. Preserve the meaning precisely — do not paraphrase or summarize.

Data:
${JSON.stringify(params, null, 2)}

Return ONLY a valid JSON object with the same three keys, values translated to Vietnamese:
{
  "keyRequirements": ["string"],
  "responsibilities": ["string"],
  "benefits": ["string"]
}

Do not include any text outside the JSON object.`;
}
