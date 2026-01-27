import { Injectable, Logger } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(DatabaseHealthIndicator.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const startTime = Date.now();

    try {
      // Check if connection is initialized
      if (!this.dataSource.isInitialized) {
        await this.dataSource.initialize();
      }

      // Perform a simple query to verify database connectivity
      await this.dataSource.query('SELECT 1');

      const responseTime = Date.now() - startTime;

      const result = this.getStatus(key, true, {
        status: 'up',
        responseTime,
        connection: 'active',
        database: this.dataSource.options.database,
        type: this.dataSource.options.type,
      });

      this.logger.log(`Database health check passed in ${responseTime}ms`);
      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;

      this.logger.error('Database health check failed', error);

      const result = this.getStatus(key, false, {
        status: 'down',
        responseTime,
        error: (error as Error).message,
        connection: 'failed',
      });

      throw new HealthCheckError('Database check failed', result);
    }
  }

  async checkConnection(): Promise<boolean> {
    try {
      if (!this.dataSource.isInitialized) {
        await this.dataSource.initialize();
      }

      await this.dataSource.query('SELECT 1');
      return true;
    } catch (error) {
      this.logger.error('Database connection check failed', error);
      return false;
    }
  }
}
