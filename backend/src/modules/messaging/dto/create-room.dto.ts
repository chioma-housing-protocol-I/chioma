import { IsNotEmpty, IsNumberString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRoomDto {
  @ApiProperty({ description: "Caller's user id", example: '1' })
  @IsNotEmpty()
  @IsNumberString()
  userId: string;

  @ApiProperty({ description: "The other participant's user id", example: '2' })
  @IsNotEmpty()
  @IsNumberString()
  participantId: string;
}
