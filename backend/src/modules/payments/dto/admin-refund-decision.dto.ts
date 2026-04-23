import { IsIn, IsString, MinLength } from 'class-validator';

export class AdminRefundDecisionDto {
  @IsIn(['approve', 'reject'])
  action: 'approve' | 'reject';

  @IsString()
  @MinLength(2)
  notes: string;
}
