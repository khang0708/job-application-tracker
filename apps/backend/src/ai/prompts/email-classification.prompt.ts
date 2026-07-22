export interface ClassifyEmailParams {
  emailFrom: string;
  emailSubject: string;
  emailBody: string;
  applications: { id: string; companyName: string; jobTitle: string; status: string }[];
}

export function buildEmailClassificationPrompt(params: ClassifyEmailParams): string {
  const appList = params.applications.length
    ? params.applications
        .map((a) => `- id: ${a.id} | company: ${a.companyName} | jobTitle: ${a.jobTitle} | currentStatus: ${a.status}`)
        .join('\n')
    : '(no tracked applications)';

  return `You are classifying an email that may relate to one of a user's tracked job applications.

Applications currently tracked by this user:
${appList}

Email received:
From: ${params.emailFrom}
Subject: ${params.emailSubject}
Body:
"""
${params.emailBody}
"""

Return ONLY a valid JSON object, no markdown, no preamble, matching this exact shape:
{
  "applicationId": "string — the id from the list above this email most likely relates to, or null if there is no confident match",
  "suggestedStatus": "string — one of APPLIED, SCREENING, INTERVIEW, OFFER, REJECTED, WITHDRAWN implied by this email, or null if unclear",
  "confidence": number — 0-100, your confidence in both the applicationId match and the suggestedStatus,
  "reasoning": "string — one short sentence explaining the decision"
}

Rules:
- If the email doesn't clearly relate to any application in the list, or the status implied is ambiguous, use null for applicationId and/or suggestedStatus and give a low confidence score.
- Never invent an applicationId that isn't in the list above.
- Do not include any text outside the JSON object.`;
}
