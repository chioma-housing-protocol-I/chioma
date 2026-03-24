import { Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class DependencyManagementService {
  getDependencySummary(projectRoot: string): {
    runtimeDependencies: number;
    devDependencies: number;
    packageManager?: string;
  } {
    const packageJsonPath = join(projectRoot, 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      packageManager?: string;
    };

    return {
      runtimeDependencies: Object.keys(packageJson.dependencies ?? {}).length,
      devDependencies: Object.keys(packageJson.devDependencies ?? {}).length,
      packageManager: packageJson.packageManager,
    };
  }
}
