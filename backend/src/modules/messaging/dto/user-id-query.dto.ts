import { IsNotEmpty, IsNumberString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** Shared by any messaging endpoint that scopes a query to a single user id. */
export class UserIdQueryDto {
  @ApiProperty({ description: 'User id', example: '1' })
  @IsNotEmpty()
  @IsNumberString()
  userId: string;
}
