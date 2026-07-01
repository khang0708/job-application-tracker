import { createCanvas } from 'canvas';
import { createWorker } from 'tesseract.js';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfjsLib = require('pdfjs-dist/build/pdf.js');

pdfjsLib.GlobalWorkerOptions.workerSrc = require.resolve(
  'pdfjs-dist/build/pdf.worker.js',
);

export async function extractPdfTextWithOcr(buffer: Buffer): Promise<string> {
  const pdf = await pdfjsLib
    .getDocument({ data: new Uint8Array(buffer) })
    .promise;

  const maxPages = Math.min(pdf.numPages as number, 4);
  const pageImages: Buffer[] = [];

  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = createCanvas(viewport.width as number, viewport.height as number);
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    pageImages.push(canvas.toBuffer('image/png'));
  }

  const worker = await createWorker(['eng', 'vie']);
  const texts: string[] = [];

  for (const img of pageImages) {
    const { data: { text } } = await worker.recognize(img);
    if (text.trim()) texts.push(text.trim());
  }

  await worker.terminate();
  return texts.join('\n\n');
}
