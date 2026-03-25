import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKey } from './entities/api-key.entity';
import { DeveloperController } from './developer.controller';
import { DeveloperPortalController } from './developer-portal.controller';
import { DeveloperService } from './developer.service';

@Module({
  imports: [TypeOrmModule.forFeature([ApiKey])],
  controllers: [DeveloperController, DeveloperPortalController],
  providers: [DeveloperService],
  exports: [DeveloperService],
})
export class DeveloperModule {}
