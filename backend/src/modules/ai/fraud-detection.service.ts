import { Injectable } from '@nestjs/common';

export interface FraudSignalInput {
  amount: number;
  isNewDevice: boolean;
  ipRisk: number;
  failedAttemptsLastHour: number;
  velocityLast10m: number;
}

@Injectable()
export class FraudDetectionService {
  scoreTransaction(input: FraudSignalInput): {
    score: number;
    decision: 'allow' | 'review' | 'block';
    reasons: string[];
  } {
    let score = 0;
    const reasons: string[] = [];

    if (input.amount > 5000) {
      score += 25;
      reasons.push('high_amount');
    }
    if (input.isNewDevice) {
      score += 20;
      reasons.push('new_device');
    }
    if (input.ipRisk > 70) {
      score += 20;
      reasons.push('high_ip_risk');
    }
    if (input.failedAttemptsLastHour >= 3) {
      score += 20;
      reasons.push('failed_attempt_pattern');
    }
    if (input.velocityLast10m >= 5) {
      score += 15;
      reasons.push('high_velocity');
    }

    const decision = score >= 70 ? 'block' : score >= 40 ? 'review' : 'allow';
    return { score, decision, reasons };
  }
}
