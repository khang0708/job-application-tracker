import { Injectable, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { StorageService } from './storage.service';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'resumes');

function resolveWithinUploadDir(rawPath: string): string {
  const resolved = path.resolve(rawPath);
  const uploadDirResolved = path.resolve(UPLOAD_DIR);
  if (!resolved.startsWith(uploadDirResolved + path.sep) && resolved !== uploadDirResolved) {
    throw new BadRequestException('Invalid file path');
  }
  return resolved;
}

@Injectable()
export class LocalStorageService extends StorageService {
  async save(buffer: Buffer, filename: string): Promise<{ url: string; key: string }> {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    const safeName = path.basename(filename).replace(/[^A-Za-z0-9._-]/g, '_');
    const key = resolveWithinUploadDir(path.join(UPLOAD_DIR, safeName));
    fs.writeFileSync(key, buffer);
    return { url: key, key };
  }

  async read(key: string): Promise<Buffer> {
    const resolved = resolveWithinUploadDir(key);
    return fs.readFileSync(resolved);
  }

  async delete(key: string): Promise<void> {
    const resolved = resolveWithinUploadDir(key);
    if (fs.existsSync(resolved)) fs.unlinkSync(resolved);
  }
}
