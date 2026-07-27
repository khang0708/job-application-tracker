import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { StorageService } from './storage.service';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'resumes');

@Injectable()
export class LocalStorageService extends StorageService {
  async save(buffer: Buffer, filename: string): Promise<{ url: string; key: string }> {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    const key = path.join(UPLOAD_DIR, filename);
    fs.writeFileSync(key, buffer);
    return { url: key, key };
  }

  async read(key: string): Promise<Buffer> {
    return fs.readFileSync(key);
  }

  async delete(key: string): Promise<void> {
    if (fs.existsSync(key)) fs.unlinkSync(key);
  }
}
