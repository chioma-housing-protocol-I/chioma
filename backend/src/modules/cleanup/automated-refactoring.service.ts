import { Injectable } from '@nestjs/common';

@Injectable()
export class AutomatedRefactoringService {
  suggestRefactors(): string[] {
    return [
      'Replace remaining console.log calls with Nest Logger in command/migration scripts',
      'Split large services with >300 LOC into domain-specific collaborators',
      'Add explicit DTO validation for all write endpoints',
      'Extract repeated query-builder patterns into shared repository helpers',
    ];
  }
}
