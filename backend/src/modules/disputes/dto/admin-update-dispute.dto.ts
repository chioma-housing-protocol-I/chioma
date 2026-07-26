import {
    IsOptional,
    IsEnum,
    IsString,
    MaxLength,
} from 'class-validator';
import { DisputeStatus } from '../entities/dispute.entity';
import { UpdateDisputeDto } from './update-dispute.dto';

export class AdminUpdateDisputeDto extends UpdateDisputeDto {
    @IsOptional()
    @IsString()
    @MaxLength(2000)
    resolution?: string;
}
