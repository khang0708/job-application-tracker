import * as fs from 'fs';
import * as path from 'path';
import { LocalStorageService } from './local-storage.service';

describe('LocalStorageService', () => {
  const service = new LocalStorageService();
  const testFilename = `test-${Date.now()}.txt`;
  const uploadDir = path.join(process.cwd(), 'uploads', 'resumes');

  afterEach(() => {
    const filePath = path.join(uploadDir, testFilename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  });

  it('saves a buffer to disk and returns a readable key', async () => {
    const buffer = Buffer.from('hello world');
    const { key, url } = await service.save(buffer, testFilename);

    expect(fs.existsSync(key)).toBe(true);
    expect(url).toBe(key);
    expect(fs.readFileSync(key, 'utf-8')).toBe('hello world');
  });

  it('reads back exactly what was saved', async () => {
    const buffer = Buffer.from('round trip content');
    const { key } = await service.save(buffer, testFilename);

    const readBack = await service.read(key);

    expect(readBack.toString('utf-8')).toBe('round trip content');
  });

  it('deletes a saved file', async () => {
    const { key } = await service.save(Buffer.from('to be deleted'), testFilename);
    expect(fs.existsSync(key)).toBe(true);

    await service.delete(key);

    expect(fs.existsSync(key)).toBe(false);
  });
});
