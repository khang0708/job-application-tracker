import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { StorageService } from './storage.service';
import { LocalStorageService } from './local-storage.service';
import { BlobStorageService } from './blob-storage.service';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: StorageService,
      useFactory: (configService: ConfigService) => {
        const driver = configService.get('STORAGE_DRIVER', 'local');
        return driver === 'blob' ? new BlobStorageService() : new LocalStorageService();
      },
      inject: [ConfigService],
    },
  ],
  exports: [StorageService],
})
export class StorageModule {}
