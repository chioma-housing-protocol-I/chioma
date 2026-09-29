import { ForbiddenException } from '@nestjs/common';
import { FraudScoreResult } from '../fraud.types';

/**
 * Thrown when a fraud check results in a 'block' decision.
 * This exception prevents the associated action (payment, listing) from proceeding.
 */
export class FraudBlockedException extends ForbiddenException {
  public readonly fraudResult: FraudScoreResult;
  public readonly subjectType: string;
  public readonly subjectId: string;

  constructor(
    subjectType: string,
    subjectId: string,
    fraudResult: FraudScoreResult,
  ) {
    const message = `Fraud check blocked ${subjectType} ${subjectId}: ${fraudResult.reasons.join(', ')}`;
    super({
      message,
      error: 'FRAUD_BLOCKED',
      statusCode: 403,
    });

    this.name = 'FraudBlockedException';
    this.fraudResult = fraudResult;
    this.subjectType = subjectType;
    this.subjectId = subjectId;
  }
}
