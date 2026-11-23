import { Injectable, Logger, Optional } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { promisify } from 'util';
import { AlertService } from '../monitoring/alert.service';
import { runBackgroundTask } from './background-task.utils';

const stat = promisify(fs.stat);
const readdir = promisify(fs.readdir);
const unlink = promisify(fs.unlink);

@Injectable()
export class TempFileCleanupService {
  private readonly logger = new Logger(TempFileCleanupService.name);

  // Clean up files older than 24 hours
  private readonly maxAgeMs = 24 * 60 * 60 * 1000;

  constructor(@Optional() private readonly alertService?: AlertService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCron(): Promise<void> {
    await runBackgroundTask(
      this.logger,
      {
        task: 'temp-file-cleanup',
        directories: ['uploads/temp', path.join(os.tmpdir(), 'chioma')],
      },
      async () => {
        this.logger.log('Starting temporary file cleanup...');

        const directoriesToClean = [
          path.join(process.cwd(), 'uploads/temp'),
          path.join(os.tmpdir(), 'chioma'),
        ];

        for (const dir of directoriesToClean) {
          await this.cleanupDirectory(dir);
        }

        this.logger.log('Temporary file cleanup completed.');
      },
      this.alertService,
    );
  }

  async cleanupDirectory(directory: string): Promise<void> {
    try {
      if (!fs.existsSync(directory)) {
        return;
      }

      const files = await readdir(directory);
      const now = Date.now();

      for (const file of files) {
        const filePath = path.join(directory, file);
        try {
          const fileStat = await stat(filePath);

          // Skip directories
          if (fileStat.isDirectory()) {
            continue;
          }

          const fileAge = now - fileStat.mtimeMs;
          if (fileAge > this.maxAgeMs) {
            await unlink(filePath);
            this.logger.debug(`Deleted old temporary file: ${filePath}`);
          }
        } catch (error: any) {
          this.logger.warn(
            `Failed to process file during temp cleanup`,
            JSON.stringify({
              task: 'temp-file-cleanup',
              directory,
              filePath,
              error: { message: error?.message, stack: error?.stack },
            }),
          );
        }
      }
    } catch (error: any) {
      this.logger.error(
        `Failed to clean up directory during temp cleanup`,
        error?.stack ?? error?.message,
        JSON.stringify({
          task: 'temp-file-cleanup',
          directory,
          error: { message: error?.message, stack: error?.stack },
        }),
      );
    }
  }
}
