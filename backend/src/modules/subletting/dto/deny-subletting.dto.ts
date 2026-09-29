import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class DenySublettingDto {
  @ApiProperty({
    example:
      'Subletting is not permitted under the current lease terms as stated in Section 4.2.',
    description: 'Reason for denying the sublet request',
  })
  @IsString()
  reason: string;
}
