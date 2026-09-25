import { IsNumberString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RoomIdParamsDto {
  @ApiProperty({ description: 'Chat room id', example: '1' })
  @IsNumberString()
  roomId: string;
}
