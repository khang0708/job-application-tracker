import { BadRequestException } from '@nestjs/common';
// Import the internal implementation directly: pdf-parse's own index.js runs a
// module.parent-gated self-test on load, which misfires under webpack bundling.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require('pdf-parse/lib/pdf-parse.js');
import * as mammoth from 'mammoth';

export async function extractTextFromFile(
  buffer: Buffer,
  mimetype: string,
): Promise<string> {
  if (mimetype === 'application/pdf') {
    const result = await pdfParse(buffer);
    return result.text.trim();
  }

  if (
    mimetype ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimetype === 'application/msword'
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value.trim();
  }

  throw new BadRequestException('Only PDF and DOCX files are supported');
}
