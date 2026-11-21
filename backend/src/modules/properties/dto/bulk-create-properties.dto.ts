import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CreatePropertyDto } from './create-property.dto';

/** Upper bound keeps a single bulk request from monopolising the API. */
export const BULK_IMPORT_MAX_ITEMS = 500;

export class BulkCreatePropertiesDto {
  @ApiProperty({ type: [CreatePropertyDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(BULK_IMPORT_MAX_ITEMS)
  @ValidateNested({ each: true })
  @Type(() => CreatePropertyDto)
  properties: CreatePropertyDto[];
}
