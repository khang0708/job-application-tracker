import { Injectable, BadRequestException } from '@nestjs/common';
import { put, del } from '@vercel/blob';
import { StorageService } from './storage.service';

@Injectable()
export class BlobStorageService extends StorageService {
  async save(buffer: Buffer, filename: string): Promise<{ url: string; key: string }> {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new BadRequestException('BLOB_READ_WRITE_TOKEN is not configured');
    }
    const blob = await put(filename, buffer, { access: 'public' });
    return { url: blob.url, key: blob.url };
  }

  async read(key: string): Promise<Buffer> {
    const res = await fetch(key);
    if (!res.ok) {
      throw new BadRequestException(`Failed to read blob: ${key}`);
    }
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async delete(key: string): Promise<void> {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new BadRequestException('BLOB_READ_WRITE_TOKEN is not configured');
    }
    await del(key);
  }
}
