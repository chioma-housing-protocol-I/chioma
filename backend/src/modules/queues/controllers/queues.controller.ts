import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../auth/guards/admin.guard';
import { QueueManagementService } from '../services/queue-management.service';
import { QueueMonitoringService } from '../services/queue-monitoring.service';

@ApiTags('Queue Management')
@Controller('api/v1/queues')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class QueuesController {
  private readonly logger = new Logger(QueuesController.name);

  constructor(
    private queueManagementService: QueueManagementService,
    private queueMonitoringService: QueueMonitoringService,
  ) {}

  /**
   * Get all queue statistics
   */
  @Get('stats')
  @ApiOperation({ summary: 'Get all queue statistics' })
  async getQueueStats(): Promise<any> {
    this.logger.debug('Fetching all queue statistics');
    return this.queueManagementService.getAllQueueStats();
  }

  /**
   * Get specific queue statistics
   */
  @Get(':queueName/stats')
  @ApiOperation({ summary: 'Get specific queue statistics' })
  async getQueueStatsByName(
    @Param('queueName') queueName: string,
  ): Promise<any> {
    this.logger.debug(`Fetching statistics for queue: ${queueName}`);
    return this.queueManagementService.getQueueStats(queueName);
  }

  /**
   * Get queue health status
   */
  @Get('health')
  @ApiOperation({ summary: 'Get queue health status' })
  async getQueueHealth(): Promise<any> {
    this.logger.debug('Fetching queue health status');
    return this.queueMonitoringService.getQueueHealth();
  }

  /**
   * Get dashboard statistics
   */
  @Get('dashboard/stats')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  async getDashboardStats(): Promise<any> {
    this.logger.debug('Fetching dashboard statistics');
    return this.queueMonitoringService.getDashboardStats();
  }

  /**
   * Get metrics history for a queue
   */
  @Get(':queueName/metrics')
  @ApiOperation({ summary: 'Get metrics history for a queue' })
  async getMetricsHistory(@Param('queueName') queueName: string): Promise<any> {
    this.logger.debug(`Fetching metrics history for queue: ${queueName}`);
    return this.queueMonitoringService.getMetricsHistory(queueName, 100);
  }

  /**
   * Get failed jobs for a queue
   */
  @Get(':queueName/failed')
  @ApiOperation({ summary: 'Get failed jobs for a queue' })
  async getFailedJobs(@Param('queueName') queueName: string): Promise<any> {
    this.logger.debug(`Fetching failed jobs for queue: ${queueName}`);
    return this.queueManagementService.getFailedJobs(queueName, 0, 50);
  }

  /**
   * Get job details
   */
  @Get(':queueName/jobs/:jobId')
  @ApiOperation({ summary: 'Get job details' })
  async getJobDetails(
    @Param('queueName') queueName: string,
    @Param('jobId') jobId: string,
  ): Promise<any> {
    this.logger.debug(
      `Fetching details for job ${jobId} in queue ${queueName}`,
    );
    return this.queueManagementService.getJobDetails(queueName, jobId);
  }

  /**
   * Pause a queue
   */
  @Post(':queueName/pause')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pause a queue' })
  async pauseQueue(@Param('queueName') queueName: string): Promise<any> {
    this.logger.log(`Pausing queue: ${queueName}`);
    await this.queueManagementService.pauseQueue(queueName);
    return { message: `Queue ${queueName} paused` };
  }

  /**
   * Resume a queue
   */
  @Post(':queueName/resume')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resume a queue' })
  async resumeQueue(@Param('queueName') queueName: string): Promise<any> {
    this.logger.log(`Resuming queue: ${queueName}`);
    await this.queueManagementService.resumeQueue(queueName);
    return { message: `Queue ${queueName} resumed` };
  }

  /**
   * Clear a queue
   */
  @Post(':queueName/clear')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear a queue' })
  async clearQueue(@Param('queueName') queueName: string): Promise<any> {
    this.logger.log(`Clearing queue: ${queueName}`);
    await this.queueManagementService.clearQueue(queueName);
    return { message: `Queue ${queueName} cleared` };
  }

  /**
   * Retry a failed job
   */
  @Post(':queueName/jobs/:jobId/retry')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retry a failed job' })
  async retryJob(
    @Param('queueName') queueName: string,
    @Param('jobId') jobId: string,
  ): Promise<any> {
    this.logger.log(`Retrying job ${jobId} in queue ${queueName}`);
    await this.queueManagementService.retryFailedJob(queueName, jobId);
    return { message: `Job ${jobId} retried` };
  }

  /**
   * Remove a job
   */
  @Post(':queueName/jobs/:jobId/remove')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a job' })
  async removeJob(
    @Param('queueName') queueName: string,
    @Param('jobId') jobId: string,
  ): Promise<any> {
    this.logger.log(`Removing job ${jobId} from queue ${queueName}`);
    await this.queueManagementService.removeJob(queueName, jobId);
    return { message: `Job ${jobId} removed` };
  }
}
