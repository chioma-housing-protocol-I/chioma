import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';

export const BATCH_MAX_REQUESTS = 10;

/** One sub-request inside a batch (#2077). */
export class BatchSubRequestDto {
  @ApiProperty({ enum: ['GET', 'POST'], example: 'GET' })
  @IsIn(['GET', 'POST'])
  method: 'GET' | 'POST';

  @ApiProperty({
    description:
      'Path relative to the API root, without the /api/v1 prefix (it is added automatically). Must start with /.',
    example: '/properties',
  })
  @IsString()
  @Matches(/^\//, { message: 'path must start with /' })
  path: string;

  @ApiProperty({ required: false, description: 'Body for POST sub-requests' })
  @IsOptional()
  @IsObject()
  body?: Record<string, unknown>;
}

export class BatchRequestDto {
  @ApiProperty({
    type: [BatchSubRequestDto],
    description: `1 to ${BATCH_MAX_REQUESTS} sub-requests to execute`,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(BATCH_MAX_REQUESTS)
  @ValidateNested({ each: true })
  @Type(() => BatchSubRequestDto)
  requests: BatchSubRequestDto[];
}
