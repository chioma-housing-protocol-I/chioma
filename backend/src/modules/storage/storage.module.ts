import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageService } from './storage.service';
import { FileMetadata } from './file-metadata.entity';
import { FileMetadataRepository } from './file-metadata.repository';
import { StorageController } from './storage.controller';

@Module({
  imports: [TypeOrmModule.forFeature([FileMetadata, FileMetadataRepository])],
  providers: [StorageService],
  controllers: [StorageController],
  exports: [StorageService],
})
export class StorageModule {}
