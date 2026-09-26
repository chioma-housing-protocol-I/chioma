import { PartialType } from '@nestjs/mapped-types';
import { Transform } from 'class-transformer';
import {
  IsString,
  IsEmail,
  IsOptional,
  IsPhoneNumber,
  IsIn,
  MinLength,
  Matches,
  IsBoolean,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ValidationUtils } from '../../../common/utils/validation/validation.utils';
import { SUPPORTED_LANGUAGES } from '../../i18n/i18n.service';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserProfileDto {
  @ApiPropertyOptional({ example: 'John', description: 'First name' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe', description: 'Last name' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({
    example: '+2348012345678',
    description: 'Phone number',
  })
  @IsOptional()
  @Transform(({ value }) => ValidationUtils.normalizePhoneNumber(value))
  @Matches(/^\+?\d+$/, {
    message: 'phoneNumber must contain only digits (optionally prefixed by +)',
  })
  @IsPhoneNumber('NG', {
    message: 'phoneNumber must be a valid phone number (e.g. +2348012345678)',
  })
  phoneNumber?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/avatar.jpg',
    description: 'Avatar URL',
  })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({
    example: 'en',
    description: 'Preferred language',
    enum: SUPPORTED_LANGUAGES,
  })
  @IsOptional()
  @IsString()
  @IsIn(SUPPORTED_LANGUAGES, {
    message: `preferredLanguage must be one of: ${SUPPORTED_LANGUAGES.join(', ')}`,
  })
  preferredLanguage?: string;

  @ApiPropertyOptional({ example: 'UTC', description: 'Timezone' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ example: true, description: 'Email notifications' })
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @ApiPropertyOptional({ example: false, description: 'SMS notifications' })
  @IsOptional()
  @IsBoolean()
  smsNotifications?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Marketing consent' })
  @IsOptional()
  @IsBoolean()
  marketingOptIn?: boolean;
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

export class UpdateUserDto extends PartialType(CreateUserDto) {}
