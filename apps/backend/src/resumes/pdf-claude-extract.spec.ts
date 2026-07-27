jest.mock('@anthropic-ai/sdk');

import Anthropic from '@anthropic-ai/sdk';
import { extractPdfTextWithClaude } from './pdf-claude-extract';

describe('extractPdfTextWithClaude', () => {
  const originalKey = process.env.ANTHROPIC_API_KEY;

  afterEach(() => {
    process.env.ANTHROPIC_API_KEY = originalKey;
    jest.clearAllMocks();
  });

  it('returns extracted text from a well-formed Claude response', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    const mockCreate = jest.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'John Doe\nSoftware Engineer' }],
    });
    (Anthropic as jest.MockedClass<typeof Anthropic>).mockImplementation(
      () => ({ messages: { create: mockCreate } }) as unknown as Anthropic,
    );

    const result = await extractPdfTextWithClaude(Buffer.from('fake-pdf-bytes'));

    expect(result).toBe('John Doe\nSoftware Engineer');
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'claude-haiku-4-5' }),
    );
  });

  it('returns an empty string when ANTHROPIC_API_KEY is not configured', async () => {
    delete process.env.ANTHROPIC_API_KEY;

    const result = await extractPdfTextWithClaude(Buffer.from('fake-pdf-bytes'));

    expect(result).toBe('');
  });

  it('returns an empty string when the response has no text block', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    const mockCreate = jest.fn().mockResolvedValue({ content: [] });
    (Anthropic as jest.MockedClass<typeof Anthropic>).mockImplementation(
      () => ({ messages: { create: mockCreate } }) as unknown as Anthropic,
    );

    const result = await extractPdfTextWithClaude(Buffer.from('fake-pdf-bytes'));

    expect(result).toBe('');
  });
});
