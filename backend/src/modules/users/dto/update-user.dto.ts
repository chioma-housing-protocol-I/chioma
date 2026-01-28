import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {}
import {
  IsString,
  IsEmail,
  IsOptional,
  MinLength,
  Matches,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'John', description: 'First name' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe', description: 'Last name' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: '+1234567890', description: 'Phone number' })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/avatar.jpg',
    description: 'Avatar URL',
  })
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}

export class ChangeEmailDto {
  @ApiPropertyOptional({
    example: 'newemail@example.com',
    description: 'New email address',
  })
  @IsEmail()
  newEmail: string;

  @ApiPropertyOptional({
    example: 'CurrentP@ss123',
    description: 'Current password for verification',
  })
  @IsString()
  currentPassword: string;
}

export class ChangePasswordDto {
  @ApiPropertyOptional({
    example: 'CurrentP@ss123',
    description: 'Current password',
  })
  @IsString()
  currentPassword: string;

  @ApiPropertyOptional({
    example: 'NewStrongP@ss123',
    description: 'New password',
  })
  @IsString()
  @MinLength(8)
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message:
      'Password must contain uppercase, lowercase, number and special character',
  })
  newPassword: string;
}
