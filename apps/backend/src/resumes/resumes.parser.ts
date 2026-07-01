import { BadRequestException } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');
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
