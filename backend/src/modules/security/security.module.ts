import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecurityController } from './security.controller';
import { SecurityEventsService } from './security-events.service';
import { SecurityEvent } from './entities/security-event.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SecurityEvent])],
  controllers: [SecurityController],
  providers: [SecurityEventsService],
  exports: [SecurityEventsService],
})
export class SecurityModule {}
