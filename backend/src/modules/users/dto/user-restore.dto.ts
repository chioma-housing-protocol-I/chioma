import { IsEmail, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UserRestoreDto {
    @ApiProperty({
        example: 'user@example.com',
        description: 'Email of the account to restore',
    })
    @IsEmail()
    email: string;

    @ApiProperty({
        example: 'StrongP@ss123',
        description: 'Password of the account to restore',
    })
    @IsString()
    password: string;
}
