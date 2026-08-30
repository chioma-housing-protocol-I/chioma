import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { StorageService } from './storage.service';
import { FileMetadata } from './file-metadata.entity';
import { StorageController } from './storage.controller';
import { ImageProcessingService } from './image-processing.service';
import { VideoProcessingService } from './video-processing.service';
import { MalwareScanService } from './malware-scan.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([FileMetadata]),
    ConfigModule,
    AuditModule,
  ],
  providers: [
    StorageService,
    ImageProcessingService,
    VideoProcessingService,
    MalwareScanService,
  ],
  controllers: [StorageController],
  exports: [
    StorageService,
    ImageProcessingService,
    VideoProcessingService,
    MalwareScanService,
  ],
})
export class StorageModule {}
