import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageService } from './storage.service';
import { FileMetadata } from './file-metadata.entity';
import { StorageController } from './storage.controller';
import { ImageProcessingService } from './image-processing.service';

@Module({
  imports: [TypeOrmModule.forFeature([FileMetadata])],
  providers: [StorageService, ImageProcessingService],
  controllers: [StorageController],
  exports: [StorageService, ImageProcessingService],
})
export class StorageModule {}
