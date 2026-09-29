import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class RespondInquiryDto {
  @ApiProperty({
    description: 'Reply the recipient posts into the in-app conversation',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  message: string;
}
