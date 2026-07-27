import { BadRequestException } from '@nestjs/common';

jest.mock('@vercel/blob', () => ({
  put: jest.fn(),
  del: jest.fn(),
}));

import { put, del } from '@vercel/blob';
import { BlobStorageService } from './blob-storage.service';

describe('BlobStorageService', () => {
  const service = new BlobStorageService();
  const originalToken = process.env.BLOB_READ_WRITE_TOKEN;
  const originalFetch = global.fetch;

  afterEach(() => {
    process.env.BLOB_READ_WRITE_TOKEN = originalToken;
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  describe('save', () => {
    it('uploads the buffer and returns the blob url as both url and key', async () => {
      process.env.BLOB_READ_WRITE_TOKEN = 'test-token';
      (put as jest.Mock).mockResolvedValueOnce({ url: 'https://blob.example/abc-resume.pdf' });

      const result = await service.save(Buffer.from('pdf-bytes'), 'resume.pdf');

      expect(result).toEqual({ url: 'https://blob.example/abc-resume.pdf', key: 'https://blob.example/abc-resume.pdf' });
      expect(put).toHaveBeenCalledWith('resume.pdf', expect.any(Buffer), { access: 'public' });
    });

    it('throws when BLOB_READ_WRITE_TOKEN is not configured', async () => {
      delete process.env.BLOB_READ_WRITE_TOKEN;

      await expect(service.save(Buffer.from('x'), 'file.txt')).rejects.toThrow(BadRequestException);
      expect(put).not.toHaveBeenCalled();
    });
  });

  describe('read', () => {
    it('fetches the blob url and returns its content as a Buffer', async () => {
      const content = Buffer.from('blob content');
      const ab = new ArrayBuffer(content.length);
      new Uint8Array(ab).set(content);
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => ab,
      }) as unknown as typeof fetch;

      const result = await service.read('https://blob.example/abc-resume.pdf');

      expect(result.toString('utf-8')).toBe('blob content');
    });

    it('throws when the fetch response is not ok', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({ ok: false }) as unknown as typeof fetch;

      await expect(service.read('https://blob.example/missing.pdf')).rejects.toThrow(BadRequestException);
    });
  });

  describe('delete', () => {
    it('calls del with the blob url', async () => {
      process.env.BLOB_READ_WRITE_TOKEN = 'test-token';
      (del as jest.Mock).mockResolvedValueOnce(undefined);

      await service.delete('https://blob.example/abc-resume.pdf');

      expect(del).toHaveBeenCalledWith('https://blob.example/abc-resume.pdf');
    });

    it('throws when BLOB_READ_WRITE_TOKEN is not configured', async () => {
      delete process.env.BLOB_READ_WRITE_TOKEN;

      await expect(service.delete('https://blob.example/abc-resume.pdf')).rejects.toThrow(BadRequestException);
      expect(del).not.toHaveBeenCalled();
    });
  });
});
