import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** Upper bound on a single message's content length. */
export const MESSAGE_CONTENT_MAX_LENGTH = 4000;

export class SendMessageDto {
  @ApiProperty({
    description: 'Chat room group id (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  chatGroupId: string;

  @ApiProperty({ description: 'Sender user id' })
  @IsNumber()
  senderId: number;

  @ApiProperty({ description: 'Receiver user id' })
  @IsNumber()
  receiverId: number;

  @ApiProperty({ maxLength: MESSAGE_CONTENT_MAX_LENGTH })
  @IsNotEmpty()
  @IsString()
  @MaxLength(MESSAGE_CONTENT_MAX_LENGTH)
  content: string;
}
