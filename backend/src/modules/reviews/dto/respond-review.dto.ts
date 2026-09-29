import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RespondReviewDto {
  @ApiProperty({
    description: 'Public response from the reviewed host/landlord',
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  response: string;
}
