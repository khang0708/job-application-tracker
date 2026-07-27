export abstract class StorageService {
  abstract save(buffer: Buffer, filename: string): Promise<{ url: string; key: string }>;
  abstract read(key: string): Promise<Buffer>;
  abstract delete(key: string): Promise<void>;
}
