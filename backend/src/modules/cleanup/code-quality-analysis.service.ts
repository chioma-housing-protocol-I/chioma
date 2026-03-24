import { Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class CodeQualityAnalysisService {
  analyzePackageHealth(projectRoot: string): {
    scriptsPresent: string[];
    missingScripts: string[];
    score: number;
  } {
    const packageJsonPath = join(projectRoot, 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
      scripts?: Record<string, string>;
    };

    const requiredScripts = ['lint', 'test', 'build', 'format'];
    const scripts = packageJson.scripts ?? {};

    const scriptsPresent = requiredScripts.filter((script) => scripts[script]);
    const missingScripts = requiredScripts.filter((script) => !scripts[script]);

    const score = Math.round(
      (scriptsPresent.length / requiredScripts.length) * 100,
    );
    return { scriptsPresent, missingScripts, score };
  }
}
