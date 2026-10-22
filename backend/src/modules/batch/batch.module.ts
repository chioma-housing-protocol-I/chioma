import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { BatchController } from './batch.controller';
import { BatchService } from './batch.service';

@Module({
  imports: [HttpModule],
  controllers: [BatchController],
  providers: [BatchService],
})
export class BatchModule {}
