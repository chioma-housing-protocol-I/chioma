import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ScheduledTasksService } from './scheduled-tasks.service';
import { PropertiesModule } from '../properties/properties.module';
import { RentModule } from '../rent/rent.module';
import { QueuesModule } from '../queues/queues.module';
import { CleanupModule } from '../cleanup/cleanup.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PropertiesModule,
    RentModule,
    QueuesModule,
    CleanupModule,
  ],
  providers: [ScheduledTasksService],
})
export class ScheduledTasksModule {}
