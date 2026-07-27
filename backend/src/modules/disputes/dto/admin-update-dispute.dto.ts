import { IsOptional, IsString, MaxLength } from 'class-validator';
import { UpdateDisputeDto } from './update-dispute.dto';

export class AdminUpdateDisputeDto extends UpdateDisputeDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  resolution?: string;
}
