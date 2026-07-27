import Anthropic from '@anthropic-ai/sdk';

export async function extractPdfTextWithClaude(buffer: Buffer): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return '';

  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: buffer.toString('base64'),
            },
          },
          {
            type: 'text',
            text: 'Extract all text content from this PDF resume. Return only the raw extracted text, preserving structure (name, contact, skills, experience, education sections). No commentary, no formatting instructions.',
          },
        ],
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  return textBlock && textBlock.type === 'text' ? textBlock.text.trim() : '';
}
